import {
    useState, useRef, useEffect, useCallback,
    type FC, type KeyboardEvent, type ChangeEvent,
} from "react";
import type { VisualFormattingSettingsModel } from "./settings";
import { DEFAULT_SYSTEM_PROMPT }              from "./settings";
import { ASKDATA_API, SESSION_VERIFY_INTERVAL, STORAGE_KEY } from "./chat/types";
import type { Session, UIMessage, Conversation, SavedConfig } from "./chat/types";
import { detectProvider, resolveSystemPrompt, estimateTokens, cleanAnswer } from "./chat/utils";
import { resolveTheme, injectStyles } from "./chat/styles";
import {
    verifyEndpoint, sendMessage, fetchOpenAIModels,
    apiListConversations, apiGetConversation,
    apiDeleteConversation, apiRenameConversation, apiVerifySession,
    RATE_LIMIT_SENTINEL,
} from "./chat/api";
import { ConfigGateScreen, ExpiredScreen } from "./chat/screens";
import { HistorySidebar }                   from "./chat/HistorySidebar";
import { Header, ChatArea, ChatInputBar }   from "./chat/sections";

// ─── Rate-limit constants (must match backend: 10 req / 2 min block) ──────────
const RATE_LIMIT_BLOCK_SECONDS = 120; // 2 minutes

// ─── Module-level session lock (survives React re-renders) ────────────────────
let _lockedSession: Session | null = null;

// ─── Config persistence ───────────────────────────────────────────────────────
function loadSavedConfig(): SavedConfig | null {
    try   { const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) as SavedConfig : null; }
    catch { return null; }
}
function saveConfig(cfg: SavedConfig): void {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg)); }
    catch { /* localStorage unavailable (Power BI sandboxed iframe) */ }
}

// ─── Error classification ─────────────────────────────────────────────────────
function classifyError(err: unknown): string {
    const msg = err instanceof Error ? err.message : String(err ?? "");

    if (!msg || msg === "__EXPIRED__" || msg === RATE_LIMIT_SENTINEL) return "";

    if (msg.includes("timed out") || msg.includes("AbortError")) {
        return "The request took too long. The server may be under load — please try again.";
    }
    if (
        msg.toLowerCase().includes("network") ||
        msg.toLowerCase().includes("failed to fetch") ||
        msg.toLowerCase().includes("networkerror")
    ) {
        return "A network error occurred. Please check your connection and try again.";
    }
    if (msg.includes("429") || msg.toLowerCase().includes("rate limit") || msg.toLowerCase().includes("quota")) {
        return "You've hit the API rate limit. Please wait a moment and try again.";
    }
    if (msg.includes("503") || msg.toLowerCase().includes("service unavailable")) {
        return "The AI service is temporarily overloaded. Please try again in a few seconds.";
    }
    if (msg.toLowerCase().includes("content") && msg.toLowerCase().includes("filter")) {
        return "The response was blocked by a content filter. Try rephrasing your question.";
    }
    if (msg.includes("401") || msg.toLowerCase().includes("unauthorized") || msg.toLowerCase().includes("invalid api key")) {
        return "Authentication failed — your API key may be invalid or expired. Update it in the Format Pane.";
    }
    if (msg.length > 0 && msg.length < 180) return msg;
    return "An unexpected error occurred. Please try again — if the problem persists, check your API configuration.";
}

// ─── Conversational shortcut matchers ────────────────────────────────────────

/** Returns an instant reply string if the query matches a known shortcut, or null otherwise. */
function matchShortcut(query: string, clientName: string): string | null {
    const q = query.trim().toLowerCase().replace(/[?!.,]+$/, "");

    // Identity questions
    const identityPatterns = [
        /^who are you$/,
        /^what(?:'s| is) your name$/,
        /^what are you$/,
        /^tell me about yourself$/,
        /^introduce yourself$/,
        /^who(?:'s| is) this$/,
        /^who am i (?:talking|speaking|chatting) (?:to|with)$/,
        /^what(?:'s| is) ask data$/,
    ];
    if (identityPatterns.some(p => p.test(q))) {
        return "I'm Adaptive RAG named as Ask Data built and trained by Anurit Innovation.";
    }

    // Greeting patterns — use the client name for a personalised welcome
    const greetPatterns = [
        /^h(?:i|ey|ello)$/,
        /^good (?:morning|afternoon|evening|day)$/,
        /^greetings$/,
        /^howdy$/,
        /^sup$/,
        /^what(?:'s| is) up$/,
        /^hey there$/,
        /^hi there$/,
    ];
    const firstName = clientName.split(" ")[0] || clientName;
    if (greetPatterns.some(p => p.test(q))) {
        return `Hi, ${firstName}! Welcome to Ask Data. Ask your queries — I'm fully ready to answer with clarity.`;
    }

    return null;
}

// ─── Rate-limit popup component ───────────────────────────────────────────────
const RateLimitModal: FC<{ secondsLeft: number; onDismiss: () => void }> = ({ secondsLeft, onDismiss }) => {
    const mins = Math.floor(secondsLeft / 60);
    const secs = secondsLeft % 60;
    const formatted = `${mins}:${String(secs).padStart(2, "0")}`;
    const progress  = secondsLeft / RATE_LIMIT_BLOCK_SECONDS;

    return (
        <div style={{
            position:       "fixed",
            inset:          0,
            zIndex:         9999,
            display:        "flex",
            alignItems:     "center",
            justifyContent: "center",
            background:     "rgba(10,20,40,0.55)",
            backdropFilter: "blur(3px)",
            animation:      "ac-cardIn .25s cubic-bezier(.16,1,.3,1) both",
        }}>
            <div style={{
                width:        370,
                maxWidth:     "92vw",
                background:   "var(--ac-surface)",
                borderRadius: 10,
                boxShadow:    "0 24px 80px rgba(0,0,0,.28)",
                border:       "1px solid var(--ac-border)",
                overflow:     "hidden",
                animation:    "ac-cardIn .3s cubic-bezier(.16,1,.3,1) both",
            }}>
                {/* Amber accent top bar */}
                <div style={{ height: 4, background: "linear-gradient(90deg, #b8955a, #e6b97a)", borderRadius: "10px 10px 0 0" }} />

                <div style={{ padding: "26px 28px 24px" }}>
                    {/* Icon + heading */}
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                        <div style={{
                            width:          42,
                            height:         42,
                            borderRadius:   "50%",
                            background:     "rgba(184,149,90,.12)",
                            border:         "1.5px solid rgba(184,149,90,.35)",
                            display:        "flex",
                            alignItems:     "center",
                            justifyContent: "center",
                            fontSize:       "1.35em",
                            flexShrink:     0,
                        }}>⏳</div>
                        <div>
                            <div style={{ fontFamily: "var(--ac-serif)", fontSize: "1.08em", fontWeight: 700, color: "var(--ac-navy)" }}>
                                Request Limit Reached
                            </div>
                            <div style={{ fontSize: ".78em", color: "var(--ac-text3)", marginTop: 2 }}>
                                Ask Data · Rate limit active
                            </div>
                        </div>
                    </div>

                    {/* Message */}
                    <p style={{ fontSize: ".88em", color: "var(--ac-text2)", lineHeight: 1.65, margin: "0 0 20px" }}>
                        You've exceeded the maximum number of requests allowed in this window.
                        Chat will automatically resume when the timer expires — no action needed.
                    </p>

                    {/* Countdown ring + label */}
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, marginBottom: 20 }}>
                        <div style={{ position: "relative", width: 80, height: 80 }}>
                            <svg width="80" height="80" style={{ transform: "rotate(-90deg)" }}>
                                <circle cx="40" cy="40" r="34" fill="none" stroke="var(--ac-border2)" strokeWidth="5" />
                                <circle
                                    cx="40" cy="40" r="34"
                                    fill="none"
                                    stroke="#b8955a"
                                    strokeWidth="5"
                                    strokeLinecap="round"
                                    strokeDasharray={`${2 * Math.PI * 34}`}
                                    strokeDashoffset={`${2 * Math.PI * 34 * (1 - progress)}`}
                                    style={{ transition: "stroke-dashoffset 1s linear" }}
                                />
                            </svg>
                            <div style={{
                                position:       "absolute",
                                inset:          0,
                                display:        "flex",
                                alignItems:     "center",
                                justifyContent: "center",
                                fontFamily:     "var(--ac-mono)",
                                fontSize:       "1.05em",
                                fontWeight:     700,
                                color:          "var(--ac-navy)",
                            }}>
                                {formatted}
                            </div>
                        </div>
                        <div style={{ fontSize: ".78em", color: "var(--ac-text3)" }}>resuming in</div>
                    </div>

                    {/* Dismiss */}
                    <button
                        onClick={onDismiss}
                        style={{
                            width:        "100%",
                            padding:      "10px",
                            background:   "var(--ac-surface2)",
                            border:       "1px solid var(--ac-border)",
                            borderRadius: 6,
                            cursor:       "pointer",
                            fontSize:     ".85em",
                            fontWeight:   600,
                            color:        "var(--ac-text2)",
                            letterSpacing: ".02em",
                            transition:   "background .15s, color .15s",
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = "var(--ac-gold-light)"; e.currentTarget.style.color = "var(--ac-gold)"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = "var(--ac-surface2)"; e.currentTarget.style.color = "var(--ac-text2)"; }}
                    >
                        Dismiss — I'll wait
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─── Props ────────────────────────────────────────────────────────────────────
export interface ChatAppProps {
    settings: VisualFormattingSettingsModel | null;
    username: string | null;
    viewport: { width: number; height: number };
}

// ─── Component ────────────────────────────────────────────────────────────────
const ChatApp: FC<ChatAppProps> = ({ settings, username, viewport }) => {
    // ── Theme / styles ────────────────────────────────────────────────────────
    const theme = resolveTheme(settings);
    useEffect(() => { injectStyles(theme); });

    // ── Effective config (Format Pane wins; localStorage is fallback) ─────────
    const settingsEndpoint = settings?.aiConfig?.endpointUrl?.trim() ?? "";
    const settingsApiKey   = settings?.aiConfig?.apiKey?.trim()      ?? "";
    const settingsModel    = settings?.aiConfig?.modelName?.trim()   ?? "";
    const settingsPrompt   = settings?.aiConfig?.systemPrompt        ?? "";
    const saved            = loadSavedConfig();

    const effectiveEndpoint = settingsEndpoint || saved?.endpointUrl || "";
    const effectiveApiKey   = settingsApiKey   || saved?.apiKey      || "";
    const effectiveModel    = settingsModel    || saved?.modelName   || "";
    const effectivePrompt   = settingsPrompt   || saved?.systemPrompt || "";

    // ── Core state ────────────────────────────────────────────────────────────
    const [session,      setSession]      = useState<Session | null>(() => _lockedSession);
    const [loginLoading, setLoginLoading] = useState(false);
    const [loginError,   setLoginError]   = useState("");
    const [keyExpired,   setKeyExpired]   = useState(false);

    const [messages,    setMessages]    = useState<UIMessage[]>([]);
    const [input,       setInput]       = useState("");
    const [busy,        setBusy]        = useState(false);
    const [activeConvId, setActiveConvId] = useState<string | null>(null);

    const [historyOpen,    setHistoryOpen]    = useState(false);
    const [conversations,  setConversations]  = useState<Conversation[]>([]);
    const [renaming,       setRenaming]       = useState<{ id: string; value: string } | null>(null);

    // ── Rate-limit state ──────────────────────────────────────────────────────
    const [rateLimited,      setRateLimited]      = useState(false);
    const [modalVisible,     setModalVisible]      = useState(false);
    const [countdownSeconds, setCountdownSeconds] = useState(0);
    const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

    /** Start (or restart) the 2-minute rate-limit countdown. */
    const startRateLimit = useCallback(() => {
        // Clear any existing timer to prevent duplication / memory leaks
        if (countdownRef.current !== null) clearInterval(countdownRef.current);

        setRateLimited(true);
        setModalVisible(true);
        setCountdownSeconds(RATE_LIMIT_BLOCK_SECONDS);

        countdownRef.current = setInterval(() => {
            setCountdownSeconds(prev => {
                if (prev <= 1) {
                    // Timer expired — lift rate-limit and clean up
                    if (countdownRef.current !== null) clearInterval(countdownRef.current);
                    countdownRef.current = null;
                    setRateLimited(false);
                    setModalVisible(false);
                    return 0;
                }
                return prev - 1;
            });
        }, 1_000);
    }, []);

    // Clean up interval on unmount
    useEffect(() => {
        return () => {
            if (countdownRef.current !== null) clearInterval(countdownRef.current);
        };
    }, []);

    // ── Request guard — prevents duplicate concurrent sends ───────────────────
    const sendingRef = useRef(false);

    const chatHistoryRef = useRef<Array<{ role: "user" | "assistant"; content: string }>>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef    = useRef<HTMLTextAreaElement>(null);

    const displayName = username ?? session?.name ?? "User";
    const firstName   = displayName.split(" ")[0] || displayName;
    const initials    = firstName[0]?.toUpperCase() ?? "U";
    const configKey   = `${effectiveEndpoint}__${effectiveApiKey}`;

    // ── Config change detection ───────────────────────────────────────────────
    useEffect(() => {
        if (_lockedSession) {
            const prev = `${_lockedSession.endpointUrl}__${_lockedSession.apiKey}`;
            if (prev !== configKey) {
                _lockedSession  = null;
                sendingRef.current = false;
                setSession(null);
                setKeyExpired(false);
                setLoginError("");
                setMessages([]);
                setActiveConvId(null);
                chatHistoryRef.current = [];
                setHistoryOpen(false);
                setBusy(false);
                // Clear any active rate-limit on config change
                if (countdownRef.current !== null) clearInterval(countdownRef.current);
                countdownRef.current = null;
                setRateLimited(false);
                setModalVisible(false);
                setCountdownSeconds(0);
            }
        }
    }, [configKey]);

    // ── Auto-login ────────────────────────────────────────────────────────────
    useEffect(() => {
        if (_lockedSession || keyExpired) return;
        if (effectiveEndpoint && effectiveApiKey) void attemptLogin();
    }, [configKey]);

    // ── Periodic session keep-alive (Anurit only) ─────────────────────────────
    useEffect(() => {
        if (!session || detectProvider(session.endpointUrl).type !== "anurit") return;
        const id = setInterval(async () => {
            const alive = await apiVerifySession(session.apiKey);
            if (!alive) { _lockedSession = null; setSession(null); setKeyExpired(true); clearInterval(id); }
        }, SESSION_VERIFY_INTERVAL);
        return () => clearInterval(id);
    }, [session]);

    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

    useEffect(() => {
        if (!session || detectProvider(session.endpointUrl).type !== "anurit") return;
        void loadConversations();
    }, [session]);

    // ── Conversation CRUD ─────────────────────────────────────────────────────
    async function loadConversations() {
        if (!session) return;
        const d = await apiListConversations(session.apiKey);
        if (d) setConversations(d.conversations ?? []);
    }

    async function openConversation(id: string) {
        if (!session) return;
        const d = await apiGetConversation(session.apiKey, id);
        if (!d) return;
        setActiveConvId(id);
        setMessages((d.messages ?? []).map((m, i) => ({
            id:         `hist-${i}`,
            role:       m.role,
            content:    m.content,
            sources:    m.sources ?? [],
            timestamp:  m.timestamp ? new Date(m.timestamp) : new Date(),
            tokenCount: estimateTokens(m.content),
        })));
        setHistoryOpen(false);
    }

    function startNewChat() {
        setActiveConvId(null);
        setMessages([]);
        chatHistoryRef.current = [];
        setHistoryOpen(false);
        setTimeout(() => textareaRef.current?.focus(), 50);
    }

    async function deleteConversation(id: string) {
        if (!session || !confirm("Delete this conversation?")) return;
        const ok = await apiDeleteConversation(session.apiKey, id);
        if (ok) {
            setConversations(prev => prev.filter(c => c._id !== id));
            if (activeConvId === id) startNewChat();
        } else {
            alert("Failed to delete conversation — please try again.");
        }
    }

    async function commitRename(id: string, newTitle: string) {
        setRenaming(null);
        if (!session || !newTitle.trim()) return;
        const ok = await apiRenameConversation(session.apiKey, id, newTitle.trim());
        if (ok) setConversations(prev => prev.map(c => c._id === id ? { ...c, title: newTitle.trim() } : c));
    }

    // ── Login / verify ────────────────────────────────────────────────────────
    async function attemptLogin() {
        const endpoint = effectiveEndpoint;
        const key      = effectiveApiKey;
        if (!endpoint || !key || loginLoading) return;
        setLoginLoading(true);
        setLoginError("");
        try {
            const prov    = detectProvider(endpoint);
            const model   = effectiveModel || prov.defaultModel;
            const info    = await verifyEndpoint(endpoint, key, model);
            const prompt  = resolveSystemPrompt(prov.type, effectivePrompt, DEFAULT_SYSTEM_PROMPT);
            const newSession: Session = {
                endpointUrl:  endpoint,
                apiKey:       key,
                modelName:    model,
                systemPrompt: prompt,
                providerType: prov.type,
                clientId:     info.clientId,
                name:         info.name,
            };
            _lockedSession = newSession;
            saveConfig({ endpointUrl: endpoint, apiKey: key, modelName: model, systemPrompt: effectivePrompt });
            setSession(newSession);
            if (prov.type === "openai") fetchOpenAIModels(endpoint, key).catch(() => undefined);
        } catch (e: unknown) {
            setLoginError(classifyError(e));
        } finally {
            setLoginLoading(false);
        }
    }

    // ── Send message ──────────────────────────────────────────────────────────
    const handleSend = useCallback(async () => {
        if (!input.trim() || sendingRef.current || !session) return;
        if (rateLimited) return; // silently block while countdown is active

        const rawQ = input.trim();

        // ── Shortcut: instant reply without API call ──────────────────────────
        const shortcutReply = matchShortcut(rawQ, session.name ?? firstName);
        if (shortcutReply !== null) {
            setInput("");
            if (textareaRef.current) textareaRef.current.style.height = "auto";
            const userMsg: UIMessage = { id: `u-${Date.now()}`,  role: "user",      content: rawQ,          timestamp: new Date() };
            const aiMsg:   UIMessage = { id: `a-${Date.now()}`,  role: "assistant",  content: shortcutReply, timestamp: new Date(), tokenCount: estimateTokens(shortcutReply) };
            setMessages(prev => [...prev, userMsg, aiMsg]);
            setTimeout(() => textareaRef.current?.focus(), 50);
            return;
        }

        sendingRef.current = true;    // lock immediately — before any awaits
        setInput("");
        if (textareaRef.current) textareaRef.current.style.height = "auto";
        setBusy(true);

        const userMsg:   UIMessage = { id: `u-${Date.now()}`,  role: "user",      content: rawQ, timestamp: new Date() };
        const typingMsg: UIMessage = { id: `ty-${Date.now()}`, role: "assistant", content: "",   timestamp: new Date(), isTyping: true };
        setMessages(prev => [...prev, userMsg, typingMsg]);

        const prov     = detectProvider(session.endpointUrl);
        const isAnurit = prov.type === "anurit";

        try {
            const result = await sendMessage(session, rawQ, chatHistoryRef.current, activeConvId);

            if (!isAnurit) {
                chatHistoryRef.current = [
                    ...chatHistoryRef.current,
                    { role: "user",      content: rawQ          },
                    { role: "assistant", content: result.answer },
                ];
            }

            if (isAnurit && result.conversationId && !activeConvId) {
                setActiveConvId(result.conversationId);
                setConversations(prev => [{
                    _id:       result.conversationId!,
                    title:     rawQ.length > 50 ? rawQ.slice(0, 50) + "…" : rawQ,
                    updatedAt: new Date().toISOString(),
                }, ...prev]);
            }

            const answerContent = isAnurit
                ? cleanAnswer(result.answer ?? "", result.sources ?? [])
                : (result.answer ?? "");

            setMessages(prev => [...prev.filter(m => !m.isTyping), {
                id:         `a-${Date.now()}`,
                role:       "assistant",
                content:    answerContent,
                sources:    result.sources ?? [],
                timestamp:  new Date(),
                tokenCount: estimateTokens(answerContent),
            }]);

        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : "";

            if (msg === "__EXPIRED__") {
                _lockedSession     = null;
                sendingRef.current = false;
                setSession(null);
                setKeyExpired(true);
                setMessages(prev => prev.filter(m => !m.isTyping));
                return;
            }

            // ── Rate-limit sentinel: activate popup + countdown ───────────────
            if (msg === RATE_LIMIT_SENTINEL) {
                setMessages(prev => prev.filter(m => !m.isTyping));
                startRateLimit();
                sendingRef.current = false;
                setBusy(false);
                return;
            }

            const friendlyError = classifyError(e);
            setMessages(prev => [...prev.filter(m => !m.isTyping), {
                id:        `err-${Date.now()}`,
                role:      "assistant",
                content:   friendlyError,
                timestamp: new Date(),
                isError:   true,
            } as UIMessage]);

        } finally {
            sendingRef.current = false;
            setBusy(false);
            setTimeout(() => textareaRef.current?.focus(), 50);
        }
    }, [input, session, activeConvId, rateLimited, firstName, startRateLimit]);

    // ── Keyboard / input handlers ─────────────────────────────────────────────
    const handleKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void handleSend(); }
    }, [handleSend]);

    const handleInputChange = useCallback((e: ChangeEvent<HTMLTextAreaElement>) => {
        setInput(e.target.value);
        const el = e.target;
        el.style.height = "auto";
        el.style.height = Math.min(el.scrollHeight, 100) + "px";
    }, []);

    // ── Dimensions ────────────────────────────────────────────────────────────
    const w = viewport.width  || "100%";
    const h = viewport.height || "100%";

    // ── Guard screens ─────────────────────────────────────────────────────────
    if (keyExpired) {
        const prov = session ? detectProvider(session.endpointUrl) : { label: "AI" };
        return <ExpiredScreen w={w} h={h} providerLabel={prov.label} />;
    }
    if (!session) {
        return (
            <ConfigGateScreen
                w={w} h={h}
                endpointUrl={effectiveEndpoint}
                apiKey={effectiveApiKey}
                loading={loginLoading}
                error={loginError}
                onVerify={() => void attemptLogin()}
            />
        );
    }

    const prov     = detectProvider(session.endpointUrl);
    const isAnurit = prov.type === "anurit";
    const placeholder = isAnurit ? "Ask about your documents…" : `Ask ${prov.label} anything…`;

    // Countdown formatted string for the above-input banner
    const countdownMins = Math.floor(countdownSeconds / 60);
    const countdownSecs = countdownSeconds % 60;
    const countdownFormatted = `${countdownMins}:${String(countdownSecs).padStart(2, "0")}`;

    return (
        <div className="askdata-visual" style={{ width: w, height: h, display: "flex", flexDirection: "column" }}>
            {/* Rate-limit modal overlay */}
            {modalVisible && (
                <RateLimitModal
                    secondsLeft={countdownSeconds}
                    onDismiss={() => setModalVisible(false)}
                />
            )}

            <Header
                firstName={firstName}
                providerLabel={prov.label}
                providerColor={prov.color}
                isAnurit={isAnurit}
                historyOpen={historyOpen}
                theme={theme}
                onHistoryToggle={() => setHistoryOpen(!historyOpen)}
            />
            <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>
                {historyOpen && (
                    <div
                        onClick={() => setHistoryOpen(false)}
                        style={{ position: "absolute", inset: 0, zIndex: 9, background: "rgba(0,0,0,.18)" }}
                    />
                )}
                {isAnurit && (
                    <HistorySidebar
                        open={historyOpen}
                        conversations={conversations}
                        activeConvId={activeConvId}
                        renaming={renaming}
                        onClose={() => setHistoryOpen(false)}
                        onNewChat={startNewChat}
                        onOpen={openConversation}
                        onRename={id => setRenaming({ id, value: conversations.find(c => c._id === id)?.title ?? "Untitled" })}
                        onDelete={deleteConversation}
                        onRenameChange={value => setRenaming(prev => prev ? { ...prev, value } : null)}
                        onRenameCommit={commitRename}
                        onRenameCancel={() => setRenaming(null)}
                    />
                )}
                <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
                    <ChatArea
                        messages={messages}
                        initials={initials}
                        providerLabel={prov.label}
                        providerColor={prov.color}
                        isAnurit={isAnurit}
                        modelName={session.modelName}
                        firstName={firstName}
                        theme={theme}
                        messagesEndRef={messagesEndRef}
                    />

                    {/* ── Countdown banner (above chatbox, only while rate-limited) ── */}
                    {rateLimited && (
                        <div style={{
                            flexShrink:     0,
                            display:        "flex",
                            alignItems:     "center",
                            justifyContent: "center",
                            gap:            8,
                            padding:        "6px 14px",
                            background:     "rgba(184,149,90,.08)",
                            borderTop:      "1px solid rgba(184,149,90,.25)",
                            borderBottom:   "1px dashed rgba(184,149,90,.25)",
                        }}>
                            <span style={{ fontSize: ".8em" }}>⏳</span>
                            <span style={{ fontSize: ".8em", color: "var(--ac-gold)", fontWeight: 600, fontFamily: "var(--ac-sans)" }}>
                                Rate limit active — chat resumes in{" "}
                                <span style={{ fontFamily: "var(--ac-mono)", fontWeight: 700 }}>{countdownFormatted}</span>
                            </span>
                            <button
                                onClick={() => setModalVisible(true)}
                                style={{ marginLeft: 4, fontSize: ".74em", color: "var(--ac-gold)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", padding: 0 }}
                            >
                                Details
                            </button>
                        </div>
                    )}

                    <ChatInputBar
                        input={input}
                        busy={busy || rateLimited}
                        placeholder={rateLimited ? `Chat locked — resumes in ${countdownFormatted}` : placeholder}
                        providerColor={prov.color}
                        theme={theme}
                        textareaRef={textareaRef}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        onSend={() => void handleSend()}
                    />
                </div>
            </div>
        </div>
    );
};

export default ChatApp;

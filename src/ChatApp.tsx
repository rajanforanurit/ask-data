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
} from "./chat/api";
import { ConfigGateScreen, ExpiredScreen } from "./chat/screens";
import { HistorySidebar }                   from "./chat/HistorySidebar";
import { Header, ChatArea, ChatInputBar }   from "./chat/sections";

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
// Translates raw Error messages into user-friendly copy.
// NEVER returns "Something went wrong" — every error is specific and actionable.
function classifyError(err: unknown): string {
    const msg = err instanceof Error ? err.message : String(err ?? "");

    if (!msg || msg === "__EXPIRED__") return ""; // handled separately

    // Timeout / AbortError
    if (msg.includes("timed out") || msg.includes("AbortError")) {
        return "The request took too long. The server may be under load — please try again.";
    }
    // Network / offline
    if (
        msg.toLowerCase().includes("network") ||
        msg.toLowerCase().includes("failed to fetch") ||
        msg.toLowerCase().includes("networkerror")
    ) {
        return "A network error occurred. Please check your connection and try again.";
    }
    // Rate limit
    if (msg.includes("429") || msg.toLowerCase().includes("rate limit") || msg.toLowerCase().includes("quota")) {
        return "You've hit the API rate limit. Please wait a moment and try again.";
    }
    // Backend overloaded (503 from Ask Data after retries)
    if (msg.includes("503") || msg.toLowerCase().includes("service unavailable")) {
        return "The AI service is temporarily overloaded. Please try again in a few seconds.";
    }
    // Token / content filter
    if (msg.toLowerCase().includes("content") && msg.toLowerCase().includes("filter")) {
        return "The response was blocked by a content filter. Try rephrasing your question.";
    }
    // Auth errors
    if (msg.includes("401") || msg.toLowerCase().includes("unauthorized") || msg.toLowerCase().includes("invalid api key")) {
        return "Authentication failed — your API key may be invalid or expired. Update it in the Format Pane.";
    }
    // Fallback: use the raw message if it's reasonably short and readable
    if (msg.length > 0 && msg.length < 180) return msg;
    return "An unexpected error occurred. Please try again — if the problem persists, check your API configuration.";
}

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

    // ── Request guard — prevents duplicate concurrent sends ───────────────────
    // A ref (not state) so it never triggers re-renders and is never stale inside closures.
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
    // Uses a ref-based guard (sendingRef) so rapid clicks / Enter key spam
    // cannot queue duplicate requests. The `busy` state drives the UI;
    // the ref drives the logic — they are always in sync.
    const handleSend = useCallback(async () => {
        if (!input.trim() || sendingRef.current || !session) return;

        const rawQ = input.trim();
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
                // Session truly expired — show the expired screen
                _lockedSession     = null;
                sendingRef.current = false;
                setSession(null);
                setKeyExpired(true);
                setMessages(prev => prev.filter(m => !m.isTyping));
                // Don't reset busy/sendingRef here — component will unmount
                return;
            }

            // Classify and display a specific, actionable error message
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
    }, [input, session, activeConvId]); // `busy` intentionally excluded — sendingRef is the guard

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

    return (
        <div className="askdata-visual" style={{ width: w, height: h, display: "flex", flexDirection: "column" }}>
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
                    <ChatInputBar
                        input={input}
                        busy={busy}
                        placeholder={placeholder}
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
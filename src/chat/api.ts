import { ASKDATA_API, TOP_K, TEMPERATURE, MAX_TOKENS } from "./types";
import type { Session, Source } from "./types";
import { detectProvider } from "./utils";

const DEFAULT_TIMEOUT_MS  = 45_000;
const MAX_RETRIES         = 2;
const RETRY_BASE_DELAY_MS = 600;
const CACHE_TTL_MS        = 60_000;
const CACHE_MAX_SIZE      = 40;

// ─── Special sentinel thrown when the backend rate-limits this client ─────────
// ChatApp catches "__RATE_LIMITED__" and activates the countdown UI.
export const RATE_LIMIT_SENTINEL = "__RATE_LIMITED__";

function fetchWithTimeout(
    url:       string,
    options:   RequestInit,
    timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<Response> {
    const controller = new AbortController();
    const timer      = setTimeout(() => controller.abort(), timeoutMs);
    return fetch(url, { ...options, signal: controller.signal }).finally(() =>
        clearTimeout(timer),
    );
}

async function fetchWithRetry(
    url:       string,
    options:   RequestInit,
    timeoutMs: number = DEFAULT_TIMEOUT_MS,
    maxRetries: number = MAX_RETRIES,
): Promise<Response> {
    let lastError: unknown;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const response = await fetchWithTimeout(url, options, timeoutMs);
            // Don't retry client auth errors — they will never succeed
            if (response.status === 401 || response.status === 403 || response.status === 400) {
                return response;
            }
            // Rate-limit from Ask Data backend: surface immediately — no retry.
            // The backend blocks the client_id for 2 minutes; retrying wastes quota.
            if (response.status === 429) {
                return response;
            }
            // Retry on server overload only
            if (response.status >= 500 && attempt < maxRetries) {
                const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
                await new Promise(r => setTimeout(r, delay));
                continue;
            }
            return response;
        } catch (err) {
            lastError = err;
            const isAbort = err instanceof Error && err.name === "AbortError";
            if (isAbort || attempt >= maxRetries) break;
            const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
            await new Promise(r => setTimeout(r, delay));
        }
    }
    if (lastError instanceof Error && lastError.name === "AbortError") {
        throw new Error("The request timed out. The server is taking too long to respond.");
    }
    throw lastError instanceof Error
        ? lastError
        : new Error("Network error — check your connection and try again.");
}

// ─── Response cache (LRU-ish) ─────────────────────────────────────────────────
interface CacheEntry {
    value:     { answer: string; sources?: Source[]; conversationId?: string };
    expiresAt: number;
}
const _responseCache = new Map<string, CacheEntry>();

function cacheGet(key: string): CacheEntry["value"] | null {
    const entry = _responseCache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) { _responseCache.delete(key); return null; }
    // LRU: re-insert to move to end
    _responseCache.delete(key);
    _responseCache.set(key, entry);
    return entry.value;
}

function cacheSet(key: string, value: CacheEntry["value"]): void {
    if (_responseCache.size >= CACHE_MAX_SIZE) {
        // Evict the oldest entry (Map preserves insertion order)
        const firstKey = _responseCache.keys().next().value;
        if (firstKey !== undefined) _responseCache.delete(firstKey);
    }
    _responseCache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
}

const _inFlight = new Map<string, Promise<{ answer: string; sources?: Source[]; conversationId?: string }>>();

function makeFingerprint(clientId: string, query: string, convId: string | null): string {
    return `${clientId}::${query}::${convId ?? ""}`;
}

export async function fetchOpenAIModels(endpoint: string, apiKey: string): Promise<string[]> {
    try {
        const base = endpoint.replace(/\/v1\/.*$/, "");
        const r = await fetchWithTimeout(`${base}/v1/models`, {
            headers: { Authorization: `Bearer ${apiKey}` },
        });
        if (!r.ok) return [];
        const d = await r.json() as { data?: Array<{ id: string }> };
        return (d.data ?? [])
            .map(m => m.id)
            .filter(id => id.startsWith("gpt") || id.startsWith("o"))
            .sort();
    } catch {
        return [];
    }
}

export async function verifyEndpoint(
    endpointUrl: string,
    apiKey:      string,
    modelName:   string,
): Promise<{ clientId: string; name: string }> {
    const prov = detectProvider(endpointUrl);

    switch (prov.type) {
        case "anurit": {
            const r = await fetchWithRetry(
                `${ASKDATA_API}/chat/login`,
                {
                    method:  "POST",
                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
                    body:    JSON.stringify({ apiKey }),
                },
            );
            const d = await r.json() as { error?: string; client?: { clientId: string; name?: string } };
            if (!r.ok) throw new Error(d.error ?? "Ask Data login failed — check your API key.");
            return { clientId: d.client!.clientId, name: d.client!.name ?? d.client!.clientId };
        }

        case "gemini": {
            const r = await fetchWithRetry(
                `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
                { method: "GET" },
            );
            if (r.status === 400 || r.status === 401 || r.status === 403) {
                const d = await r.json() as { error?: { message?: string } };
                throw new Error(d.error?.message ?? "Invalid Gemini API key.");
            }
            if (!r.ok) throw new Error("Gemini key verification failed — try again.");
            return { clientId: "gemini-user", name: "Gemini User" };
        }

        case "openai": {
            const base = endpointUrl.replace(/\/v1\/.*$/, "");
            const r = await fetchWithRetry(
                `${base}/v1/models`,
                { method: "GET", headers: { Authorization: `Bearer ${apiKey}` } },
            );
            if (r.status === 401) {
                const d = await r.json() as { error?: { message?: string } };
                throw new Error(d.error?.message ?? "Invalid OpenAI API key.");
            }
            if (!r.ok) throw new Error("OpenAI key verification failed — try again.");
            return { clientId: "openai-user", name: "OpenAI User" };
        }

        case "anthropic": {
            const r = await fetchWithRetry(
                "https://api.anthropic.com/v1/messages",
                {
                    method:  "POST",
                    headers: {
                        "Content-Type":      "application/json",
                        "x-api-key":         apiKey,
                        "anthropic-version": "2023-06-01",
                    },
                    body: JSON.stringify({
                        model:      modelName || "claude-3-haiku-20240307",
                        max_tokens: 1,
                        messages:   [{ role: "user", content: "hi" }],
                    }),
                },
            );
            if (r.status === 401 || r.status === 403) {
                const d = await r.json() as { error?: { message?: string } };
                throw new Error(d.error?.message ?? "Invalid Anthropic API key.");
            }
            if (!r.ok && r.status !== 400) throw new Error("Anthropic key verification failed — try again.");
            return { clientId: "anthropic-user", name: "Claude User" };
        }

        default: {
            if (!apiKey.trim()) throw new Error("API key is required.");
            return { clientId: "custom-user", name: "User" };
        }
    }
}

export async function sendMessage(
    session:        Session,
    query:          string,
    history:        Array<{ role: "user" | "assistant"; content: string }>,
    conversationId: string | null,
): Promise<{ answer: string; sources?: Source[]; conversationId?: string }> {
    const prov = detectProvider(session.endpointUrl);
    if (prov.type === "anurit") {
        const fp     = makeFingerprint(session.clientId, query, conversationId);
        const cached = cacheGet(fp);
        if (cached) return cached;

        const inFlight = _inFlight.get(fp);
        if (inFlight) return inFlight;

        const promise = _sendAnurit(session, query, conversationId)
            .then(result => {
                // Cache successful responses only
                if (result.answer) cacheSet(fp, result);
                return result;
            })
            .finally(() => {
                _inFlight.delete(fp);
            });

        _inFlight.set(fp, promise);
        return promise;
    }

    return _sendGeneric(prov.type, session, query, history);
}

// ─── Private: Anurit (Ask Data RAG backend) ───────────────────────────────────
async function _sendAnurit(
    session:        Session,
    query:          string,
    conversationId: string | null,
): Promise<{ answer: string; sources?: Source[]; conversationId?: string }> {
    let lastErr: Error | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
            const r = await fetchWithTimeout(
                `${ASKDATA_API}/chat/message`,
                {
                    method:  "POST",
                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.apiKey}` },
                    body:    JSON.stringify({ query, topK: TOP_K, conversationId }),
                },
                DEFAULT_TIMEOUT_MS,
            );

            if (r.status === 401) throw new Error("__EXPIRED__");

            // Rate-limit: backend blocked this client_id for 2 minutes.
            // Throw sentinel — ChatApp will activate the countdown UI.
            if (r.status === 429) {
                throw new Error(RATE_LIMIT_SENTINEL);
            }

            // Retry on 5xx only (429 is handled above)
            if (r.status >= 500 && attempt < MAX_RETRIES) {
                await new Promise(res => setTimeout(res, RETRY_BASE_DELAY_MS * Math.pow(2, attempt)));
                continue;
            }

            const d = await r.json() as {
                error?: string;
                answer?: string;
                sources?: Source[];
                conversationId?: string;
            };

            if (!r.ok) {
                const msg = d.error ?? `Server returned ${r.status}`;
                if (r.status === 503 && attempt < MAX_RETRIES) {
                    lastErr = new Error(msg);
                    await new Promise(res => setTimeout(res, RETRY_BASE_DELAY_MS * Math.pow(2, attempt)));
                    continue;
                }
                throw new Error(msg);
            }

            return {
                answer:         d.answer          ?? "",
                sources:        d.sources         ?? [],
                conversationId: d.conversationId,
            };
        } catch (err) {
            // Propagate sentinels immediately — no retry
            if (err instanceof Error && (
                err.message === "__EXPIRED__" ||
                err.message === RATE_LIMIT_SENTINEL
            )) throw err;

            if (err instanceof Error && err.name === "AbortError") {
                lastErr = new Error("The request timed out. The server may be under load — please try again.");
                if (attempt < MAX_RETRIES) {
                    await new Promise(res => setTimeout(res, RETRY_BASE_DELAY_MS * Math.pow(2, attempt)));
                    continue;
                }
            } else {
                lastErr = err instanceof Error ? err : new Error("Unexpected error contacting Ask Data.");
                if (attempt < MAX_RETRIES) {
                    await new Promise(res => setTimeout(res, RETRY_BASE_DELAY_MS * Math.pow(2, attempt)));
                    continue;
                }
            }
        }
    }

    throw lastErr ?? new Error("Ask Data did not respond after multiple attempts. Please try again.");
}

// ─── Private: generic LLM providers ──────────────────────────────────────────
async function _sendGeneric(
    provType: string,
    session:  Session,
    query:    string,
    history:  Array<{ role: "user" | "assistant"; content: string }>,
): Promise<{ answer: string }> {
    switch (provType) {
        case "gemini": {
            const contents = [
                ...history.map(m => ({
                    role:  m.role === "user" ? "user" : "model",
                    parts: [{ text: m.content }],
                })),
                { role: "user", parts: [{ text: query }] },
            ];
            const body: Record<string, unknown> = {
                contents,
                generationConfig: { temperature: TEMPERATURE, maxOutputTokens: MAX_TOKENS },
            };
            if (session.systemPrompt) body.system_instruction = { parts: [{ text: session.systemPrompt }] };
            const model = session.modelName || "gemini-2.5-flash";
            const r = await fetchWithRetry(
                `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${session.apiKey}`,
                { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
            );
            if (r.status === 401 || r.status === 403) throw new Error("__EXPIRED__");
            const d = await r.json() as {
                error?: { message?: string };
                candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
            };
            if (!r.ok) throw new Error(d.error?.message ?? `Gemini returned ${r.status}. Please try again.`);
            return { answer: d.candidates?.[0]?.content?.parts?.[0]?.text ?? "" };
        }

        case "openai": {
            const base = session.endpointUrl.replace(/\/v1\/.*$/, "");
            const messages: Array<{ role: string; content: string }> = [];
            if (session.systemPrompt) messages.push({ role: "system", content: session.systemPrompt });
            messages.push(...history.map(m => ({ role: m.role, content: m.content })));
            messages.push({ role: "user", content: query });
            const r = await fetchWithRetry(
                `${base}/v1/chat/completions`,
                {
                    method:  "POST",
                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.apiKey}` },
                    body:    JSON.stringify({ model: session.modelName || "gpt-4o-mini", messages, temperature: TEMPERATURE, max_tokens: MAX_TOKENS }),
                },
            );
            if (r.status === 401) throw new Error("__EXPIRED__");
            const d = await r.json() as {
                error?: { message?: string };
                choices?: Array<{ message?: { content?: string } }>;
            };
            if (!r.ok) throw new Error(d.error?.message ?? `OpenAI returned ${r.status}. Please try again.`);
            return { answer: d.choices?.[0]?.message?.content ?? "" };
        }

        case "anthropic": {
            const messages: Array<{ role: string; content: string }> = [
                ...history.map(m => ({ role: m.role, content: m.content })),
                { role: "user", content: query },
            ];
            const body: Record<string, unknown> = {
                model:      session.modelName || "claude-3-haiku-20240307",
                max_tokens: MAX_TOKENS,
                messages,
            };
            if (session.systemPrompt) body.system = session.systemPrompt;
            const r = await fetchWithRetry(
                "https://api.anthropic.com/v1/messages",
                {
                    method:  "POST",
                    headers: { "Content-Type": "application/json", "x-api-key": session.apiKey, "anthropic-version": "2023-06-01" },
                    body:    JSON.stringify(body),
                },
            );
            if (r.status === 401 || r.status === 403) throw new Error("__EXPIRED__");
            const d = await r.json() as {
                error?: { message?: string };
                content?: Array<{ text?: string }>;
            };
            if (!r.ok) throw new Error(d.error?.message ?? `Anthropic returned ${r.status}. Please try again.`);
            return { answer: d.content?.[0]?.text ?? "" };
        }

        default: {
            // Custom / unknown provider — uses Ask Data branding label in UI
            const messages: Array<{ role: string; content: string }> = [];
            if (session.systemPrompt) messages.push({ role: "system", content: session.systemPrompt });
            messages.push(...history.map(m => ({ role: m.role, content: m.content })));
            messages.push({ role: "user", content: query });
            const r = await fetchWithRetry(
                session.endpointUrl,
                {
                    method:  "POST",
                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.apiKey}` },
                    body:    JSON.stringify({ model: session.modelName, messages, temperature: TEMPERATURE, max_tokens: MAX_TOKENS }),
                },
            );
            if (r.status === 401) throw new Error("__EXPIRED__");
            const d = await r.json() as {
                error?: { message?: string };
                choices?: Array<{ message?: { content?: string } }>;
                answer?: string;
            };
            if (!r.ok) throw new Error(d.error?.message ?? `Request failed with status ${r.status}. Please try again.`);
            return { answer: d.choices?.[0]?.message?.content ?? d.answer ?? "" };
        }
    }
}

// ─── Conversation CRUD (Ask Data only) ───────────────────────────────────────
export async function apiListConversations(apiKey: string) {
    try {
        const r = await fetchWithRetry(
            `${ASKDATA_API}/chat/conversations/list`,
            { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` } },
        );
        if (!r.ok) return null;
        return r.json() as Promise<{ conversations?: import("./types").Conversation[] }>;
    } catch {
        return null;
    }
}

export async function apiGetConversation(apiKey: string, conversationId: string) {
    try {
        const r = await fetchWithRetry(
            `${ASKDATA_API}/chat/conversations/get`,
            {
                method:  "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
                body:    JSON.stringify({ conversationId }),
            },
        );
        if (!r.ok) return null;
        return r.json() as Promise<{
            messages?: Array<{ role: "user" | "assistant"; content: string; sources?: Source[]; timestamp?: string }>;
        }>;
    } catch {
        return null;
    }
}

export async function apiDeleteConversation(apiKey: string, conversationId: string) {
    try {
        const r = await fetchWithRetry(
            `${ASKDATA_API}/chat/conversations/delete`,
            {
                method:  "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
                body:    JSON.stringify({ conversationId }),
            },
        );
        return r.ok;
    } catch {
        return false;
    }
}

export async function apiRenameConversation(apiKey: string, conversationId: string, title: string) {
    try {
        const r = await fetchWithRetry(
            `${ASKDATA_API}/chat/conversations/rename`,
            {
                method:  "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
                body:    JSON.stringify({ conversationId, title }),
            },
        );
        return r.ok;
    } catch {
        return false;
    }
}

export async function apiVerifySession(apiKey: string): Promise<boolean> {
    try {
        const r = await fetchWithTimeout(
            `${ASKDATA_API}/client/verify`,
            { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` } },
            10_000,
        );
        return r.status !== 401;
    } catch {
        return true; // network error — don't invalidate the session
    }
}

// ─── Cache management (exported for tests / admin UI) ────────────────────────
export function clearResponseCache(): void {
    _responseCache.clear();
}
export function getResponseCacheSize(): number {
    return _responseCache.size;
}

import { ASKDATA_API as ANURIT_API, TOP_K, TEMPERATURE, MAX_TOKENS } from "./types";
import type { Session, Source } from "./types";
import { detectProvider } from "./utils";

export async function fetchOpenAIModels(endpoint: string, apiKey: string): Promise<string[]> {
    try {
        const base = endpoint.replace(/\/v1\/.*$/, "");
        const r = await fetch(`${base}/v1/models`, {
            headers: { Authorization: `Bearer ${apiKey}` },
        });
        if (!r.ok) return [];
        const d = await r.json() as { data?: Array<{ id: string }> };
        return (d.data ?? []).map(m => m.id).filter(id => id.startsWith("gpt") || id.startsWith("o")).sort();
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
            const r = await fetch(`${ANURIT_API}/chat/login`, {
                method:  "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
                body:    JSON.stringify({ apiKey }),
            });
            const d = await r.json() as { error?: string; client?: { clientId: string; name?: string } };
            if (!r.ok) throw new Error(d.error ?? "Ask Data login failed");
            return { clientId: d.client!.clientId, name: d.client!.name ?? d.client!.clientId };
        }

        case "gemini": {
            const r = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
                { method: "GET" },
            );
            if (r.status === 400 || r.status === 401 || r.status === 403) {
                const d = await r.json() as { error?: { message?: string } };
                throw new Error(d.error?.message ?? "Invalid Gemini API key");
            }
            if (!r.ok) throw new Error("Gemini key verification failed");
            return { clientId: "gemini-user", name: "Gemini User" };
        }

        case "openai": {
            const base = endpointUrl.replace(/\/v1\/.*$/, "");
            const r = await fetch(`${base}/v1/models`, {
                method:  "GET",
                headers: { Authorization: `Bearer ${apiKey}` },
            });
            if (r.status === 401) {
                const d = await r.json() as { error?: { message?: string } };
                throw new Error(d.error?.message ?? "Invalid OpenAI API key");
            }
            if (!r.ok) throw new Error("OpenAI key verification failed");
            return { clientId: "openai-user", name: "OpenAI User" };
        }

        case "anthropic": {
            const r = await fetch("https://api.anthropic.com/v1/messages", {
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
            });
            if (r.status === 401 || r.status === 403) {
                const d = await r.json() as { error?: { message?: string } };
                throw new Error(d.error?.message ?? "Invalid Anthropic API key");
            }
            if (!r.ok && r.status !== 400) throw new Error("Anthropic key verification failed");
            return { clientId: "anthropic-user", name: "Claude User" };
        }

        default: {
            if (!apiKey.trim()) throw new Error("API key is required");
            return { clientId: "custom-user", name: "User" };
        }
    }
}

// ── Message sending ───────────────────────────────────────────────────────────

export async function sendMessage(
    session:        Session,
    query:          string,
    history:        Array<{ role: "user" | "assistant"; content: string }>,
    conversationId: string | null,
): Promise<{ answer: string; sources?: Source[]; conversationId?: string }> {
    const prov = detectProvider(session.endpointUrl);

    switch (prov.type) {
        case "anurit": {
            const r = await fetch(`${ANURIT_API}/chat/message`, {
                method:  "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.apiKey}` },
                body:    JSON.stringify({ query, topK: TOP_K, conversationId }),
            });
            if (r.status === 401) throw new Error("__EXPIRED__");
            const d = await r.json() as { error?: string; answer?: string; sources?: Source[]; conversationId?: string };
            if (!r.ok) throw new Error(d.error ?? "Request failed");
            return { answer: d.answer ?? "", sources: d.sources ?? [], conversationId: d.conversationId };
        }

        case "gemini": {
            const contents = [
                ...history.map(m => ({ role: m.role === "user" ? "user" : "model", parts: [{ text: m.content }] })),
                { role: "user", parts: [{ text: query }] },
            ];
            const body: Record<string, unknown> = {
                contents,
                generationConfig: { temperature: TEMPERATURE, maxOutputTokens: MAX_TOKENS },
            };
            if (session.systemPrompt) body.system_instruction = { parts: [{ text: session.systemPrompt }] };
            const model = session.modelName || "gemini-2.5-flash";
            const r = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${session.apiKey}`,
                { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
            );
            if (r.status === 401 || r.status === 403) throw new Error("__EXPIRED__");
            const d = await r.json() as { error?: { message?: string }; candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
            if (!r.ok) throw new Error(d.error?.message ?? "Gemini request failed");
            return { answer: d.candidates?.[0]?.content?.parts?.[0]?.text ?? "" };
        }

        case "openai": {
            const base = session.endpointUrl.replace(/\/v1\/.*$/, "");
            const messages: Array<{ role: string; content: string }> = [];
            if (session.systemPrompt) messages.push({ role: "system", content: session.systemPrompt });
            messages.push(...history.map(m => ({ role: m.role, content: m.content })));
            messages.push({ role: "user", content: query });
            const r = await fetch(`${base}/v1/chat/completions`, {
                method:  "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.apiKey}` },
                body:    JSON.stringify({ model: session.modelName || "gpt-4o-mini", messages, temperature: TEMPERATURE, max_tokens: MAX_TOKENS }),
            });
            if (r.status === 401) throw new Error("__EXPIRED__");
            const d = await r.json() as { error?: { message?: string }; choices?: Array<{ message?: { content?: string } }> };
            if (!r.ok) throw new Error(d.error?.message ?? "OpenAI request failed");
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
            const r = await fetch("https://api.anthropic.com/v1/messages", {
                method:  "POST",
                headers: { "Content-Type": "application/json", "x-api-key": session.apiKey, "anthropic-version": "2023-06-01" },
                body:    JSON.stringify(body),
            });
            if (r.status === 401 || r.status === 403) throw new Error("__EXPIRED__");
            const d = await r.json() as { error?: { message?: string }; content?: Array<{ text?: string }> };
            if (!r.ok) throw new Error(d.error?.message ?? "Anthropic request failed");
            return { answer: d.content?.[0]?.text ?? "" };
        }

        default: {
            const messages: Array<{ role: string; content: string }> = [];
            if (session.systemPrompt) messages.push({ role: "system", content: session.systemPrompt });
            messages.push(...history.map(m => ({ role: m.role, content: m.content })));
            messages.push({ role: "user", content: query });
            const r = await fetch(session.endpointUrl, {
                method:  "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.apiKey}` },
                body:    JSON.stringify({ model: session.modelName, messages, temperature: TEMPERATURE, max_tokens: MAX_TOKENS }),
            });
            if (r.status === 401) throw new Error("__EXPIRED__");
            const d = await r.json() as { error?: { message?: string }; choices?: Array<{ message?: { content?: string } }>; answer?: string };
            if (!r.ok) throw new Error(d.error?.message ?? "Request failed");
            return { answer: d.choices?.[0]?.message?.content ?? d.answer ?? "" };
        }
    }
}

// ── Conversation CRUD (Ask Data only) ───────────────────────────────────────────

export async function apiListConversations(apiKey: string) {
    const r = await fetch(`${ANURIT_API}/chat/conversations/list`, {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    });
    if (!r.ok) return null;
    return r.json() as Promise<{ conversations?: import("./types").Conversation[] }>;
}

export async function apiGetConversation(apiKey: string, conversationId: string) {
    const r = await fetch(`${ANURIT_API}/chat/conversations/get`, {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body:    JSON.stringify({ conversationId }),
    });
    if (!r.ok) return null;
    return r.json() as Promise<{ messages?: Array<{ role: "user"|"assistant"; content: string; sources?: Source[]; timestamp?: string }> }>;
}

export async function apiDeleteConversation(apiKey: string, conversationId: string) {
    const r = await fetch(`${ANURIT_API}/chat/conversations/delete`, {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body:    JSON.stringify({ conversationId }),
    });
    return r.ok;
}

export async function apiRenameConversation(apiKey: string, conversationId: string, title: string) {
    const r = await fetch(`${ANURIT_API}/chat/conversations/rename`, {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body:    JSON.stringify({ conversationId, title }),
    });
    return r.ok;
}

export async function apiVerifySession(apiKey: string): Promise<boolean> {
    try {
        const r = await fetch(`${ANURIT_API}/client/verify`, {
            method:  "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
        });
        return r.status !== 401;
    } catch {
        return true; // network error — don't invalidate
    }
}
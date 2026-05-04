// ─── utils.ts — pure utility functions ───────────────────────────────────────

import type { ProviderType, DetectedProvider, Source } from "./types";
import { MODEL_LISTS } from "./types";

// ── Provider detection ───────────────────────────────────────────────────────

export function detectProvider(url: string): DetectedProvider {
    const u = url.toLowerCase();
    if (u.includes("anuritchatbackend.vercel.app"))
        return { type: "anurit",    label: "Ask Data",  color: "#b8955a", defaultModel: "Ask Data MiniLLM",          modelOptions: MODEL_LISTS.anurit,    lockModel: true,  lockPrompt: true  };
    if (u.includes("openai.com"))
        return { type: "openai",    label: "OpenAI",           color: "#10A37F", defaultModel: "gpt-4o-mini",             modelOptions: MODEL_LISTS.openai,    lockModel: false, lockPrompt: false };
    if (u.includes("generativelanguage.googleapis.com"))
        return { type: "gemini",    label: "Google Gemini",    color: "#4285F4", defaultModel: "gemini-2.5-flash",        modelOptions: MODEL_LISTS.gemini,    lockModel: false, lockPrompt: false };
    if (u.includes("api.anthropic.com"))
        return { type: "anthropic", label: "Anthropic Claude", color: "#c7522a", defaultModel: "claude-3-haiku-20240307", modelOptions: MODEL_LISTS.anthropic, lockModel: false, lockPrompt: false };
    return { type: "custom", label: "Custom API", color: "#6c63ff", defaultModel: "", modelOptions: [], lockModel: false, lockPrompt: false };
}

// ── Markdown renderer ────────────────────────────────────────────────────────

export function esc(s: string): string {
    return String(s || "")
        .replace(/&/g, "&amp;").replace(/</g, "&lt;")
        .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function md(t: string): string {
    if (!t) return "";
    let s = esc(t);
    s = s.replace(/```[\s\S]*?```/g, (m) => {
        const inner = m.replace(/^```\w*\n?/, "").replace(/\n?```$/, "");
        return `<pre><code>${inner}</code></pre>`;
    });
    s = s.replace(/`([^`]+)`/g, "<code>$1</code>");
    s = s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    s = s.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, "<em>$1</em>");
    s = s.replace(/((?:^|\n)[ \t]*[-•][ \t].+)+/g, (block) => {
        const items = block.split("\n").filter((l) => l.trim());
        return `<ul>${items.map((l) => `<li>${l.replace(/^[ \t]*[-•][ \t]/, "")}</li>`).join("")}</ul>`;
    });
    s = s.replace(/((?:^|\n)[ \t]*\d+\.[ \t].+)+/g, (block) => {
        const items = block.split("\n").filter((l) => l.trim());
        return `<ol>${items.map((l) => `<li>${l.replace(/^[ \t]*\d+\.[ \t]/, "")}</li>`).join("")}</ol>`;
    });
    return s.split(/\n\n+/).map((block) => {
        block = block.trim();
        if (!block) return "";
        if (block.startsWith("<ul") || block.startsWith("<ol") || block.startsWith("<pre")) return block;
        return `<p>${block.replace(/\n/g, "<br>")}</p>`;
    }).join("");
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
}

export function formatHistDate(iso?: string): string {
    if (!iso) return "";
    const d    = new Date(iso);
    const now  = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / 86_400_000);
    if (diff === 0) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (diff === 1) return "Yesterday";
    if (diff < 7)  return d.toLocaleDateString([], { weekday: "short" });
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function cleanAnswer(answer: string, sources: Source[]): string {
    if (!answer) return answer;
    let cleaned = answer.replace(/\[\s*\d+(?:\s*,\s*\d+)*\s*\]/g, "").trim();
    const fallbackPatterns = [
        /the (provided |given |available )?context does not (define|contain|mention|explain|include|describe|have|provide)/i,
        /is not (defined|mentioned|described|explained|included) in the (provided |given |available )?context/i,
        /no (information|data|definition|detail) (is |was )?(provided|found|available|present) (in|within) the (provided |given |available )?context/i,
    ];
    if (fallbackPatterns.some((p) => p.test(cleaned)) && sources.length > 0) {
        cleaned = "The information is available in your documents — here's what was found in the relevant sections. You may want to rephrase your question for a more targeted answer.";
    }
    return cleaned.replace(/\s{2,}/g, " ").trim();
}

export function resolveSystemPrompt(providerType: ProviderType, custom: string, defaultPrompt: string): string {
    if (providerType === "anurit") return "";
    const t = custom.trim();
    return t || defaultPrompt;
}
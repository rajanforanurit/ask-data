import { useState, useCallback, type FC } from "react";
import type { UIMessage, Source } from "./types";
import type { ResolvedTheme } from "./styles";
import { md, esc, estimateTokens } from "./utils";

export const SendIcon: FC = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="22" y1="2" x2="11" y2="13" />
        <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
);
export const ProviderBadge: FC<{ label: string; color: string }> = ({ label, color }) => (
    <span style={{ display:"inline-flex",alignItems:"center",gap:4,fontSize:".72em",fontWeight:600,color,background:color+"18",border:`1px solid ${color}44`,borderRadius:99,padding:"2px 7px",letterSpacing:".03em",whiteSpace:"nowrap" }}>
        <span style={{ width:5,height:5,borderRadius:"50%",background:color,display:"inline-block" }} />
        {label}
    </span>
);
export const SourceAccordion: FC<{ sources: Source[] }> = ({ sources }) => {
    const [open, setOpen] = useState(false);
    if (!sources.length) return null;
    return (
        <div style={{ marginTop: 6 }}>
            <button
                onClick={() => setOpen(!open)}
                style={{ display:"inline-flex",alignItems:"center",gap:4,background:"none",border:"none",cursor:"pointer",fontSize:".82em",color:"var(--ac-text3)",fontFamily:"var(--ac-mono)",padding:0,transition:"color .15s" }}
                onMouseEnter={e => (e.currentTarget.style.color = "var(--ac-gold)")}
                onMouseLeave={e => (e.currentTarget.style.color = "var(--ac-text3)")}
            >
                <span style={{ display:"inline-block",transition:"transform .15s",transform:open?"rotate(90deg)":"none" }}>›</span>
                &nbsp;{sources.length} section{sources.length !== 1 ? "s" : ""} referenced
            </button>
            {open && (
                <div style={{ background:"var(--ac-surface2)",border:"1px solid var(--ac-border2)",borderRadius:3,overflow:"hidden",marginTop:2 }}>
                    {sources.map((s, i) => (
                        <div key={i} style={{ padding:"7px 10px",borderBottom:i<sources.length-1?"1px solid var(--ac-border)":"none" }}>
                            <div style={{ display:"flex",alignItems:"center",gap:5,marginBottom:3 }}>
                                <span style={{ fontFamily:"var(--ac-mono)",fontSize:".75em",color:"var(--ac-gold)",background:"var(--ac-gold-light)",borderRadius:2,padding:"1px 4px" }}>{i+1}</span>
                                <span style={{ fontSize:".82em",color:"var(--ac-text2)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1 }}>{esc(s.source_file ?? "unknown")}</span>
                                <span style={{ fontFamily:"var(--ac-mono)",fontSize:".75em",color:"var(--ac-text3)",flexShrink:0 }}>
                                    {s.score != null ? (s.score > 1 ? `${s.score}%` : `${(s.score*100).toFixed(0)}%`) : "—"}
                                </span>
                            </div>
                            <div style={{ fontSize:".82em",color:"var(--ac-text3)",lineHeight:1.5,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden" }}>
                                {s.preview ?? ""}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
const CopyIcon: FC = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
);

const CheckIcon: FC = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
    </svg>
);
// Only match bare domain URLs (no http/https prefix) — full https:// URLs are
// already converted to <a> tags inside md() before linkifyHtml runs.
const BARE_URL_REGEX = /(www\.[a-zA-Z0-9-]+(?:\.[a-zA-Z]{2,})+(?:\/[^\s<>"']*)?|[a-zA-Z0-9][a-zA-Z0-9-]*\.(?:com|org|net|io|dev|ai|co|app|edu|gov|info|biz|me)(?:\/[^\s<>"']*)?)/g;

export function linkifyHtml(html: string): string {
    return html.replace(/>([^<]+)</g, (match, textContent: string) => {
        const linked = textContent.replace(BARE_URL_REGEX, (url: string) => {
            if (!url.includes(".")) return url;
            const href = `https://${url}`;
            return `<a href="${href}" target="_blank" rel="noopener noreferrer" class="ac-link">${url}</a>`;
        });
        return `>${linked}<`;
    });
}
const CopyButton: FC<{ content: string }> = ({ content }) => {
    const [copied, setCopied] = useState(false);
    const handleCopy = useCallback(async (e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await navigator.clipboard.writeText(content);
        } catch {
            // Fallback for environments without clipboard API
            const ta = document.createElement("textarea");
            ta.value = content;
            ta.style.cssText = "position:fixed;opacity:0;pointer-events:none;";
            document.body.appendChild(ta);
            ta.focus();
            ta.select();
            try { document.execCommand("copy"); } catch { /* ignore */ }
            document.body.removeChild(ta);
        }
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }, [content]);

    return (
        <button
            onClick={handleCopy}
            title={copied ? "Copied!" : "Copy response"}
            style={{
                position:    "absolute",
                top:         8,
                right:       8,
                display:     "flex",
                alignItems:  "center",
                gap:         4,
                background:  copied ? "var(--ac-gold-light, #fdf6e3)" : "var(--ac-surface, #fff)",
                border:      `1px solid ${copied ? "var(--ac-gold, #b8955a)" : "var(--ac-border, #e2e8f0)"}`,
                borderRadius:4,
                padding:     "3px 7px",
                cursor:      "pointer",
                fontSize:    ".72em",
                fontFamily:  "var(--ac-sans)",
                fontWeight:  500,
                color:       copied ? "var(--ac-gold, #b8955a)" : "var(--ac-text3, #888)",
                transition:  "all .15s",
                whiteSpace:  "nowrap",
                zIndex:      2,
            }}
            onMouseEnter={e => {
                if (!copied) {
                    e.currentTarget.style.borderColor = "var(--ac-gold, #b8955a)";
                    e.currentTarget.style.color = "var(--ac-gold, #b8955a)";
                }
            }}
            onMouseLeave={e => {
                if (!copied) {
                    e.currentTarget.style.borderColor = "var(--ac-border, #e2e8f0)";
                    e.currentTarget.style.color = "var(--ac-text3, #888)";
                }
            }}
        >
            {copied ? <CheckIcon /> : <CopyIcon />}
            {copied ? "Copied!" : "Copy"}
        </button>
    );
};
interface MsgBubbleProps {
    msg:           UIMessage;
    initials:      string;
    providerLabel: string;
    providerColor: string;
    theme:         ResolvedTheme;
}

export const MessageBubble: FC<MsgBubbleProps> = ({ msg, initials, providerLabel, providerColor, theme }) => {
    const [hovered, setHovered] = useState(false);
    const isUser     = msg.role === "user";
    const ts         = msg.timestamp.toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" });
    const tokenCount = msg.tokenCount ?? (msg.content ? estimateTokens(msg.content) : 0);
    const st = theme.sharedTextStyle;
    const sharedFont = {
        fontFamily:  st.fontFamily ? `'${st.fontFamily}', var(--ac-sans)` : "var(--ac-sans)",
        fontSize:    `${st.fontSize}px`,
        fontWeight:  st.fontWeight,
    };
    const bubbleColors = isUser ? theme.inputStyle : theme.responseStyle;
    const logoStyle = isUser ? theme.userLogo : theme.aiLogo;
    const avatarFontFamily = logoStyle.fontFamily
        ? `'${logoStyle.fontFamily}', var(--ac-sans)`
        : "var(--ac-serif)";
    // Error messages are plain text — never markdown-parsed or linkified
    const isError      = !isUser && !!msg.isError;
    const renderedHtml = (!isUser && !msg.isTyping && !isError && msg.content)
        ? linkifyHtml(md(msg.content))
        : "";

    return (
        <div style={{ display:"flex",gap:8,animation:"ac-msgIn .22s cubic-bezier(.16,1,.3,1)",alignSelf:isUser?"flex-end":"flex-start",flexDirection:isUser?"row-reverse":"row",maxWidth:isUser?"85%":"100%" }}>
            <div style={{ width:26,height:26,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:".85em",fontWeight:logoStyle.fontWeight,borderRadius:3,background:logoStyle.backgroundColor,color:logoStyle.textColor,fontFamily:avatarFontFamily }}>
                {isUser ? initials : providerLabel[0]?.toUpperCase() ?? "A"}
            </div>
            <div style={{ minWidth:0,maxWidth:"100%" }}>
                {msg.isTyping ? (
                    <div style={{ display:"flex",alignItems:"center",gap:4,padding:"8px 12px",background:"var(--ac-surface)",border:"1px solid var(--ac-border)",borderRadius:3 }}>
                        {[0,150,300].map(d => (
                            <div key={d} style={{ width:5,height:5,borderRadius:"50%",background:"var(--ac-gold)",animation:`ac-bounce 1s ${d}ms infinite` }} />
                        ))}
                    </div>
                ) : isUser ? (
                    <div style={{
                        ...sharedFont,
                        color:           bubbleColors.color,
                        backgroundColor: bubbleColors.backgroundColor,
                        padding:"8px 12px",borderRadius:3,lineHeight:1.55,wordBreak:"break-word",
                    }}>
                        {msg.content}
                    </div>
                ) : isError ? (
                    /* ── Error bubble — distinct styling, never markdown-parsed ── */
                    <div style={{
                        position:        "relative",
                        backgroundColor: "rgba(192,57,43,.06)",
                        border:          "1px solid rgba(192,57,43,.28)",
                        borderRadius:    3,
                        padding:         "10px 12px",
                        display:         "flex",
                        alignItems:      "flex-start",
                        gap:             8,
                    }}>
                        <span style={{ fontSize: "1em", flexShrink: 0, marginTop: 1 }}>⚠️</span>
                        <span style={{
                            ...sharedFont,
                            color:      "var(--ac-red)",
                            lineHeight: 1.55,
                            wordBreak:  "break-word",
                        }}>
                            {msg.content}
                        </span>
                    </div>
                ) : (
                    <div
                        onMouseEnter={() => setHovered(true)}
                        onMouseLeave={() => setHovered(false)}
                        style={{
                            position:        "relative",
                            backgroundColor: bubbleColors.backgroundColor,
                            border:          "1px solid var(--ac-border)",
                            borderRadius:    3,
                            padding:         "10px 12px",
                        }}
                    >
                        {hovered && <CopyButton content={msg.content} />}

                        <div
                            className="ac-asst-text"
                            style={{
                                ...sharedFont,
                                lineHeight: theme.content.lineHeight,
                                color:      bubbleColors.color,
                                wordBreak:  "break-word",
                                marginTop:  hovered ? 22 : 0,
                                transition: "margin-top .12s",
                            }}
                            dangerouslySetInnerHTML={{ __html: renderedHtml }}
                        />
                        {theme.showTokenCount && !msg.isTyping && (
                            <div style={{ marginTop:6,fontSize:".75em",color:"var(--ac-text3)",fontFamily:"var(--ac-mono)" }}>
                                ~{tokenCount} tokens
                            </div>
                        )}
                    </div>
                )}
                {theme.showTimestamps && !msg.isTyping && (
                    <div style={{ marginTop:3,fontSize:".72em",color:"var(--ac-text3)",fontFamily:"var(--ac-mono)",textAlign:isUser?"right":"left" }}>
                        {ts}
                    </div>
                )}
            </div>
        </div>
    );
};
import { useState, type FC } from "react";
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

interface MsgBubbleProps {
    msg:           UIMessage;
    initials:      string;
    providerLabel: string;
    providerColor: string;
    theme:         ResolvedTheme;
}

export const MessageBubble: FC<MsgBubbleProps> = ({ msg, initials, providerLabel, providerColor, theme }) => {
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

    // Avatar logo styles
    const logoStyle = isUser ? theme.userLogo : theme.aiLogo;
    const avatarFontFamily = logoStyle.fontFamily
        ? `'${logoStyle.fontFamily}', var(--ac-sans)`
        : "var(--ac-serif)";

    return (
        <div style={{ display:"flex",gap:8,animation:"ac-msgIn .22s cubic-bezier(.16,1,.3,1)",alignSelf:isUser?"flex-end":"flex-start",flexDirection:isUser?"row-reverse":"row",maxWidth:isUser?"85%":"100%" }}>
            {/* Avatar */}
            <div style={{ width:26,height:26,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:".85em",fontWeight:logoStyle.fontWeight,borderRadius:3,background:logoStyle.backgroundColor,color:logoStyle.textColor,fontFamily:avatarFontFamily }}>
                {isUser ? initials : providerLabel[0]?.toUpperCase() ?? "A"}
            </div>

            {/* Content */}
            <div style={{ minWidth:0,maxWidth:"100%" }}>
                {msg.isTyping ? (
                    <div style={{ display:"flex",alignItems:"center",gap:4,padding:"8px 12px",background:"var(--ac-surface)",border:"1px solid var(--ac-border)",borderRadius:3 }}>
                        {[0,150,300].map(d => (
                            <div key={d} style={{ width:5,height:5,borderRadius:"50%",background:"var(--ac-gold)",animation:`ac-bounce 1s ${d}ms infinite` }} />
                        ))}
                    </div>
                ) : isUser ? (
                    // ── User (input) bubble ───────────────────────────────────
                    <div style={{
                        ...sharedFont,
                        color:           bubbleColors.color,
                        backgroundColor: bubbleColors.backgroundColor,
                        padding:"8px 12px",borderRadius:3,lineHeight:1.55,wordBreak:"break-word",
                    }}>
                        {msg.content}
                    </div>
                ) : (
                    // ── Assistant (response) bubble ───────────────────────────
                    <div style={{
                        backgroundColor: bubbleColors.backgroundColor,
                        border:"1px solid var(--ac-border)",borderRadius:3,padding:"10px 12px",
                    }}>
                        <div
                            className="ac-asst-text"
                            style={{
                                ...sharedFont,
                                lineHeight: theme.content.lineHeight,
                                color:      bubbleColors.color,
                                wordBreak:  "break-word",
                            }}
                            dangerouslySetInnerHTML={{ __html: md(msg.content) }}
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

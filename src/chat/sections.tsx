import { useRef, type FC, type KeyboardEvent, type ChangeEvent, type RefObject, type ReactNode } from "react";
import type { UIMessage } from "./types";
import type { ResolvedTheme } from "./styles";
import { MessageBubble, ProviderBadge, SendIcon } from "./components";
function linkify(text: string): ReactNode[] {
    const urlRegex = /(https?:\/\/[^\s,)]+)/g;
    const parts = text.split(urlRegex);
    return parts.map((part, i) => {
        if (urlRegex.test(part)) {
            urlRegex.lastIndex = 0;
            return (
                <a
                    key={i}
                    href={part}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "inherit", textDecoration: "underline", wordBreak: "break-all" }}
                >
                    {part}
                </a>
            );
        }
        return part;
    });
}
export function renderMessageContent(content: string): ReactNode {
    if (!content) return null;
    const lines = content.split("\n");
    return (
        <>
            {lines.map((line, i) => (
                <span key={i}>
                    {linkify(line)}
                    {i < lines.length - 1 && <br />}
                </span>
            ))}
        </>
    );
}
interface HeaderProps {
    firstName: string;
    providerLabel: string;
    providerColor: string;
    isAnurit: boolean;
    historyOpen: boolean;
    theme: ResolvedTheme;
    onHistoryToggle: () => void;
}
export const Header: FC<HeaderProps> = ({
    firstName, providerLabel, providerColor, isAnurit, historyOpen, theme, onHistoryToggle,
}) => {
    const hd = theme.header;
    const us = theme.userSection;
    return (
        <div style={{
            flexShrink: 0,
            background: hd.backgroundColor,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: `0 ${hd.paddingH}px`,
            height: hd.height,
            gap: 8,
            borderBottom: `1px solid ${hd.borderColor}`,
            fontFamily: hd.fontFamily || "var(--ac-sans)",
        }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                <span style={{ fontFamily: "var(--ac-serif)", fontSize: `${hd.fontSizeTitle}px`, fontWeight: 700, color: hd.logoTextColor, whiteSpace: "nowrap" }}>
                    Ask Data
                </span>
                <ProviderBadge label={providerLabel} color={providerColor} />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                <span style={{ fontSize: `${hd.fontSizeTitle > 12 ? 13 : hd.fontSizeTitle}px`, color: hd.greetingColor, whiteSpace: "nowrap" }}>
                    Hi, <strong style={{ color: hd.logoTextColor }}>{firstName}</strong>
                </span>
                {isAnurit && (
                    <button
                        onClick={onHistoryToggle}
                        style={{ background: us.historyBg, border: `1px solid ${us.historyColor}55`, borderRadius: us.borderRadius, padding: "4px 9px", cursor: "pointer", color: historyOpen ? us.hoverColor : us.historyColor, fontFamily: "var(--ac-sans)", fontSize: ".78em", fontWeight: 500, letterSpacing: ".04em", textTransform: "uppercase", whiteSpace: "nowrap", transition: "border-color .15s,color .15s" }}
                        onMouseEnter={e => { e.currentTarget.style.color = us.hoverColor; e.currentTarget.style.borderColor = us.hoverColor + "88"; }}
                        onMouseLeave={e => { e.currentTarget.style.color = historyOpen ? us.hoverColor : us.historyColor; e.currentTarget.style.borderColor = `${us.historyColor}55`; }}
                    >☰ History</button>
                )}
            </div>
        </div>
    );
};
interface TypingIndicatorProps {
    providerColor: string;
}
const TypingIndicator: FC<TypingIndicatorProps> = ({ providerColor }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{
            fontSize: "13px",
            fontStyle: "italic",
            color: providerColor,
            opacity: 0.85,
            animation: "askdata-pulse 1.4s ease-in-out infinite",
        }}>
            Working…
        </span>
        <style>{`@keyframes askdata-pulse{0%,100%{opacity:.5}50%{opacity:1}}`}</style>
    </div>
);
interface ChatAreaProps {
    messages: UIMessage[];
    initials: string;
    providerLabel: string;
    providerColor: string;
    isAnurit: boolean;
    modelName: string;
    firstName: string;
    theme: ResolvedTheme;
    messagesEndRef: RefObject<HTMLDivElement>;
}
export const ChatArea: FC<ChatAreaProps> = ({
    messages, initials, providerLabel, providerColor, isAnurit, modelName, firstName, theme, messagesEndRef,
}) => {
    const ct = theme.content;
    return (
        <>
            {messages.length === 0 && (
                <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: ct.textAlign === "center" ? "center" : ct.textAlign === "right" ? "flex-end" : "flex-start", justifyContent: "center", textAlign: ct.textAlign, padding: `${ct.sectionSpacing}px 20px`, background: ct.backgroundColor }}>
                    <div style={{ fontSize: `${ct.subtitleFontSize}px`, fontWeight: 600, letterSpacing: `${ct.letterSpacing}px`, textTransform: "uppercase", color: ct.subtitleColor, marginBottom: 10 }}>
                        {providerLabel}
                    </div>
                    <div style={{ fontFamily: "var(--ac-serif)", fontSize: `${ct.titleFontSize}px`, fontWeight: ct.titleFontWeight, lineHeight: 1.2, color: ct.titleColor, marginBottom: 6, letterSpacing: "-.01em" }}>
                        Hi, <em style={{ fontStyle: "italic", color: providerColor }}>{firstName}</em>
                    </div>
                    <p style={{ fontSize: `${ct.descFontSize}px`, color: ct.descColor, lineHeight: ct.lineHeight, maxWidth: 290 }}>
                        {isAnurit
                            ? "Your documents are ready. Ask anything — I'll find the answer."
                            : `Connected to ${providerLabel}${modelName ? ` · ${modelName}` : ""}. Ask me anything!`
                        }
                    </p>
                </div>
            )}
            {messages.length > 0 && (
                <div style={{ flex: 1, overflowY: "auto", padding: "16px 14px 8px", display: "flex", flexDirection: "column", gap: 18, background: ct.backgroundColor }}>
                    {messages.map(msg => (
                        msg.isTyping
                            ? (
                                <div key={msg.id} style={{ display: "flex", justifyContent: "flex-start" }}>
                                    <TypingIndicator providerColor={providerColor} />
                                </div>
                            )
                            : (
                                <MessageBubble
                                    key={msg.id}
                                    msg={msg}
                                    initials={initials}
                                    providerLabel={providerLabel}
                                    providerColor={providerColor}
                                    theme={theme}
                                />
                            )
                    ))}
                    <div ref={messagesEndRef} />
                </div>
            )}
        </>
    );
};
interface ChatInputProps {
    input: string;
    busy: boolean;
    placeholder: string;
    providerColor: string;
    theme: ResolvedTheme;
    textareaRef: RefObject<HTMLTextAreaElement>;
    onChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
    onKeyDown: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
    onSend: () => void;
}
export const ChatInputBar: FC<ChatInputProps> = ({
    input, busy, placeholder, providerColor, theme, textareaRef, onChange, onKeyDown, onSend,
}) => {
    const ci = theme.chatInput;
    const sb = theme.sendButton;
    const st = theme.sharedTextStyle;
    const inputTextStyle = {
        fontFamily: st.fontFamily ? `'${st.fontFamily}', var(--ac-sans)` : "var(--ac-sans)",
        fontSize: `${st.fontSize}px`,
        fontWeight: st.fontWeight,
        color: "#1a1a1a",
    };
    return (
        <div style={{ flexShrink: 0, padding: "8px 10px 10px", background: "var(--ac-bg)", borderTop: "1px solid var(--ac-border)" }}>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 7, background: ci.backgroundColor, border: `1px solid ${ci.borderColor}`, borderRadius: ci.borderRadius, padding: `${ci.padding}px ${ci.padding}px ${ci.padding}px ${ci.padding + 4}px`, boxShadow: "var(--ac-shadow)" }}>
                <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={onChange}
                    onKeyDown={onKeyDown}
                    onFocus={e => { const p = e.target.closest("div") as HTMLElement; if (p) { p.style.borderColor = providerColor; p.style.boxShadow = `0 0 0 2px ${providerColor}33`; } }}
                    onBlur={e => { const p = e.target.closest("div") as HTMLElement; if (p) { p.style.borderColor = ci.borderColor; p.style.boxShadow = "var(--ac-shadow)"; } }}
                    rows={1}
                    placeholder={busy ? "Working…" : placeholder}
                    disabled={busy}
                    style={{ flex: 1, background: "none", border: "none", outline: "none", ...inputTextStyle, lineHeight: 1.45, resize: "none", minHeight: 20, maxHeight: 100, overflowY: "auto", opacity: busy ? .6 : 1 }}
                />
                <button
                    onClick={onSend}
                    disabled={busy || !input.trim()}
                    style={{ width: sb.width, height: sb.height, borderRadius: sb.borderRadius, flexShrink: 0, background: sb.backgroundColor, border: "none", cursor: busy || !input.trim() ? "not-allowed" : "pointer", color: sb.iconColor, display: "flex", alignItems: "center", justifyContent: "center", transition: "opacity .15s", opacity: busy || !input.trim() ? .35 : 1 }}
                    onMouseEnter={e => { if (!busy && input.trim()) e.currentTarget.style.background = sb.hoverBackground; }}
                    onMouseLeave={e => { e.currentTarget.style.background = sb.backgroundColor; }}
                >
                    <SendIcon />
                </button>
            </div>
        </div>
    );
};

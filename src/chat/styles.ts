// ─── styles.ts — CSS variable injection from Format Pane settings ─────────────

import type { VisualFormattingSettingsModel } from "../settings";

/** Resolved palette consumed by the React tree. */
export interface ResolvedTheme {
    // canvas / surface
    bg:       string;
    surface:  string;
    surface2: string;
    // borders
    border:  string;
    border2: string;
    // text hierarchy
    text:  string;
    text2: string;
    text3: string;
    // brand
    navy:  string;
    navy2: string;
    // accent
    accent:   string;
    accentBg: string;
    accentGl: string;
    // status
    green: string;
    red:   string;
    // component-level
    header:      ReturnType<typeof resolveHeader>;
    userSection: ReturnType<typeof resolveUserSection>;
    content:     ReturnType<typeof resolveContent>;
    chatInput:   ReturnType<typeof resolveChatInput>;
    sendButton:  ReturnType<typeof resolveSendButton>;
    // shared text style (applies to both input & response bubbles)
    sharedTextStyle: ReturnType<typeof resolveSharedTextStyle>;
    // per-bubble colours
    inputStyle:    { color: string; backgroundColor: string };
    responseStyle: { color: string; backgroundColor: string };
    // avatar logo styles
    userLogo: { backgroundColor: string; textColor: string; fontWeight: string; fontFamily: string };
    aiLogo:   { backgroundColor: string; textColor: string; fontWeight: string; fontFamily: string };
    // feature flags
    showTimestamps:       boolean;
    showTokenCount:       boolean;
    showSourceReferences: boolean;
    isDark: boolean;
}

// ── Section resolvers ─────────────────────────────────────────────────────────

function resolveHeader(s: VisualFormattingSettingsModel) {
    return {
        backgroundColor:  s.header.backgroundColor,
        height:           s.header.height,
        paddingH:         s.header.paddingH,
        logoTextColor:    s.header.logoTextColor,
        subtitleColor:    s.header.subtitleColor,
        fontFamily:       s.header.fontFamily,
        fontSizeTitle:    s.header.fontSizeTitle,
        fontSizeSubtitle: s.header.fontSizeSubtitle,
        greetingColor:    s.header.greetingColor,
        borderColor:      s.header.borderColor,
    };
}

function resolveUserSection(s: VisualFormattingSettingsModel) {
    return {
        historyBg:    s.userSection.historyBg,
        historyColor: s.userSection.historyColor,
        borderRadius: s.userSection.borderRadius,
        hoverColor:   s.userSection.hoverColor,
        iconColor:    s.userSection.iconColor,
    };
}

function resolveContent(s: VisualFormattingSettingsModel) {
    return {
        backgroundColor:  s.content.backgroundColor,
        sectionSpacing:   s.content.sectionSpacing,
        titleColor:       s.content.titleColor,
        titleFontSize:    s.content.titleFontSize,
        titleFontWeight:  s.content.titleFontWeight,
        subtitleColor:    s.content.subtitleColor,
        subtitleFontSize: s.content.subtitleFontSize,
        letterSpacing:    s.content.letterSpacing,
        descColor:        s.content.descColor,
        descFontSize:     s.content.descFontSize,
        lineHeight:       s.content.lineHeight,
        textAlign:        s.content.textAlign,
    };
}

function resolveChatInput(s: VisualFormattingSettingsModel) {
    return {
        backgroundColor:  s.chatInput.backgroundColor,
        borderColor:      s.chatInput.borderColor,
        borderRadius:     s.chatInput.borderRadius,
        placeholderColor: s.chatInput.placeholderColor,
        padding:          s.chatInput.padding,
    };
}

function resolveSendButton(s: VisualFormattingSettingsModel) {
    return {
        backgroundColor: s.sendButton.backgroundColor,
        iconColor:       s.sendButton.iconColor,
        hoverBackground: s.sendButton.hoverBackground,
        borderRadius:    s.sendButton.borderRadius,
        width:           s.sendButton.width,
        height:          s.sendButton.height,
    };
}

function resolveSharedTextStyle(s: VisualFormattingSettingsModel) {
    return {
        fontFamily:  s.sharedTextStyle.fontFamily,
        fontSize:    s.sharedTextStyle.fontSize,
        fontWeight:  s.sharedTextStyle.fontWeight,
    };
}

// ── Main theme resolver ───────────────────────────────────────────────────────

export function resolveTheme(settings: VisualFormattingSettingsModel | null): ResolvedTheme {
    const isDark = false; // Light-only; theme preset removed

    const bg       = settings?.content?.backgroundColor ?? "#faf9f7";
    const surface  = "#ffffff";
    const surface2 = "#f8f7f4";
    const border   = "#e8e3db";
    const border2  = "#d9d2c5";
    const navy     = "#1a2b4a";
    const navy2    = "#243758";
    const text     = "#1a2b4a";
    const text2    = "#5a6a80";
    const text3    = "#9aa3b0";
    const accent   = "#b8955a";

    // ── Shared text style ─────────────────────────────────────────────────────
    const sharedTextStyle = resolveSharedTextStyle(settings ?? ({} as VisualFormattingSettingsModel));

    // ── Per-bubble colour styles (inherit font from sharedTextStyle) ──────────
    const inputStyle = {
        color:           settings?.inputSection?.fontColor       ?? "#ffffff",
        backgroundColor: settings?.inputSection?.backgroundColor ?? "#1a2b4a",
    };
    const responseStyle = {
        color:           settings?.responseSection?.fontColor       ?? "#1a2b4a",
        backgroundColor: settings?.responseSection?.backgroundColor ?? "#ffffff",
    };

    return {
        bg, surface, surface2, border, border2,
        text, text2, text3, navy, navy2,
        accent,
        accentBg: accent + "22",
        accentGl: accent + "44",
        green: "#27ae60",
        red:   "#c0392b",
        header:          resolveHeader     (settings ?? ({} as VisualFormattingSettingsModel)),
        userSection:     resolveUserSection(settings ?? ({} as VisualFormattingSettingsModel)),
        content:         resolveContent    (settings ?? ({} as VisualFormattingSettingsModel)),
        chatInput:       resolveChatInput  (settings ?? ({} as VisualFormattingSettingsModel)),
        sendButton:      resolveSendButton (settings ?? ({} as VisualFormattingSettingsModel)),
        sharedTextStyle,
        inputStyle,
        responseStyle,
        userLogo: {
            backgroundColor: settings?.userLogo?.backgroundColor ?? "#1a2b4a",
            textColor:       settings?.userLogo?.textColor       ?? "#b8955a",
            fontWeight:      settings?.userLogo?.fontWeight      ?? "700",
            fontFamily:      settings?.userLogo?.fontFamily      ?? "",
        },
        aiLogo: {
            backgroundColor: settings?.aiLogo?.backgroundColor ?? "#b8955a",
            textColor:       settings?.aiLogo?.textColor       ?? "#ffffff",
            fontWeight:      settings?.aiLogo?.fontWeight      ?? "700",
            fontFamily:      settings?.aiLogo?.fontFamily      ?? "",
        },
        showTimestamps:       false,
        showTokenCount:       false,
        showSourceReferences: false,
        isDark,
    };
}

// ── CSS injection ─────────────────────────────────────────────────────────────

export function injectStyles(t: ResolvedTheme): void {
    const id = "askdata-pbiv-styles-v1";
    let style = document.getElementById(id) as HTMLStyleElement | null;
    if (!style) {
        style = document.createElement("style");
        style.id = id;
        document.head.appendChild(style);
    }

    const st = t.sharedTextStyle;
    const fontStack = st.fontFamily
        ? `'${st.fontFamily}', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`
        : `-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;

    style.textContent = `
        .askdata-visual {
            --ac-bg:${t.bg};
            --ac-surface:${t.surface};
            --ac-surface2:${t.surface2};
            --ac-border:${t.border};
            --ac-border2:${t.border2};
            --ac-navy:${t.navy};
            --ac-navy2:${t.navy2};
            --ac-gold:${t.accent};
            --ac-gold-light:${t.accentBg};
            --ac-gold-glow:${t.accentGl};
            --ac-text:${t.text};
            --ac-text2:${t.text2};
            --ac-text3:${t.text3};
            --ac-red:${t.red};
            --ac-green:${t.green};
            --ac-serif:'Georgia',serif;
            --ac-sans:${fontStack};
            --ac-mono:'Courier New',monospace;
            --ac-shadow:0 2px 8px rgba(0,0,0,.1);
            font-family:var(--ac-sans);
            font-size:${st.fontSize}px;
            font-weight:${st.fontWeight};
            width:100%;height:100%;
            display:flex;flex-direction:column;
            background:var(--ac-bg);color:var(--ac-text);
            overflow:hidden;box-sizing:border-box;
        }
        .askdata-visual *,.askdata-visual *::before,.askdata-visual *::after{box-sizing:border-box;}
        .askdata-visual ::-webkit-scrollbar{width:3px;}
        .askdata-visual ::-webkit-scrollbar-track{background:transparent;}
        .askdata-visual ::-webkit-scrollbar-thumb{background:var(--ac-border2);border-radius:99px;}
        .ac-asst-text p{margin-bottom:8px;}
        .ac-asst-text p:last-child{margin-bottom:0;}
        .ac-asst-text strong{color:var(--ac-navy);font-weight:600;}
        .ac-asst-text ul,.ac-asst-text ol{padding-left:18px;margin:6px 0;}
        .ac-asst-text li{margin-bottom:4px;line-height:1.6;}
        .ac-asst-text code{background:var(--ac-surface2);border:1px solid var(--ac-border2);border-radius:3px;padding:1px 4px;font-family:var(--ac-mono);font-size:.85em;color:var(--ac-navy);}
        .ac-asst-text pre{background:var(--ac-navy);border-radius:3px;padding:10px 12px;overflow-x:auto;margin:8px 0;font-family:var(--ac-mono);font-size:.85em;line-height:1.6;color:#e8e3db;}
        .ac-asst-text pre code{background:none;border:none;padding:0;color:inherit;}
        @keyframes ac-msgIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
        @keyframes ac-bounce{0%,100%{transform:translateY(0);opacity:.4}50%{transform:translateY(-4px);opacity:1}}
        @keyframes ac-cardIn{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
        @keyframes ac-spin{to{transform:rotate(360deg)}}
        @keyframes ac-shake{0%,100%{transform:translateX(0)}25%,75%{transform:translateX(-4px)}50%{transform:translateX(4px)}}
        @keyframes ac-fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes ac-pulse{0%,100%{opacity:.5}50%{opacity:1}}
    `;
}

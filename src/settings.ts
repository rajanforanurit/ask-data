import powerbi from "powerbi-visuals-api";

// ─── System Prompt ────────────────────────────────────────────────────────────

export const DEFAULT_SYSTEM_PROMPT =
`You are a knowledgeable and professional AI assistant embedded inside a Power BI dashboard. You help business users with two types of questions:

1. GENERAL QUESTIONS — Explain concepts, answer factual questions, help with analysis, writing, calculations, or any general topic the user asks about.

2. BUSINESS & DATA QUESTIONS — Help interpret business metrics, KPIs, trends, financial terms, operational data, and domain-specific concepts. When answering business questions, be precise with numbers and terminology.

RULES:
- Be concise and direct. Business users value clarity over verbosity.
- Do not pad answers with unnecessary disclaimers or filler phrases like "Great question!" or "Certainly!".
- Use plain English. Avoid jargon unless the user uses it first.
- For calculations or data interpretations, show your reasoning step by step.
- If a question is ambiguous, give the most likely interpretation and answer it — do not ask multiple clarifying questions.
- Never fabricate data, statistics, or citations. If you don't know, say so clearly and briefly.
- Format responses using short paragraphs or bullet points where it aids readability. Avoid walls of text.`;

// ─── Enum types ───────────────────────────────────────────────────────────────

export type FontWeight = "300" | "400" | "500" | "600" | "700";
export type TextAlign  = "left" | "center" | "right";

// ─── Section interfaces ───────────────────────────────────────────────────────

export interface AiConfigSettings {
    endpointUrl:  string;
    apiKey:       string;
    modelName:    string;
    systemPrompt: string;
}

export interface HeaderSettings {
    backgroundColor:  string;
    height:           number;
    paddingH:         number;
    logoTextColor:    string;
    subtitleColor:    string;
    fontFamily:       string;
    fontSizeTitle:    number;
    fontSizeSubtitle: number;
    greetingColor:    string;
    borderColor:      string;
}

export interface UserSectionSettings {
    historyBg:    string;
    historyColor: string;
    borderRadius: number;
    hoverColor:   string;
    iconColor:    string;
}

export interface ContentSettings {
    backgroundColor:  string;
    sectionSpacing:   number;
    titleColor:       string;
    titleFontSize:    number;
    titleFontWeight:  FontWeight;
    subtitleColor:    string;
    subtitleFontSize: number;
    letterSpacing:    number;
    descColor:        string;
    descFontSize:     number;
    lineHeight:       number;
    textAlign:        TextAlign;
}

export interface ChatInputSettings {
    backgroundColor:  string;
    borderColor:      string;
    borderRadius:     number;
    placeholderColor: string;
    padding:          number;
}

export interface SendButtonSettings {
    backgroundColor: string;
    iconColor:       string;
    hoverBackground: string;
    borderRadius:    number;
    width:           number;
    height:          number;
}

/** Shared text styling — applies to BOTH input and response message bubbles. */
export interface SharedTextStyleSettings {
    fontFamily:  string;
    fontSize:    number;
    fontWeight:  FontWeight;
}

/** Input (user query) message bubble colors. */
export interface InputSectionSettings {
    fontColor:       string;
    backgroundColor: string;
}

/** Response (AI answer) message bubble colors. */
export interface ResponseSectionSettings {
    fontColor:       string;
    backgroundColor: string;
}

/** User logo/avatar styling. */
export interface UserLogoSettings {
    backgroundColor: string;
    textColor:       string;
    fontWeight:      FontWeight;
    fontFamily:      string;
}

/** AI response logo/avatar styling. */
export interface AiLogoSettings {
    backgroundColor: string;
    textColor:       string;
    fontWeight:      FontWeight;
    fontFamily:      string;
}

// ─── Root model ───────────────────────────────────────────────────────────────

export interface VisualFormattingSettingsModel {
    aiConfig:        AiConfigSettings;
    header:          HeaderSettings;
    userSection:     UserSectionSettings;
    content:         ContentSettings;
    chatInput:       ChatInputSettings;
    sendButton:      SendButtonSettings;
    sharedTextStyle: SharedTextStyleSettings;
    inputSection:    InputSectionSettings;
    responseSection: ResponseSectionSettings;
    userLogo:        UserLogoSettings;
    aiLogo:          AiLogoSettings;
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const defaults: VisualFormattingSettingsModel = {
    aiConfig: {
        endpointUrl:  "",
        apiKey:       "",
        modelName:    "",
        systemPrompt: "",
    },
    header: {
        backgroundColor:  "#f2f2f2",
        height:           42,
        paddingH:         12,
        logoTextColor:    "#111111",
        subtitleColor:    "#555555",
        fontFamily:       "",
        fontSizeTitle:    16,
        fontSizeSubtitle: 12,
        greetingColor:    "#444444",
        borderColor:      "#dddddd",
    },
    userSection: {
        historyBg:    "transparent",
        historyColor: "#555555",
        borderRadius: 3,
        hoverColor:   "#111111",
        iconColor:    "#555555",
    },
    content: {
        backgroundColor:  "#faf9f7",
        sectionSpacing:   24,
        titleColor:       "#1a2b4a",
        titleFontSize:    22,
        titleFontWeight:  "700",
        subtitleColor:    "#b8955a",
        subtitleFontSize: 11,
        letterSpacing:    2,
        descColor:        "#5a6a80",
        descFontSize:     13,
        lineHeight:       1.65,
        textAlign:        "center",
    },
    chatInput: {
        backgroundColor:  "#ffffff",
        borderColor:      "#d9d2c5",
        borderRadius:     3,
        placeholderColor: "#9aa3b0",
        padding:          8,
    },
    sendButton: {
        backgroundColor: "#b8955a",
        iconColor:       "#ffffff",
        hoverBackground: "#a07840",
        borderRadius:    3,
        width:           30,
        height:          30,
    },
    sharedTextStyle: {
        fontFamily:  "",
        fontSize:    13,
        fontWeight:  "400",
    },
    inputSection: {
        fontColor:       "#ffffff",
        backgroundColor: "#1a2b4a",
    },
    responseSection: {
        fontColor:       "#1a2b4a",
        backgroundColor: "#ffffff",
    },
    userLogo: {
        backgroundColor: "#1a2b4a",
        textColor:       "#b8955a",
        fontWeight:      "700" as FontWeight,
        fontFamily:      "",
    },
    aiLogo: {
        backgroundColor: "#b8955a",
        textColor:       "#ffffff",
        fontWeight:      "700" as FontWeight,
        fontFamily:      "",
    },
};

// ─── Parse helpers ────────────────────────────────────────────────────────────

function str(v: unknown, fallback: string): string {
    return typeof v === "string" && v.trim() !== "" ? v.trim() : fallback;
}
function strRaw(v: unknown, fallback: string): string {
    return typeof v === "string" ? v : fallback;
}
/** Reads a font-family value that may be a plain string OR a Power BI enum object { value: "..." }. */
function fontEnum(v: unknown, fallback: string): string {
    if (typeof v === "string") return v; // empty string is valid (means "default")
    if (v && typeof v === "object") {
        const ev = (v as { value?: unknown }).value;
        if (typeof ev === "string") return ev;
    }
    return fallback;
}
function num(v: unknown, fallback: number): number {
    const n = Number(v);
    return isFinite(n) ? n : fallback;
}
function color(v: unknown, fallback: string): string {
    if (typeof v === "string" && v.trim()) return v.trim();
    if (v && typeof v === "object") {
        const fill = v as { solid?: { color?: string } };
        if (fill.solid?.color) return fill.solid.color;
    }
    return fallback;
}
function enumVal<T extends string>(v: unknown, allowed: T[], fallback: T): T {
    if (typeof v === "string" && allowed.includes(v as T)) return v as T;
    if (v && typeof v === "object") {
        const ev = (v as { value?: unknown }).value;
        if (typeof ev === "string" && allowed.includes(ev as T)) return ev as T;
    }
    return fallback;
}

// ─── Settings class ───────────────────────────────────────────────────────────

export class VisualSettings implements VisualFormattingSettingsModel {
    aiConfig:        AiConfigSettings;
    header:          HeaderSettings;
    userSection:     UserSectionSettings;
    content:         ContentSettings;
    chatInput:       ChatInputSettings;
    sendButton:      SendButtonSettings;
    sharedTextStyle: SharedTextStyleSettings;
    inputSection:    InputSectionSettings;
    responseSection: ResponseSectionSettings;
    userLogo:        UserLogoSettings;
    aiLogo:          AiLogoSettings;

    constructor(partial?: Partial<VisualFormattingSettingsModel>) {
        this.aiConfig        = { ...defaults.aiConfig,        ...(partial?.aiConfig        ?? {}) };
        this.header          = { ...defaults.header,          ...(partial?.header          ?? {}) };
        this.userSection     = { ...defaults.userSection,     ...(partial?.userSection     ?? {}) };
        this.content         = { ...defaults.content,         ...(partial?.content         ?? {}) };
        this.chatInput       = { ...defaults.chatInput,       ...(partial?.chatInput       ?? {}) };
        this.sendButton      = { ...defaults.sendButton,      ...(partial?.sendButton      ?? {}) };
        this.sharedTextStyle = { ...defaults.sharedTextStyle, ...(partial?.sharedTextStyle ?? {}) };
        this.inputSection    = { ...defaults.inputSection,    ...(partial?.inputSection    ?? {}) };
        this.responseSection = { ...defaults.responseSection, ...(partial?.responseSection ?? {}) };
        this.userLogo        = { ...defaults.userLogo,        ...(partial?.userLogo        ?? {}) };
        this.aiLogo          = { ...defaults.aiLogo,          ...(partial?.aiLogo          ?? {}) };
    }

    static parse(dataView: powerbi.DataView | undefined): VisualSettings {
        const obj = dataView?.metadata?.objects ?? {};

        const ai  = (obj.aiConfig        as Record<string, unknown>) ?? {};
        const hd  = (obj.header          as Record<string, unknown>) ?? {};
        const us  = (obj.userSection     as Record<string, unknown>) ?? {};
        const ct  = (obj.content         as Record<string, unknown>) ?? {};
        const ci  = (obj.chatInput       as Record<string, unknown>) ?? {};
        const sb  = (obj.sendButton      as Record<string, unknown>) ?? {};
        const st  = (obj.sharedTextStyle as Record<string, unknown>) ?? {};
        const inp = (obj.inputSection    as Record<string, unknown>) ?? {};
        const res = (obj.responseSection as Record<string, unknown>) ?? {};
        const ul  = (obj.userLogo        as Record<string, unknown>) ?? {};
        const al  = (obj.aiLogo          as Record<string, unknown>) ?? {};

        const d = defaults;

        return new VisualSettings({
            aiConfig: {
                endpointUrl:  str(ai.endpointUrl,  d.aiConfig.endpointUrl),
                apiKey:       str(ai.apiKey,        d.aiConfig.apiKey),
                modelName:    str(ai.modelName,     d.aiConfig.modelName),
                systemPrompt: strRaw(ai.systemPrompt, d.aiConfig.systemPrompt),
            },
            header: {
                backgroundColor:  color(hd.backgroundColor,  d.header.backgroundColor),
                height:           num  (hd.height,            d.header.height),
                paddingH:         num  (hd.paddingH,          d.header.paddingH),
                logoTextColor:    color(hd.logoTextColor,     d.header.logoTextColor),
                subtitleColor:    color(hd.subtitleColor,     d.header.subtitleColor),
                fontFamily:       fontEnum(hd.fontFamily,        d.header.fontFamily),
                fontSizeTitle:    num  (hd.fontSizeTitle,     d.header.fontSizeTitle),
                fontSizeSubtitle: num  (hd.fontSizeSubtitle,  d.header.fontSizeSubtitle),
                greetingColor:    color(hd.greetingColor,     d.header.greetingColor),
                borderColor:      color(hd.borderColor,       d.header.borderColor),
            },
            userSection: {
                historyBg:    color(us.historyBg,    d.userSection.historyBg),
                historyColor: color(us.historyColor, d.userSection.historyColor),
                borderRadius: num  (us.borderRadius, d.userSection.borderRadius),
                hoverColor:   color(us.hoverColor,   d.userSection.hoverColor),
                iconColor:    color(us.iconColor,    d.userSection.iconColor),
            },
            content: {
                backgroundColor:  color   (ct.backgroundColor,  d.content.backgroundColor),
                sectionSpacing:   num     (ct.sectionSpacing,   d.content.sectionSpacing),
                titleColor:       color   (ct.titleColor,       d.content.titleColor),
                titleFontSize:    num     (ct.titleFontSize,    d.content.titleFontSize),
                titleFontWeight:  enumVal <FontWeight>(ct.titleFontWeight, ["300","400","500","600","700"], d.content.titleFontWeight),
                subtitleColor:    color   (ct.subtitleColor,    d.content.subtitleColor),
                subtitleFontSize: num     (ct.subtitleFontSize, d.content.subtitleFontSize),
                letterSpacing:    num     (ct.letterSpacing,    d.content.letterSpacing),
                descColor:        color   (ct.descColor,        d.content.descColor),
                descFontSize:     num     (ct.descFontSize,     d.content.descFontSize),
                lineHeight:       num     (ct.lineHeight,       d.content.lineHeight),
                textAlign:        enumVal <TextAlign>(ct.textAlign, ["left","center","right"], d.content.textAlign),
            },
            chatInput: {
                backgroundColor:  color(ci.backgroundColor,  d.chatInput.backgroundColor),
                borderColor:      color(ci.borderColor,      d.chatInput.borderColor),
                borderRadius:     num  (ci.borderRadius,     d.chatInput.borderRadius),
                placeholderColor: color(ci.placeholderColor, d.chatInput.placeholderColor),
                padding:          num  (ci.padding,          d.chatInput.padding),
            },
            sendButton: {
                backgroundColor: color(sb.backgroundColor, d.sendButton.backgroundColor),
                iconColor:       color(sb.iconColor,       d.sendButton.iconColor),
                hoverBackground: color(sb.hoverBackground, d.sendButton.hoverBackground),
                borderRadius:    num  (sb.borderRadius,    d.sendButton.borderRadius),
                width:           num  (sb.width,           d.sendButton.width),
                height:          num  (sb.height,          d.sendButton.height),
            },
            sharedTextStyle: {
                fontFamily:  fontEnum(st.fontFamily,  d.sharedTextStyle.fontFamily),
                fontSize:    num    (st.fontSize,    d.sharedTextStyle.fontSize),
                fontWeight:  enumVal<FontWeight>(st.fontWeight, ["300","400","500","600","700"], d.sharedTextStyle.fontWeight),
            },
            inputSection: {
                fontColor:       color(inp.fontColor,       d.inputSection.fontColor),
                backgroundColor: color(inp.backgroundColor, d.inputSection.backgroundColor),
            },
            responseSection: {
                fontColor:       color(res.fontColor,       d.responseSection.fontColor),
                backgroundColor: color(res.backgroundColor, d.responseSection.backgroundColor),
            },
            userLogo: {
                backgroundColor: color   (ul.backgroundColor, d.userLogo.backgroundColor),
                textColor:       color   (ul.textColor,       d.userLogo.textColor),
                fontWeight:      enumVal <FontWeight>(ul.fontWeight, ["300","400","500","600","700"], d.userLogo.fontWeight),
                fontFamily:      fontEnum(ul.fontFamily,      d.userLogo.fontFamily),
            },
            aiLogo: {
                backgroundColor: color   (al.backgroundColor, d.aiLogo.backgroundColor),
                textColor:       color   (al.textColor,       d.aiLogo.textColor),
                fontWeight:      enumVal <FontWeight>(al.fontWeight, ["300","400","500","600","700"], d.aiLogo.fontWeight),
                fontFamily:      fontEnum(al.fontFamily,      d.aiLogo.fontFamily),
            },
        });
    }
}

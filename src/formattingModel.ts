import { formattingSettings } from "powerbi-visuals-utils-formattingmodel";
import { DEFAULT_SYSTEM_PROMPT } from "./settings";

// ─── 1. AI Configuration ──────────────────────────────────────────────────────

class AiConfigCard extends formattingSettings.SimpleCard {
    name        = "aiConfig";
    displayName = "AI Configuration";

    endpointUrl = new formattingSettings.TextInput({
        name: "endpointUrl", displayName: "API Endpoint URL",
        description: "Full URL of the AI provider (e.g. https://api.openai.com/v1/chat/completions)",
        placeholder: "https://…", value: "",
    });
    apiKey = new formattingSettings.TextInput({
        name: "apiKey", displayName: "API Key",
        description: "Provider key: Ask Data rak_… | OpenAI sk-… | Gemini AIza… | Anthropic sk-ant-…",
        placeholder: "Enter API key…", value: "",
    });
    modelName = new formattingSettings.TextInput({
        name: "modelName", displayName: "Model Name",
        description: "E.g. gpt-4o-mini · gemini-2.5-flash · claude-3-haiku-20240307",
        placeholder: "e.g. gpt-4o-mini", value: "",
    });
    systemPrompt = new formattingSettings.TextInput({
        name: "systemPrompt", displayName: "System Prompt",
        description: "Customise AI behaviour. Locked for Ask Data backend.",
        placeholder: DEFAULT_SYSTEM_PROMPT.slice(0, 150) + "…", value: "",
    });

    slices = [this.endpointUrl, this.apiKey, this.modelName, this.systemPrompt];
}

// ─── 2. Header ────────────────────────────────────────────────────────────────

class HeaderCard extends formattingSettings.SimpleCard {
    name        = "header";
    displayName = "Header";

    backgroundColor  = new formattingSettings.ColorPicker({ name: "backgroundColor",  displayName: "Background Color",       value: { value: "#f2f2f2" } });
    height           = new formattingSettings.NumUpDown   ({ name: "height",           displayName: "Height (px)",             value: 42 });
    paddingH         = new formattingSettings.NumUpDown   ({ name: "paddingH",         displayName: "Horizontal Padding (px)", value: 12 });
    logoTextColor    = new formattingSettings.ColorPicker ({ name: "logoTextColor",    displayName: "Logo / Title Color",      value: { value: "#111111" } });
    subtitleColor    = new formattingSettings.ColorPicker ({ name: "subtitleColor",    displayName: "Subtitle Color",          value: { value: "#555555" } });
    fontFamily       = new formattingSettings.ItemDropdown({ name: "fontFamily", displayName: "Font Family", value: { value: "", displayName: "Default (System)" }, items: [
        { value: "",              displayName: "Default (System)"  },
        { value: "Segoe UI",      displayName: "Segoe UI"          },
        { value: "Calibri",       displayName: "Calibri"           },
        { value: "Arial",         displayName: "Arial"             },
        { value: "Helvetica",     displayName: "Helvetica"         },
        { value: "Verdana",       displayName: "Verdana"           },
        { value: "Trebuchet MS",  displayName: "Trebuchet MS"      },
        { value: "Georgia",       displayName: "Georgia"           },
        { value: "Times New Roman", displayName: "Times New Roman" },
        { value: "Garamond",      displayName: "Garamond"          },
        { value: "Tahoma",        displayName: "Tahoma"            },
        { value: "Century Gothic", displayName: "Century Gothic"   },
        { value: "Gill Sans",     displayName: "Gill Sans"         },
    ]});
    fontSizeTitle    = new formattingSettings.NumUpDown   ({ name: "fontSizeTitle",    displayName: "Title Font Size (px)",    value: 16 });
    fontSizeSubtitle = new formattingSettings.NumUpDown   ({ name: "fontSizeSubtitle", displayName: "Subtitle Font Size (px)", value: 12 });
    greetingColor    = new formattingSettings.ColorPicker ({ name: "greetingColor",    displayName: "User Greeting Color",     value: { value: "#444444" } });
    borderColor      = new formattingSettings.ColorPicker ({ name: "borderColor",      displayName: "Bottom Border Color",     value: { value: "#dddddd" } });

    slices = [
        this.backgroundColor, this.height, this.paddingH,
        this.logoTextColor, this.subtitleColor,
        this.fontFamily, this.fontSizeTitle, this.fontSizeSubtitle,
        this.greetingColor, this.borderColor,
    ];
}

// ─── 3. User Section ─────────────────────────────────────────────────────────

class UserSectionCard extends formattingSettings.SimpleCard {
    name        = "userSection";
    displayName = "User Section";

    historyBg    = new formattingSettings.ColorPicker({ name: "historyBg",    displayName: "History Button Background", value: { value: "transparent" } });
    historyColor = new formattingSettings.ColorPicker({ name: "historyColor", displayName: "History Button Text Color", value: { value: "#555555" } });
    borderRadius = new formattingSettings.NumUpDown  ({ name: "borderRadius", displayName: "Border Radius (px)",        value: 3 });
    hoverColor   = new formattingSettings.ColorPicker({ name: "hoverColor",   displayName: "Hover Color",               value: { value: "#111111" } });
    iconColor    = new formattingSettings.ColorPicker({ name: "iconColor",    displayName: "Icon Color",                value: { value: "#555555" } });

    slices = [this.historyBg, this.historyColor, this.borderRadius, this.hoverColor, this.iconColor];
}

// ─── 4. Content Area ─────────────────────────────────────────────────────────

class ContentCard extends formattingSettings.SimpleCard {
    name        = "content";
    displayName = "Content Area";

    backgroundColor  = new formattingSettings.ColorPicker  ({ name: "backgroundColor",  displayName: "Canvas Background",        value: { value: "#faf9f7" } });
    sectionSpacing   = new formattingSettings.NumUpDown    ({ name: "sectionSpacing",   displayName: "Section Spacing (px)",      value: 24 });
    titleColor       = new formattingSettings.ColorPicker  ({ name: "titleColor",       displayName: "Title Color",               value: { value: "#1a2b4a" } });
    titleFontSize    = new formattingSettings.NumUpDown    ({ name: "titleFontSize",    displayName: "Title Font Size (px)",      value: 22 });
    titleFontWeight  = new formattingSettings.ItemDropdown ({ name: "titleFontWeight",  displayName: "Title Font Weight",         value: { value: "700", displayName: "Bold" }, items: [
        { value: "400", displayName: "Regular"   },
        { value: "600", displayName: "Semi-Bold" },
        { value: "700", displayName: "Bold"      },
    ]});
    subtitleColor    = new formattingSettings.ColorPicker  ({ name: "subtitleColor",    displayName: "Subtitle Color",            value: { value: "#b8955a" } });
    subtitleFontSize = new formattingSettings.NumUpDown    ({ name: "subtitleFontSize", displayName: "Subtitle Font Size (px)",   value: 11 });
    letterSpacing    = new formattingSettings.NumUpDown    ({ name: "letterSpacing",    displayName: "Subtitle Letter Spacing",   value: 2 });
    descColor        = new formattingSettings.ColorPicker  ({ name: "descColor",        displayName: "Description Text Color",    value: { value: "#5a6a80" } });
    descFontSize     = new formattingSettings.NumUpDown    ({ name: "descFontSize",     displayName: "Description Font Size (px)",value: 13 });
    lineHeight       = new formattingSettings.NumUpDown    ({ name: "lineHeight",       displayName: "Line Height",               value: 1.65 });
    textAlign        = new formattingSettings.ItemDropdown ({ name: "textAlign",        displayName: "Text Alignment",            value: { value: "center", displayName: "Center" }, items: [
        { value: "left",   displayName: "Left"   },
        { value: "center", displayName: "Center" },
        { value: "right",  displayName: "Right"  },
    ]});

    slices = [
        this.backgroundColor, this.sectionSpacing,
        this.titleColor, this.titleFontSize, this.titleFontWeight,
        this.subtitleColor, this.subtitleFontSize, this.letterSpacing,
        this.descColor, this.descFontSize, this.lineHeight, this.textAlign,
    ];
}

// ─── 5. Chat Input ───────────────────────────────────────────────────────────

class ChatInputCard extends formattingSettings.SimpleCard {
    name        = "chatInput";
    displayName = "Chat Input";

    backgroundColor  = new formattingSettings.ColorPicker({ name: "backgroundColor",  displayName: "Background Color",  value: { value: "#ffffff" } });
    borderColor      = new formattingSettings.ColorPicker({ name: "borderColor",      displayName: "Border Color",      value: { value: "#d9d2c5" } });
    borderRadius     = new formattingSettings.NumUpDown  ({ name: "borderRadius",     displayName: "Border Radius (px)",value: 3 });
    placeholderColor = new formattingSettings.ColorPicker({ name: "placeholderColor", displayName: "Placeholder Color", value: { value: "#9aa3b0" } });
    padding          = new formattingSettings.NumUpDown  ({ name: "padding",          displayName: "Padding (px)",      value: 8 });

    slices = [this.backgroundColor, this.borderColor, this.borderRadius, this.placeholderColor, this.padding];
}

// ─── 6. Send Button ──────────────────────────────────────────────────────────

class SendButtonCard extends formattingSettings.SimpleCard {
    name        = "sendButton";
    displayName = "Send Button";

    backgroundColor = new formattingSettings.ColorPicker({ name: "backgroundColor", displayName: "Background Color",       value: { value: "#b8955a" } });
    iconColor       = new formattingSettings.ColorPicker({ name: "iconColor",       displayName: "Icon Color",             value: { value: "#ffffff" } });
    hoverBackground = new formattingSettings.ColorPicker({ name: "hoverBackground", displayName: "Hover Background Color", value: { value: "#a07840" } });
    borderRadius    = new formattingSettings.NumUpDown  ({ name: "borderRadius",    displayName: "Border Radius (px)",     value: 3 });
    width           = new formattingSettings.NumUpDown  ({ name: "width",           displayName: "Width (px)",             value: 30 });
    height          = new formattingSettings.NumUpDown  ({ name: "height",          displayName: "Height (px)",            value: 30 });

    slices = [this.backgroundColor, this.iconColor, this.hoverBackground, this.borderRadius, this.width, this.height];
}

// ─── 7. Shared Text Styling ───────────────────────────────────────────────────

const FONT_FAMILY_OPTIONS = [
    { value: "",              displayName: "Default (System)"  },
    { value: "Segoe UI",      displayName: "Segoe UI"          },
    { value: "Calibri",       displayName: "Calibri"           },
    { value: "Arial",         displayName: "Arial"             },
    { value: "Helvetica",     displayName: "Helvetica"         },
    { value: "Verdana",       displayName: "Verdana"           },
    { value: "Trebuchet MS",  displayName: "Trebuchet MS"      },
    { value: "Georgia",       displayName: "Georgia"           },
    { value: "Times New Roman", displayName: "Times New Roman" },
    { value: "Garamond",      displayName: "Garamond"          },
    { value: "Tahoma",        displayName: "Tahoma"            },
    { value: "Century Gothic", displayName: "Century Gothic"   },
    { value: "Gill Sans",     displayName: "Gill Sans"         },
];

class SharedTextStyleCard extends formattingSettings.SimpleCard {
    name        = "sharedTextStyle";
    displayName = "Shared Text Styling";

    fontFamily = new formattingSettings.ItemDropdown({ name: "fontFamily", displayName: "Font Family", value: { value: "", displayName: "Default (System)" }, items: FONT_FAMILY_OPTIONS });
    fontSize   = new formattingSettings.NumUpDown   ({ name: "fontSize",    displayName: "Font Size (px)", value: 13 });
    fontWeight = new formattingSettings.ItemDropdown({ name: "fontWeight",  displayName: "Font Weight",    value: { value: "400", displayName: "Regular" }, items: [
        { value: "300", displayName: "Light"     },
        { value: "400", displayName: "Regular"   },
        { value: "500", displayName: "Medium"    },
        { value: "600", displayName: "Semi-Bold" },
        { value: "700", displayName: "Bold"      },
    ]});

    slices = [this.fontFamily, this.fontSize, this.fontWeight];
}

// ─── 8. Input Section ────────────────────────────────────────────────────────

class InputSectionCard extends formattingSettings.SimpleCard {
    name        = "inputSection";
    displayName = "Input Section";

    fontColor       = new formattingSettings.ColorPicker({ name: "fontColor",       displayName: "Font Color",       value: { value: "#ffffff" } });
    backgroundColor = new formattingSettings.ColorPicker({ name: "backgroundColor", displayName: "Background Color", value: { value: "#1a2b4a" } });

    slices = [this.fontColor, this.backgroundColor];
}

// ─── 9. Response Section ─────────────────────────────────────────────────────

class ResponseSectionCard extends formattingSettings.SimpleCard {
    name        = "responseSection";
    displayName = "Response Section";

    fontColor       = new formattingSettings.ColorPicker({ name: "fontColor",       displayName: "Font Color",       value: { value: "#1a2b4a" } });
    backgroundColor = new formattingSettings.ColorPicker({ name: "backgroundColor", displayName: "Background Color", value: { value: "#ffffff" } });

    slices = [this.fontColor, this.backgroundColor];
}

// ─── 10. User Logo ───────────────────────────────────────────────────────────

class UserLogoCard extends formattingSettings.SimpleCard {
    name        = "userLogo";
    displayName = "User Avatar";

    backgroundColor = new formattingSettings.ColorPicker ({ name: "backgroundColor", displayName: "Background Color", value: { value: "#1a2b4a" } });
    textColor       = new formattingSettings.ColorPicker ({ name: "textColor",       displayName: "Text Color",       value: { value: "#b8955a" } });
    fontWeight      = new formattingSettings.ItemDropdown({ name: "fontWeight",      displayName: "Font Weight",      value: { value: "700", displayName: "Bold" }, items: [
        { value: "300", displayName: "Light"     },
        { value: "400", displayName: "Regular"   },
        { value: "500", displayName: "Medium"    },
        { value: "600", displayName: "Semi-Bold" },
        { value: "700", displayName: "Bold"      },
    ]});
    fontFamily      = new formattingSettings.ItemDropdown({ name: "fontFamily", displayName: "Font Family", value: { value: "", displayName: "Default (System)" }, items: [
        { value: "",              displayName: "Default (System)"  },
        { value: "Segoe UI",      displayName: "Segoe UI"          },
        { value: "Calibri",       displayName: "Calibri"           },
        { value: "Arial",         displayName: "Arial"             },
        { value: "Helvetica",     displayName: "Helvetica"         },
        { value: "Verdana",       displayName: "Verdana"           },
        { value: "Trebuchet MS",  displayName: "Trebuchet MS"      },
        { value: "Georgia",       displayName: "Georgia"           },
        { value: "Times New Roman", displayName: "Times New Roman" },
        { value: "Garamond",      displayName: "Garamond"          },
        { value: "Tahoma",        displayName: "Tahoma"            },
        { value: "Century Gothic", displayName: "Century Gothic"   },
        { value: "Gill Sans",     displayName: "Gill Sans"         },
    ]});

    slices = [this.backgroundColor, this.textColor, this.fontWeight, this.fontFamily];
}

// ─── 11. AI Logo ─────────────────────────────────────────────────────────────

class AiLogoCard extends formattingSettings.SimpleCard {
    name        = "aiLogo";
    displayName = "AI Response Avatar";

    backgroundColor = new formattingSettings.ColorPicker ({ name: "backgroundColor", displayName: "Background Color", value: { value: "#b8955a" } });
    textColor       = new formattingSettings.ColorPicker ({ name: "textColor",       displayName: "Text Color",       value: { value: "#ffffff" } });
    fontWeight      = new formattingSettings.ItemDropdown({ name: "fontWeight",      displayName: "Font Weight",      value: { value: "700", displayName: "Bold" }, items: [
        { value: "300", displayName: "Light"     },
        { value: "400", displayName: "Regular"   },
        { value: "500", displayName: "Medium"    },
        { value: "600", displayName: "Semi-Bold" },
        { value: "700", displayName: "Bold"      },
    ]});
    fontFamily      = new formattingSettings.ItemDropdown({ name: "fontFamily", displayName: "Font Family", value: { value: "", displayName: "Default (System)" }, items: [
        { value: "",              displayName: "Default (System)"  },
        { value: "Segoe UI",      displayName: "Segoe UI"          },
        { value: "Calibri",       displayName: "Calibri"           },
        { value: "Arial",         displayName: "Arial"             },
        { value: "Helvetica",     displayName: "Helvetica"         },
        { value: "Verdana",       displayName: "Verdana"           },
        { value: "Trebuchet MS",  displayName: "Trebuchet MS"      },
        { value: "Georgia",       displayName: "Georgia"           },
        { value: "Times New Roman", displayName: "Times New Roman" },
        { value: "Garamond",      displayName: "Garamond"          },
        { value: "Tahoma",        displayName: "Tahoma"            },
        { value: "Century Gothic", displayName: "Century Gothic"   },
        { value: "Gill Sans",     displayName: "Gill Sans"         },
    ]});

    slices = [this.backgroundColor, this.textColor, this.fontWeight, this.fontFamily];
}

// ─── Root model ───────────────────────────────────────────────────────────────

export class VisualFormattingSettingsModel extends formattingSettings.Model {
    aiConfig        = new AiConfigCard();
    header          = new HeaderCard();
    userSection     = new UserSectionCard();
    content         = new ContentCard();
    chatInput       = new ChatInputCard();
    sendButton      = new SendButtonCard();
    sharedTextStyle = new SharedTextStyleCard();
    inputSection    = new InputSectionCard();
    responseSection = new ResponseSectionCard();
    userLogo        = new UserLogoCard();
    aiLogo          = new AiLogoCard();

    cards = [
        this.aiConfig,
        this.header,
        this.userSection,
        this.content,
        this.chatInput,
        this.sendButton,
        this.sharedTextStyle,
        this.inputSection,
        this.responseSection,
        this.userLogo,
        this.aiLogo,
    ];
}

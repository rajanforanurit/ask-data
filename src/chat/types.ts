// ─── types.ts — shared interfaces and constants ──────────────────────────────

export const ASKDATA_API = "https://anuritchatbackend.vercel.app";
export const TOP_K                   = 6;
export const TEMPERATURE             = 0.6;
export const MAX_TOKENS              = 1024;
export const SESSION_VERIFY_INTERVAL = 5 * 60 * 1000;
export const STORAGE_KEY             = "askdata_pbiv_ai_config";

export type ProviderType = "anurit" | "openai" | "gemini" | "anthropic" | "custom";

export interface DetectedProvider {
    type:         ProviderType;
    label:        string;
    color:        string;
    defaultModel: string;
    modelOptions: string[];
    lockModel:    boolean;
    lockPrompt:   boolean;
}

export interface Session {
    endpointUrl:  string;
    apiKey:       string;
    modelName:    string;
    systemPrompt: string;
    providerType: ProviderType;
    clientId:     string;
    name:         string;
}

export interface Source {
    source_file?: string;
    score?:       number;
    preview?:     string;
}

export interface UIMessage {
    id:          string;
    role:        "user" | "assistant";
    content:     string;
    sources?:    Source[];
    timestamp:   Date;
    isTyping?:   boolean;
    tokenCount?: number;
}

export interface Conversation {
    _id:        string;
    title?:     string;
    updatedAt?: string;
    createdAt?: string;
}

export interface SavedConfig {
    endpointUrl:  string;
    apiKey:       string;
    modelName:    string;
    systemPrompt: string;
}

export const MODEL_LISTS: Record<ProviderType, string[]> = {
    anurit:    ["Ask Data MiniLLM"],
    openai:    ["gpt-4o-mini", "gpt-4o", "o3-mini", "gpt-4-turbo"],
    gemini:    ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-1.5-pro", "gemini-1.5-flash"],
    anthropic: ["claude-3-haiku-20240307", "claude-3-sonnet-20240229", "claude-3-opus-20240229", "claude-3.5-sonnet", "claude-3.5-haiku"],
    custom:    [],
};
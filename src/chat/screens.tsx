// ─── screens.tsx — full-page overlay screens ──────────────────────────────────

import { type FC } from "react";
import { detectProvider } from "./utils";

// ── Config gate ───────────────────────────────────────────────────────────────

interface ConfigGateProps {
    w:            number | string;
    h:            number | string;
    endpointUrl:  string;
    apiKey:       string;
    loading:      boolean;
    error:        string;
    onVerify:     () => void;
}

export const ConfigGateScreen: FC<ConfigGateProps> = ({ w, h, endpointUrl, apiKey, loading, error, onVerify }) => {
    const hasEndpoint = endpointUrl.trim().length > 0;
    const hasKey      = apiKey.trim().length > 0;
    const canVerify   = hasEndpoint && hasKey;
    const prov        = detectProvider(endpointUrl);

    return (
        <div className="askdata-visual" style={{ width:w, height:h, position:"relative" }}>
            <div style={{ position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",background:"var(--ac-bg)",padding:16 }}>
                <div style={{ width:400,maxWidth:"96%",background:"var(--ac-surface)",borderRadius:8,padding:"28px 26px",boxShadow:"0 8px 40px rgba(0,0,0,.13)",border:"1px solid var(--ac-border)",animation:"ac-cardIn .4s cubic-bezier(.16,1,.3,1) both" }}>

                    {/* Logo row */}
                    <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:22 }}>
                        <div style={{ width:32,height:32,background:"var(--ac-navy)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"var(--ac-serif)",fontSize:"1.1em",color:"var(--ac-gold)",fontWeight:700,borderRadius:4 }}>A</div>
                        <span style={{ fontFamily:"var(--ac-serif)",fontSize:"1.1em",fontWeight:700,color:"var(--ac-navy)" }}>Ask Data</span>
                        <span style={{ marginLeft:"auto",fontSize:".72em",color:"var(--ac-text3)",fontFamily:"var(--ac-mono)",letterSpacing:".04em" }}>v3</span>
                    </div>

                    {/* Instruction banner */}
                    <div style={{ background:"var(--ac-gold-light)",border:"1px solid var(--ac-gold-glow)",borderRadius:5,padding:"11px 13px",marginBottom:20,display:"flex",alignItems:"flex-start",gap:9 }}>
                        <span style={{ fontSize:"1.1em",flexShrink:0,marginTop:1 }}>⚙️</span>
                        <p style={{ margin:0,fontSize:".85em",color:"var(--ac-navy)",lineHeight:1.65,fontWeight:500 }}>
                            Configure your AI in the <strong>AI Configuration</strong> panel to begin.
                        </p>
                    </div>

                    {/* Endpoint status */}
                    <div style={{ marginBottom:14 }}>
                        <div style={{ fontSize:".78em",fontWeight:600,color:"var(--ac-text2)",letterSpacing:".05em",textTransform:"uppercase",marginBottom:6 }}>Endpoint</div>
                        {hasEndpoint ? (
                            <div style={{ display:"flex",alignItems:"center",gap:8,padding:"8px 12px",background:"rgba(39,174,96,.07)",border:"1px solid rgba(39,174,96,.25)",borderRadius:5 }}>
                                <span style={{ color:"var(--ac-green)" }}>✓</span>
                                <span style={{ fontSize:".82em",color:"var(--ac-text2)",fontFamily:"var(--ac-mono)",wordBreak:"break-all",flex:1 }}>{endpointUrl}</span>
                                <span style={{ fontSize:".76em",color:prov.color,fontWeight:600,flexShrink:0 }}>{prov.label}</span>
                            </div>
                        ) : (
                            <div style={{ display:"flex",alignItems:"center",gap:8,padding:"8px 12px",background:"rgba(192,57,43,.06)",border:"1px solid rgba(192,57,43,.2)",borderRadius:5 }}>
                                <span style={{ color:"var(--ac-red)" }}>✕</span>
                                <span style={{ fontSize:".88em",color:"var(--ac-red)",fontWeight:500 }}>No endpoint set</span>
                                <span style={{ fontSize:".76em",color:"var(--ac-text3)",marginLeft:"auto" }}>Set in Format Pane → AI Configuration</span>
                            </div>
                        )}
                    </div>

                    {/* API key status */}
                    <div style={{ marginBottom:16 }}>
                        <div style={{ fontSize:".78em",fontWeight:600,color:"var(--ac-text2)",letterSpacing:".05em",textTransform:"uppercase",marginBottom:6 }}>API Key</div>
                        {hasKey ? (
                            <div style={{ display:"flex",alignItems:"center",gap:8,padding:"8px 12px",background:"rgba(39,174,96,.07)",border:"1px solid rgba(39,174,96,.25)",borderRadius:5 }}>
                                <span style={{ color:"var(--ac-green)" }}>✓</span>
                                <span style={{ fontSize:".88em",color:"var(--ac-green)",fontWeight:500 }}>API key detected</span>
                            </div>
                        ) : (
                            <div style={{ display:"flex",alignItems:"center",gap:8,padding:"8px 12px",background:"rgba(192,57,43,.06)",border:"1px solid rgba(192,57,43,.2)",borderRadius:5 }}>
                                <span style={{ color:"var(--ac-red)" }}>✕</span>
                                <span style={{ fontSize:".88em",color:"var(--ac-red)",fontWeight:500 }}>No API key set</span>
                            </div>
                        )}
                    </div>

                    {/* Error */}
                    {error && (
                        <div style={{ fontSize:".85em",color:"var(--ac-red)",background:"rgba(192,57,43,.07)",border:"1px solid rgba(192,57,43,.2)",borderRadius:4,padding:"8px 11px",marginBottom:14,animation:"ac-shake .25s ease" }}>
                            {error}
                        </div>
                    )}

                    {/* CTA */}
                    <button
                        onClick={onVerify}
                        disabled={loading || !canVerify}
                        style={{ width:"100%",padding:"11px",background:loading||!canVerify?"var(--ac-border2)":prov.color,color:"#fff",border:"none",borderRadius:5,cursor:loading||!canVerify?"not-allowed":"pointer",fontSize:".9em",fontWeight:700,letterSpacing:".03em",transition:"background .15s",display:"flex",alignItems:"center",justifyContent:"center",gap:8 }}
                    >
                        {loading ? (
                            <>
                                <div style={{ width:14,height:14,borderRadius:"50%",border:"2px solid rgba(255,255,255,.4)",borderTopColor:"#fff",animation:"ac-spin .55s linear infinite" }} />
                                Verifying…
                            </>
                        ) : "Verify & Connect"}
                    </button>

                    {!canVerify && (
                        <p style={{ marginTop:10,fontSize:".74em",color:"var(--ac-text3)",lineHeight:1.5,textAlign:"center",margin:"10px 0 0" }}>
                            Set the API Endpoint URL and API Key in the Format Pane to enable chat.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

// ── Expired session ───────────────────────────────────────────────────────────

export const ExpiredScreen: FC<{ w: number|string; h: number|string; providerLabel: string }> = ({ w, h, providerLabel }) => (
    <div className="askdata-visual" style={{ width:w, height:h, position:"relative" }}>
        <div style={{ position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",background:"var(--ac-bg)" }}>
            <div style={{ width:340,maxWidth:"92%",background:"var(--ac-surface)",borderRadius:6,padding:"28px 26px",boxShadow:"0 8px 40px rgba(0,0,0,.12)",border:"1px solid var(--ac-border)",animation:"ac-cardIn .4s cubic-bezier(.16,1,.3,1) both" }}>
                <div style={{ fontFamily:"var(--ac-serif)",fontSize:"1.4em",fontWeight:700,color:"var(--ac-red)",marginBottom:10 }}>Session Expired</div>
                <p style={{ fontSize:".9em",color:"var(--ac-text2)",lineHeight:1.7 }}>
                    Your <strong>{providerLabel}</strong> API key has been revoked or expired.
                    Please update your API key in the <strong>Format Pane → AI Configuration</strong> and reload the report.
                </p>
            </div>
        </div>
    </div>
);
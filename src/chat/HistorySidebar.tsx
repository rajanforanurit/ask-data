import { useState } from "react";
import type { FC } from "react";
import type { Conversation } from "./types";
import { formatHistDate } from "./utils";
interface HistoryItemProps {
    conv:     Conversation;
    isActive: boolean;
    onOpen:   (id: string) => void;
    onRename: (id: string) => void;
    onDelete: (id: string) => void;
}
const HistoryItem: FC<HistoryItemProps> = ({ conv, isActive, onOpen, onRename, onDelete }) => {
    const [hovered, setHovered]             = useState(false);
    const [confirmingDelete, setConfirming] = useState(false);
    const date = formatHistDate(conv.updatedAt ?? conv.createdAt);

    function handleDeleteClick(e: React.MouseEvent) {
        e.stopPropagation();
        setConfirming(true);
    }

    function handleConfirmDelete(e: React.MouseEvent) {
        e.stopPropagation();
        setConfirming(false);
        onDelete(conv._id);
    }

    function handleCancelDelete(e: React.MouseEvent) {
        e.stopPropagation();
        setConfirming(false);
    }
    if (confirmingDelete) {
        return (
            <div
                style={{
                    display:       "flex",
                    alignItems:    "center",
                    justifyContent:"space-between",
                    borderRadius:  3,
                    background:    "#fff1f0",
                    border:        "1px solid #fca5a5",
                    padding:       "6px 8px",
                    gap:           6,
                }}
            >
                <span style={{ fontSize:".8em",color:"#b91c1c",fontFamily:"var(--ac-sans)",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>
                    Delete "{conv.title ?? "Untitled"}"?
                </span>
                <div style={{ display:"flex",gap:4,flexShrink:0 }}>
                    <button
                        onClick={handleConfirmDelete}
                        style={{ background:"#ef4444",border:"none",borderRadius:3,padding:"2px 8px",cursor:"pointer",fontSize:".75em",fontWeight:600,color:"#fff",fontFamily:"var(--ac-sans)" }}
                    >
                        Delete
                    </button>
                    <button
                        onClick={handleCancelDelete}
                        style={{ background:"none",border:"1px solid var(--ac-border2)",borderRadius:3,padding:"2px 7px",cursor:"pointer",fontSize:".75em",fontWeight:500,color:"var(--ac-text3)",fontFamily:"var(--ac-sans)" }}
                    >
                        Cancel
                    </button>
                </div>
            </div>
        );
    }
    return (
        <div
            onClick={() => onOpen(conv._id)}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => { setHovered(false); }}
            style={{ display:"flex",alignItems:"center",borderRadius:3,background:isActive?"var(--ac-gold-light)":hovered?"var(--ac-surface2)":"transparent",border:isActive?"1px solid var(--ac-gold-glow)":"1px solid transparent",cursor:"pointer",transition:"background .12s,border-color .12s" }}
        >
            <div style={{ flex:1,padding:"7px 8px",minWidth:0 }}>
                <div style={{ fontSize:".9em",fontWeight:isActive?600:500,color:isActive?"var(--ac-gold)":"var(--ac-text)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",marginBottom:2 }}>
                    {conv.title ?? "Untitled"}
                </div>
                <div style={{ fontSize:".75em",color:"var(--ac-text3)",fontFamily:"var(--ac-mono)" }}>{date}</div>
            </div>
            {hovered && (
                <div style={{ display:"flex",flexShrink:0,alignItems:"center",gap:1,paddingRight:4 }}>
                    <button
                        onClick={e => { e.stopPropagation(); onRename(conv._id); }}
                        style={{ background:"none",border:"none",cursor:"pointer",padding:"3px 4px",borderRadius:3,fontSize:".8em",color:"var(--ac-text3)" }}
                        title="Rename"
                    >✏️</button>
                    <button
                        onClick={handleDeleteClick}
                        style={{ background:"none",border:"none",cursor:"pointer",padding:"3px 4px",borderRadius:3,fontSize:".8em",color:"var(--ac-text3)",transition:"color .12s" }}
                        onMouseEnter={e => e.currentTarget.style.color="#ef4444"}
                        onMouseLeave={e => e.currentTarget.style.color="var(--ac-text3)"}
                        title="Delete"
                    >🗑️</button>
                </div>
            )}
        </div>
    );
};
interface HistorySidebarProps {
    open:           boolean;
    conversations:  Conversation[];
    activeConvId:   string | null;
    renaming:       { id: string; value: string } | null;
    onClose:        () => void;
    onNewChat:      () => void;
    onOpen:         (id: string) => void;
    onRename:       (id: string) => void;
    onDelete:       (id: string) => void;
    onRenameChange: (value: string) => void;
    onRenameCommit: (id: string, value: string) => void;
    onRenameCancel: () => void;
}

export const HistorySidebar: FC<HistorySidebarProps> = ({
    open, conversations, activeConvId, renaming,
    onClose, onNewChat, onOpen, onRename, onDelete,
    onRenameChange, onRenameCommit, onRenameCancel,
}) => (
    <div style={{ width:220,flexShrink:0,background:"var(--ac-surface)",borderRight:"1px solid var(--ac-border)",display:"flex",flexDirection:"column",overflow:"hidden",transform:open?"translateX(0)":"translateX(-100%)",position:"absolute",top:0,left:0,bottom:0,zIndex:10,transition:"transform .22s cubic-bezier(.16,1,.3,1)" }}>
        {/* Sidebar header */}
        <div style={{ padding:"12px 12px 10px",borderBottom:"1px solid var(--ac-border)",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0 }}>
            <span style={{ fontSize:".78em",fontWeight:600,letterSpacing:".1em",textTransform:"uppercase",color:"var(--ac-text3)" }}>Conversations</span>
            <div style={{ display:"flex",gap:4 }}>
                <button onClick={onNewChat}  style={{ display:"flex",alignItems:"center",gap:4,background:"none",border:"1px solid var(--ac-gold-glow)",borderRadius:3,padding:"3px 8px",cursor:"pointer",fontSize:".78em",fontWeight:600,color:"var(--ac-gold)",letterSpacing:".03em",textTransform:"uppercase" }}>+ New</button>
                <button onClick={onClose}    style={{ background:"none",border:"1px solid var(--ac-border2)",borderRadius:3,padding:"3px 8px",cursor:"pointer",fontSize:".78em",fontWeight:600,color:"var(--ac-text3)",letterSpacing:".03em",textTransform:"uppercase" }}>✕</button>
            </div>
        </div>
        <div style={{ flex:1,overflowY:"auto",padding:6,display:"flex",flexDirection:"column",gap:2 }}>
            {conversations.length === 0 ? (
                <div style={{ display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100%",padding:20,textAlign:"center" }}>
                    <p style={{ fontSize:".85em",color:"var(--ac-text3)",lineHeight:1.6 }}>No conversations yet.<br />Start asking to see history.</p>
                </div>
            ) : conversations.map(conv => (
                renaming?.id === conv._id ? (
                    <div key={conv._id} style={{ padding:"7px 8px" }}>
                        <input
                            autoFocus
                            value={renaming.value}
                            onChange={e => onRenameChange(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === "Enter")  onRenameCommit(conv._id, renaming.value);
                                if (e.key === "Escape") onRenameCancel();
                            }}
                            onBlur={() => setTimeout(() => onRenameCommit(conv._id, renaming?.value ?? ""), 150)}
                            style={{ width:"100%",background:"var(--ac-bg)",border:"1px solid var(--ac-gold)",borderRadius:3,padding:"3px 6px",color:"var(--ac-text)",fontFamily:"var(--ac-sans)",fontSize:".9em",fontWeight:500,outline:"none" }}
                        />
                    </div>
                ) : (
                    <HistoryItem
                        key={conv._id}
                        conv={conv}
                        isActive={conv._id === activeConvId}
                        onOpen={onOpen}
                        onRename={onRename}
                        onDelete={onDelete}
                    />
                )
            ))}
        </div>
    </div>
);

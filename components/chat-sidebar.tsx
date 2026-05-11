"use client"

import { cn } from "@/lib/utils"
import { PanelLeftClose, PanelLeft, Plus, Trash2, MessageSquare } from "lucide-react"

interface ChatHistory {
  id: string
  title: string
  timestamp: number
}

interface ChatSidebarProps {
  isOpen: boolean
  onToggle: () => void
  chatHistory: ChatHistory[]
  currentChatId: string | null
  onNewChat: () => void
  onSelectChat: (id: string) => void
  onDeleteChat: (id: string) => void
}

export function ChatSidebar({
  isOpen,
  onToggle,
  chatHistory,
  currentChatId,
  onNewChat,
  onSelectChat,
  onDeleteChat,
}: ChatSidebarProps) {
  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 h-full bg-card border-r border-border z-50 transition-all duration-300 ease-in-out flex flex-col",
          isOpen ? "w-64 translate-x-0" : "w-0 -translate-x-full lg:w-16 lg:translate-x-0"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          {isOpen && (
            <span className="text-sm font-medium tracking-wide uppercase text-muted-foreground">
              History
            </span>
          )}
          <button
            onClick={onToggle}
            className="p-2 hover:bg-secondary rounded-md transition-colors text-muted-foreground hover:text-foreground"
            aria-label={isOpen ? "Close sidebar" : "Open sidebar"}
          >
            {isOpen ? <PanelLeftClose size={18} /> : <PanelLeft size={18} />}
          </button>
        </div>

        {/* New Chat Button */}
        <div className="p-3">
          <button
            onClick={onNewChat}
            className={cn(
              "flex items-center gap-3 w-full p-3 rounded-md border border-border hover:bg-secondary transition-colors text-foreground",
              !isOpen && "justify-center"
            )}
          >
            <Plus size={18} />
            {isOpen && <span className="text-sm">New Chat</span>}
          </button>
        </div>

        {/* Chat History List */}
        {isOpen && (
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {chatHistory.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                No chat history yet
              </p>
            ) : (
              chatHistory.map((chat) => (
                <div
                  key={chat.id}
                  className={cn(
                    "group flex items-center gap-2 p-3 rounded-md cursor-pointer transition-colors",
                    currentChatId === chat.id
                      ? "bg-secondary text-foreground"
                      : "hover:bg-secondary/50 text-muted-foreground hover:text-foreground"
                  )}
                  onClick={() => onSelectChat(chat.id)}
                >
                  <MessageSquare size={14} className="shrink-0" />
                  <span className="text-sm truncate flex-1">{chat.title}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onDeleteChat(chat.id)
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/20 rounded transition-all text-muted-foreground hover:text-destructive"
                    aria-label="Delete chat"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </aside>
    </>
  )
}

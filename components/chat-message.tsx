"use client"

import { cn } from "@/lib/utils"
import { User, Bot } from "lucide-react"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: number
}

interface ChatMessageProps {
  message: Message
  isStreaming?: boolean
}

export function ChatMessage({ message, isStreaming }: ChatMessageProps) {
  const isUser = message.role === "user"

  return (
    <div
      className={cn(
        "flex gap-4 py-6 px-4 md:px-0",
        isUser ? "bg-transparent" : "bg-card/30"
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "shrink-0 w-8 h-8 rounded-sm flex items-center justify-center",
          isUser ? "bg-secondary" : "bg-primary"
        )}
      >
        {isUser ? (
          <User size={16} className="text-foreground" />
        ) : (
          <Bot size={16} className="text-primary-foreground" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {isUser ? "You" : "Grok"}
          </span>
          <span className="text-xs text-muted-foreground/50">
            {new Date(message.timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
        <div className="text-foreground leading-relaxed whitespace-pre-wrap break-words">
          {message.content}
          {isStreaming && (
            <span className="inline-block w-2 h-4 bg-primary ml-1 animate-pulse" />
          )}
        </div>
      </div>
    </div>
  )
}

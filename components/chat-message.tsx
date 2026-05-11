"use client"

import { cn } from "@/lib/utils"
import { User, Zap, Copy, Check, Download } from "lucide-react"
import { useState } from "react"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: number
  type?: "text" | "image"
  imageUrl?: string
}

interface ChatMessageProps {
  message: Message
  isStreaming?: boolean
}

export function ChatMessage({ message, isStreaming }: ChatMessageProps) {
  const [copied, setCopied] = useState(false)
  const isUser = message.role === "user"

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const downloadImage = () => {
    if (message.imageUrl) {
      const link = document.createElement("a")
      link.href = message.imageUrl
      link.download = `grok-image-${Date.now()}.png`
      link.click()
    }
  }

  return (
    <div
      className={cn(
        "px-4 py-6 border-b border-border/50",
        isUser ? "bg-background" : "bg-card/50"
      )}
    >
      <div className="max-w-3xl mx-auto flex gap-4">
        {/* Avatar */}
        <div
          className={cn(
            "w-8 h-8 rounded-md flex items-center justify-center shrink-0",
            isUser ? "bg-secondary" : "bg-primary"
          )}
        >
          {isUser ? (
            <User size={16} className="text-foreground" />
          ) : (
            <Zap size={16} className="text-primary-foreground" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium">
              {isUser ? "You" : "Grok"}
            </span>
            <span className="text-xs text-muted-foreground">
              {new Date(message.timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>

          {/* Image content */}
          {message.type === "image" && message.imageUrl && (
            <div className="mb-3">
              <img
                src={message.imageUrl}
                alt="Generated image"
                className="max-w-full rounded-md border border-border"
                style={{ maxHeight: "400px" }}
              />
              <button
                onClick={downloadImage}
                className="mt-2 flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground bg-secondary rounded-md transition-colors"
              >
                <Download size={12} />
                Download
              </button>
            </div>
          )}

          {/* Text content */}
          <div className="text-sm leading-relaxed whitespace-pre-wrap break-words text-foreground/90">
            {message.content}
            {isStreaming && (
              <span className="inline-block w-2 h-4 ml-1 bg-primary animate-pulse" />
            )}
          </div>

          {/* Actions */}
          {!isUser && !isStreaming && message.content && (
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={copyToClipboard}
                className="flex items-center gap-1.5 px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {copied ? (
                  <>
                    <Check size={12} />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy size={12} />
                    Copy
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

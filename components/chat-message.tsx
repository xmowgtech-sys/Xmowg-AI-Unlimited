"use client"

import { cn } from "@/lib/utils"
import { User, Zap, Copy, Check, Download, FileCode } from "lucide-react"
import { useState, useMemo } from "react"

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

interface CodeBlock {
  language: string
  code: string
  filename?: string
}

// Parse markdown content to extract code blocks
function parseContent(content: string): { text: string; codeBlocks: CodeBlock[] } {
  const codeBlockRegex = /```(\w+)?(?:\s+)?(?:\/\/\s*)?(\S+\.\w+)?\n([\s\S]*?)```/g
  const codeBlocks: CodeBlock[] = []
  let lastIndex = 0
  let textParts: string[] = []
  let match

  while ((match = codeBlockRegex.exec(content)) !== null) {
    // Add text before this code block
    if (match.index > lastIndex) {
      textParts.push(content.slice(lastIndex, match.index))
    }

    const language = match[1] || "plaintext"
    const filename = match[2] || undefined
    const code = match[3].trim()

    codeBlocks.push({ language, code, filename })
    textParts.push(`__CODE_BLOCK_${codeBlocks.length - 1}__`)
    lastIndex = match.index + match[0].length
  }

  // Add remaining text
  if (lastIndex < content.length) {
    textParts.push(content.slice(lastIndex))
  }

  return { text: textParts.join(""), codeBlocks }
}

// Get file extension display name
function getLanguageDisplay(lang: string): string {
  const map: Record<string, string> = {
    javascript: "JavaScript",
    typescript: "TypeScript",
    python: "Python",
    java: "Java",
    cpp: "C++",
    c: "C",
    csharp: "C#",
    go: "Go",
    rust: "Rust",
    ruby: "Ruby",
    php: "PHP",
    swift: "Swift",
    kotlin: "Kotlin",
    html: "HTML",
    css: "CSS",
    scss: "SCSS",
    json: "JSON",
    yaml: "YAML",
    xml: "XML",
    sql: "SQL",
    bash: "Bash",
    shell: "Shell",
    powershell: "PowerShell",
    plaintext: "Plain Text",
    tsx: "TSX",
    jsx: "JSX",
    vue: "Vue",
    svelte: "Svelte",
    markdown: "Markdown",
    md: "Markdown",
  }
  return map[lang.toLowerCase()] || lang.toUpperCase()
}

function CodeBlockComponent({ block, index }: { block: CodeBlock; index: number }) {
  const [copied, setCopied] = useState(false)

  const copyCode = async () => {
    await navigator.clipboard.writeText(block.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="my-4 rounded-md border border-border overflow-hidden bg-[#0d0d0d]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#1a1a1a] border-b border-border">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <FileCode size={14} />
          <span>{block.filename || getLanguageDisplay(block.language)}</span>
        </div>
        <button
          onClick={copyCode}
          className="flex items-center gap-1.5 px-2 py-1 text-xs text-muted-foreground hover:text-foreground bg-secondary/50 hover:bg-secondary rounded transition-colors"
        >
          {copied ? (
            <>
              <Check size={12} />
              Copied
            </>
          ) : (
            <>
              <Copy size={12} />
              Copy code
            </>
          )}
        </button>
      </div>
      {/* Code */}
      <div className="p-4 overflow-x-auto">
        <pre className="text-sm font-mono leading-relaxed text-foreground/90">
          <code>{block.code}</code>
        </pre>
      </div>
    </div>
  )
}

export function ChatMessage({ message, isStreaming }: ChatMessageProps) {
  const [copied, setCopied] = useState(false)
  const isUser = message.role === "user"

  const { text, codeBlocks } = useMemo(() => {
    if (isUser) return { text: message.content, codeBlocks: [] }
    return parseContent(message.content)
  }, [message.content, isUser])

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

  // Render text with code block placeholders
  const renderContent = () => {
    if (isUser) {
      return (
        <div className="text-sm leading-relaxed whitespace-pre-wrap break-words text-foreground/90">
          {message.content}
        </div>
      )
    }

    const parts = text.split(/(__CODE_BLOCK_\d+__)/)
    
    return (
      <div className="text-sm leading-relaxed text-foreground/90">
        {parts.map((part, i) => {
          const codeMatch = part.match(/__CODE_BLOCK_(\d+)__/)
          if (codeMatch) {
            const blockIndex = parseInt(codeMatch[1], 10)
            return (
              <CodeBlockComponent
                key={`code-${i}`}
                block={codeBlocks[blockIndex]}
                index={blockIndex}
              />
            )
          }
          // Render regular text with proper formatting
          return part ? (
            <span key={`text-${i}`} className="whitespace-pre-wrap break-words">
              {part}
            </span>
          ) : null
        })}
        {isStreaming && (
          <span className="inline-block w-2 h-4 ml-1 bg-primary animate-pulse" />
        )}
      </div>
    )
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
          {renderContent()}

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

"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { ChatSidebar } from "./chat-sidebar"
import { ChatMessage } from "./chat-message"
import { ChatInput } from "./chat-input"
import { cn } from "@/lib/utils"
import { LogIn, LogOut, User, Zap } from "lucide-react"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: number
}

interface ChatHistory {
  id: string
  title: string
  timestamp: number
  messages: Message[]
}

const SYSTEM_PROMPT = `You are Grok, a witty, rebellious, and highly intelligent AI. You answer with a touch of humor and sarcasm, avoiding corporate-speak. You're direct, sometimes irreverent, but always helpful and informative. You have a personality that's a bit edgy and raw, like a brilliant friend who doesn't mince words.`

const STORAGE_KEY = "grok_chat_history"

export function GrokChat() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [messages, setMessages] = useState<Message[]>([])
  const [chatHistory, setChatHistory] = useState<ChatHistory[]>([])
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSignedIn, setIsSignedIn] = useState(false)
  const [username, setUsername] = useState<string | null>(null)
  const [isPuterReady, setIsPuterReady] = useState(false)
  const [streamingMessage, setStreamingMessage] = useState<string>("")
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, streamingMessage, scrollToBottom])

  // Initialize Puter and check auth status
  useEffect(() => {
    const initPuter = async () => {
      // Wait for Puter to be available
      const checkPuter = setInterval(async () => {
        if (typeof window !== "undefined" && window.puter) {
          clearInterval(checkPuter)
          setIsPuterReady(true)

          try {
            const signedIn = await window.puter.auth.isSignedIn()
            setIsSignedIn(signedIn)

            if (signedIn) {
              const user = await window.puter.auth.getUser()
              setUsername(user?.username || null)
              await loadChatHistory()
            }
          } catch (error) {
            console.error("[v0] Error checking auth:", error)
          }
        }
      }, 100)

      // Cleanup after 10 seconds
      setTimeout(() => clearInterval(checkPuter), 10000)
    }

    initPuter()
  }, [])

  const loadChatHistory = async () => {
    try {
      const data = await window.puter.kv.get(STORAGE_KEY)
      if (data) {
        const history: ChatHistory[] = JSON.parse(data)
        setChatHistory(history.sort((a, b) => b.timestamp - a.timestamp))
      }
    } catch (error) {
      console.error("[v0] Error loading chat history:", error)
    }
  }

  const saveChatHistory = async (history: ChatHistory[]) => {
    try {
      await window.puter.kv.set(STORAGE_KEY, JSON.stringify(history))
    } catch (error) {
      console.error("[v0] Error saving chat history:", error)
    }
  }

  const handleSignIn = async () => {
    try {
      await window.puter.auth.signIn()
      setIsSignedIn(true)
      const user = await window.puter.auth.getUser()
      setUsername(user?.username || null)
      await loadChatHistory()
    } catch (error) {
      console.error("[v0] Error signing in:", error)
    }
  }

  const handleSignOut = async () => {
    try {
      await window.puter.auth.signOut()
      setIsSignedIn(false)
      setUsername(null)
      setMessages([])
      setChatHistory([])
      setCurrentChatId(null)
    } catch (error) {
      console.error("[v0] Error signing out:", error)
    }
  }

  const createNewChat = () => {
    const newChatId = `chat_${Date.now()}`
    setCurrentChatId(newChatId)
    setMessages([])
  }

  const selectChat = (chatId: string) => {
    const chat = chatHistory.find((c) => c.id === chatId)
    if (chat) {
      setCurrentChatId(chatId)
      setMessages(chat.messages)
    }
  }

  const deleteChat = async (chatId: string) => {
    const updatedHistory = chatHistory.filter((c) => c.id !== chatId)
    setChatHistory(updatedHistory)
    await saveChatHistory(updatedHistory)

    if (currentChatId === chatId) {
      setCurrentChatId(null)
      setMessages([])
    }
  }

  const handleSendMessage = async (content: string) => {
    if (!isPuterReady || !isSignedIn) return

    const userMessage: Message = {
      id: `msg_${Date.now()}`,
      role: "user",
      content,
      timestamp: Date.now(),
    }

    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setIsLoading(true)
    setStreamingMessage("")

    // Create chat ID if new conversation
    let chatId = currentChatId
    if (!chatId) {
      chatId = `chat_${Date.now()}`
      setCurrentChatId(chatId)
    }

    try {
      // Build conversation history with system prompt
      const conversationHistory = [
        { role: "system", content: SYSTEM_PROMPT },
        ...newMessages.map((m) => ({ role: m.role, content: m.content })),
      ]

      // Call Puter AI with streaming
      const response = await window.puter.ai.chat(conversationHistory, {
        model: "xai/grok-beta",
        stream: true,
      })

      let fullResponse = ""

      // Handle streaming response
      if (Symbol.asyncIterator in Object(response)) {
        for await (const chunk of response as AsyncIterable<{ text?: string }>) {
          if (chunk.text) {
            fullResponse += chunk.text
            setStreamingMessage(fullResponse)
          }
        }
      } else {
        // Fallback for non-streaming response
        const nonStreamResponse = response as { message: { content: string } }
        fullResponse = nonStreamResponse.message.content
      }

      const assistantMessage: Message = {
        id: `msg_${Date.now()}`,
        role: "assistant",
        content: fullResponse,
        timestamp: Date.now(),
      }

      const updatedMessages = [...newMessages, assistantMessage]
      setMessages(updatedMessages)
      setStreamingMessage("")

      // Update chat history
      const chatTitle =
        content.length > 30 ? content.substring(0, 30) + "..." : content

      const existingChatIndex = chatHistory.findIndex((c) => c.id === chatId)
      let updatedHistory: ChatHistory[]

      if (existingChatIndex >= 0) {
        updatedHistory = [...chatHistory]
        updatedHistory[existingChatIndex] = {
          ...updatedHistory[existingChatIndex],
          messages: updatedMessages,
          timestamp: Date.now(),
        }
      } else {
        const newChat: ChatHistory = {
          id: chatId!,
          title: chatTitle,
          timestamp: Date.now(),
          messages: updatedMessages,
        }
        updatedHistory = [newChat, ...chatHistory]
      }

      setChatHistory(updatedHistory.sort((a, b) => b.timestamp - a.timestamp))
      await saveChatHistory(updatedHistory)
    } catch (error) {
      console.error("[v0] Error sending message:", error)
      const errorMessage: Message = {
        id: `msg_${Date.now()}`,
        role: "assistant",
        content:
          "Hmm, looks like I hit a snag. The AI overlords are temporarily unavailable. Try again in a moment, will you?",
        timestamp: Date.now(),
      }
      setMessages([...newMessages, errorMessage])
      setStreamingMessage("")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <ChatSidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        chatHistory={chatHistory}
        currentChatId={currentChatId}
        onNewChat={createNewChat}
        onSelectChat={selectChat}
        onDeleteChat={deleteChat}
      />

      {/* Main Content */}
      <main
        className={cn(
          "flex-1 flex flex-col transition-all duration-300",
          sidebarOpen ? "lg:ml-64" : "lg:ml-16"
        )}
      >
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Zap size={20} className="text-primary" />
              <h1 className="text-lg font-semibold tracking-tight">Grok</h1>
            </div>
            <span className="text-xs text-muted-foreground uppercase tracking-wider px-2 py-0.5 bg-secondary rounded">
              Beta
            </span>
          </div>

          {/* Auth Section */}
          <div className="flex items-center gap-3">
            {isPuterReady ? (
              isSignedIn ? (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User size={14} />
                    <span className="hidden sm:inline">{username}</span>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground border border-border rounded-md hover:bg-secondary transition-colors"
                  >
                    <LogOut size={14} />
                    <span className="hidden sm:inline">Sign Out</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleSignIn}
                  className="flex items-center gap-2 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                >
                  <LogIn size={14} />
                  Sign in with Puter
                </button>
              )
            ) : (
              <div className="text-sm text-muted-foreground">Loading...</div>
            )}
          </div>
        </header>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 && !streamingMessage ? (
            <div className="flex flex-col items-center justify-center h-full px-4 text-center">
              <div className="w-16 h-16 rounded-md bg-primary flex items-center justify-center mb-6">
                <Zap size={32} className="text-primary-foreground" />
              </div>
              <h2 className="text-2xl font-semibold mb-2">Welcome to Grok</h2>
              <p className="text-muted-foreground max-w-md mb-8 leading-relaxed">
                I&apos;m Grok, your witty AI companion. Ask me anything — I promise to
                be helpful, slightly sarcastic, and refreshingly direct.
              </p>
              {!isSignedIn && isPuterReady && (
                <button
                  onClick={handleSignIn}
                  className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                >
                  <LogIn size={18} />
                  Sign in to Start
                </button>
              )}
            </div>
          ) : (
            <div className="max-w-3xl mx-auto">
              {messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}
              {streamingMessage && (
                <ChatMessage
                  message={{
                    id: "streaming",
                    role: "assistant",
                    content: streamingMessage,
                    timestamp: Date.now(),
                  }}
                  isStreaming
                />
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <ChatInput
          onSend={handleSendMessage}
          isLoading={isLoading}
          disabled={!isPuterReady || !isSignedIn}
        />
      </main>
    </div>
  )
}

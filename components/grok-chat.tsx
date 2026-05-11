"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { ChatSidebar } from "./chat-sidebar"
import { ChatMessage } from "./chat-message"
import { ChatInput } from "./chat-input"
import { cn } from "@/lib/utils"
import {
  LogIn,
  LogOut,
  User,
  Zap,
  ChevronDown,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Share2,
  Settings,
  HelpCircle,
  X,
  Trash2,
  MessageSquare,
  Image as ImageIcon,
  Code,
} from "lucide-react"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: number
  type?: "text" | "image"
  imageUrl?: string
}

interface ChatHistory {
  id: string
  title: string
  timestamp: number
  messages: Message[]
}

interface UserProfile {
  traits: string[]
  preferences: string[]
  lastUpdated: number
}

const MODELS = [
  { id: "x-ai/grok-beta", name: "Grok Beta", provider: "xAI" },
  { id: "meta-llama/llama-3.1-70b-instruct", name: "Llama 3.1 70B", provider: "Meta" },
  { id: "openai/gpt-4o-mini", name: "GPT-4o Mini", provider: "OpenAI" },
  { id: "google/gemini-2.0-flash", name: "Gemini 2.0 Flash", provider: "Google" },
]

const MODES = [
  { id: "chat", name: "Chat", icon: MessageSquare },
  { id: "image", name: "Image", icon: ImageIcon },
  { id: "code", name: "Code", icon: Code },
]

const BASE_SYSTEM_PROMPT = `You are Grok, a witty, rebellious, and highly intelligent AI. You answer with a touch of humor and sarcasm, avoiding corporate-speak. You're direct, sometimes irreverent, but always helpful and informative. You have a personality that's a bit edgy and raw, like a brilliant friend who doesn't mince words.`

const CODE_SYSTEM_PROMPT = `You are Grok, a witty coding assistant. You write clean, efficient code with helpful comments. You explain your code clearly and suggest improvements. You're direct about trade-offs and best practices.`

const STORAGE_KEY = "grok_chat_history"
const PROFILE_KEY = "grok_user_profile"

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

  // New state for advanced features
  const [selectedModel, setSelectedModel] = useState(MODELS[0])
  const [selectedMode, setSelectedMode] = useState(MODES[0])
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isTTSEnabled, setIsTTSEnabled] = useState(false)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [messageCount, setMessageCount] = useState(0)
  const [generatedImage, setGeneratedImage] = useState<string | null>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, streamingMessage, scrollToBottom])

  // Initialize Puter and check auth status
  useEffect(() => {
    const initPuter = async () => {
      const checkPuter = setInterval(async () => {
        if (typeof window !== "undefined" && window.puter) {
          clearInterval(checkPuter)
          setIsPuterReady(true)
          console.log("[v0] Puter initialized")

          try {
            const signedIn = await window.puter.auth.isSignedIn()
            setIsSignedIn(signedIn)

            if (signedIn) {
              const user = await window.puter.auth.getUser()
              setUsername(user?.username || null)
              await loadChatHistory()
              await loadUserProfile()
            }
          } catch (error) {
            console.error("[v0] Error checking auth:", error)
          }
        }
      }, 100)

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

  const loadUserProfile = async () => {
    try {
      const data = await window.puter.kv.get(PROFILE_KEY)
      if (data) {
        setUserProfile(JSON.parse(data))
      }
    } catch (error) {
      console.error("[v0] Error loading user profile:", error)
    }
  }

  const saveUserProfile = async (profile: UserProfile) => {
    try {
      await window.puter.kv.set(PROFILE_KEY, JSON.stringify(profile))
      setUserProfile(profile)
    } catch (error) {
      console.error("[v0] Error saving user profile:", error)
    }
  }

  const saveChatHistory = async (history: ChatHistory[]) => {
    try {
      await window.puter.kv.set(STORAGE_KEY, JSON.stringify(history))
    } catch (error) {
      console.error("[v0] Error saving chat history:", error)
    }
  }

  // Generate chat title using AI
  const generateChatTitle = async (msgs: Message[]): Promise<string> => {
    if (msgs.length < 2) return msgs[0]?.content.substring(0, 30) + "..."

    try {
      const response = await window.puter.ai.chat(
        [
          {
            role: "system",
            content: "Generate a 3-word title for this conversation. Only respond with the title, nothing else.",
          },
          {
            role: "user",
            content: `First message: "${msgs[0].content}"\nSecond message: "${msgs[1].content}"`,
          },
        ],
        { model: "openai/gpt-4o-mini" }
      )
      
      const title = response?.message?.content || msgs[0].content.substring(0, 30)
      return title.substring(0, 40)
    } catch {
      return msgs[0].content.substring(0, 30) + "..."
    }
  }

  // Analyze user traits every 5 messages
  const analyzeUserTraits = async (msgs: Message[]) => {
    if (msgs.length % 5 !== 0 || msgs.length === 0) return

    try {
      const userMessages = msgs.filter((m) => m.role === "user").map((m) => m.content)
      const response = await window.puter.ai.chat(
        [
          {
            role: "system",
            content:
              "Analyze these user messages and extract 3-5 key traits, interests, or preferences. Respond with a JSON array of strings only.",
          },
          { role: "user", content: userMessages.join("\n") },
        ],
        { model: "openai/gpt-4o-mini" }
      )

      const content = response?.message?.content || "[]"
      const traits = JSON.parse(content.replace(/```json\n?|\n?```/g, ""))

      const newProfile: UserProfile = {
        traits: [...new Set([...(userProfile?.traits || []), ...traits])].slice(-10),
        preferences: userProfile?.preferences || [],
        lastUpdated: Date.now(),
      }

      await saveUserProfile(newProfile)
      console.log("[v0] User profile updated:", newProfile)
    } catch (error) {
      console.error("[v0] Error analyzing traits:", error)
    }
  }

  const handleSignIn = async () => {
    try {
      await window.puter.auth.signIn()
      setIsSignedIn(true)
      const user = await window.puter.auth.getUser()
      setUsername(user?.username || null)
      await loadChatHistory()
      await loadUserProfile()
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
      setUserProfile(null)
    } catch (error) {
      console.error("[v0] Error signing out:", error)
    }
  }

  const createNewChat = () => {
    const newChatId = `chat_${Date.now()}`
    setCurrentChatId(newChatId)
    setMessages([])
    setGeneratedImage(null)
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

  // Voice input using speech recognition
  const toggleVoiceInput = () => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      alert("Speech recognition not supported in this browser")
      return
    }

    if (isListening) {
      setIsListening(false)
      return
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = false

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript
      handleSendMessage(transcript)
    }

    recognition.onerror = () => setIsListening(false)
    recognition.onend = () => setIsListening(false)

    setIsListening(true)
    recognition.start()
  }

  // Text-to-speech for responses
  const speakText = async (text: string) => {
    if (!isTTSEnabled) return

    try {
      const audio = await window.puter.ai.txt2speech(text)
      audio.play()
    } catch (error) {
      console.error("[v0] TTS error:", error)
      // Fallback to browser TTS
      const utterance = new SpeechSynthesisUtterance(text)
      speechSynthesis.speak(utterance)
    }
  }

  // Image generation
  const generateImage = async (prompt: string) => {
    setIsLoading(true)
    try {
      const result = await window.puter.ai.txt2img(prompt)
      if (result?.src) {
        setGeneratedImage(result.src)
        return result.src
      }
    } catch (error) {
      console.error("[v0] Image generation error:", error)
    } finally {
      setIsLoading(false)
    }
    return null
  }

  // Share chat
  const shareChat = async () => {
    if (!currentChatId || messages.length === 0) return

    try {
      const shareKey = `share_${currentChatId}`
      const shareData = {
        messages,
        createdAt: Date.now(),
        model: selectedModel.name,
      }
      await window.puter.kv.set(shareKey, JSON.stringify(shareData))

      const shareUrl = `${window.location.origin}?share=${shareKey}`
      await navigator.clipboard.writeText(shareUrl)
      alert("Share link copied to clipboard!")
    } catch (error) {
      console.error("[v0] Error sharing:", error)
    }
  }

  const clearMemory = async () => {
    try {
      await window.puter.kv.del(PROFILE_KEY)
      setUserProfile(null)
      alert("Memory cleared!")
    } catch (error) {
      console.error("[v0] Error clearing memory:", error)
    }
  }

  const handleSendMessage = async (content: string) => {
    if (!isPuterReady) return

    // Handle image mode
    if (selectedMode.id === "image") {
      const userMessage: Message = {
        id: `msg_${Date.now()}`,
        role: "user",
        content,
        timestamp: Date.now(),
        type: "text",
      }
      setMessages((prev) => [...prev, userMessage])
      setIsLoading(true)

      const imageUrl = await generateImage(content)
      
      const assistantMessage: Message = {
        id: `msg_${Date.now()}`,
        role: "assistant",
        content: imageUrl ? "Here's your generated image:" : "Failed to generate image. Please try again.",
        timestamp: Date.now(),
        type: imageUrl ? "image" : "text",
        imageUrl: imageUrl || undefined,
      }
      setMessages((prev) => [...prev, assistantMessage])
      setIsLoading(false)
      return
    }

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
    setMessageCount((c) => c + 1)

    let chatId = currentChatId
    if (!chatId) {
      chatId = `chat_${Date.now()}`
      setCurrentChatId(chatId)
    }

    try {
      // Build system prompt with user profile
      let systemPrompt = selectedMode.id === "code" ? CODE_SYSTEM_PROMPT : BASE_SYSTEM_PROMPT

      if (userProfile && userProfile.traits.length > 0) {
        systemPrompt += `\n\nUser Context: This user has shown interest in: ${userProfile.traits.join(", ")}. Tailor your responses accordingly.`
      }

      const conversationHistory = [
        { role: "system", content: systemPrompt },
        ...newMessages.map((m) => ({ role: m.role, content: m.content })),
      ]

      console.log("[v0] Calling puter.ai.chat with model:", selectedModel.id)

      const response = await window.puter.ai.chat(conversationHistory, {
        model: selectedModel.id,
        stream: true,
      })

      let fullResponse = ""

      if (Symbol.asyncIterator in Object(response)) {
        for await (const chunk of response as AsyncIterable<{ text?: string }>) {
          if (chunk.text) {
            fullResponse += chunk.text
            setStreamingMessage(fullResponse)
          }
        }
      } else {
        const nonStreamResponse = response as { message?: { content: string } }
        fullResponse = nonStreamResponse.message?.content || ""
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

      // Speak the response if TTS is enabled
      if (isTTSEnabled && fullResponse) {
        speakText(fullResponse)
      }

      // Analyze traits every 5 messages
      if (isSignedIn) {
        analyzeUserTraits(updatedMessages)
      }

      // Update chat history
      if (isSignedIn) {
        const chatTitle =
          updatedMessages.length === 2
            ? await generateChatTitle(updatedMessages)
            : chatHistory.find((c) => c.id === chatId)?.title ||
              content.substring(0, 30) + "..."

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
      }
    } catch (error) {
      console.error("[v0] Error sending message:", error)
      const errorMessage: Message = {
        id: `msg_${Date.now()}`,
        role: "assistant",
        content: "Hmm, looks like I hit a snag. Try again in a moment.",
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
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Zap size={20} className="text-primary" />
              <h1 className="text-lg font-semibold tracking-tight">Grok</h1>
            </div>

            {/* Model Selector */}
            <div className="relative">
              <button
                onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-secondary rounded-md hover:bg-secondary/80 transition-colors"
              >
                <span className="text-muted-foreground">{selectedModel.provider}/</span>
                <span>{selectedModel.name}</span>
                <ChevronDown size={14} />
              </button>

              {modelDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-56 bg-card border border-border rounded-md shadow-lg z-50">
                  {MODELS.map((model) => (
                    <button
                      key={model.id}
                      onClick={() => {
                        setSelectedModel(model)
                        setModelDropdownOpen(false)
                      }}
                      className={cn(
                        "w-full px-4 py-2 text-left text-sm hover:bg-secondary transition-colors",
                        selectedModel.id === model.id && "bg-secondary"
                      )}
                    >
                      <span className="text-muted-foreground">{model.provider}/</span>
                      <span>{model.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Mode Toggler */}
            <div className="flex items-center bg-secondary rounded-md p-0.5">
              {MODES.map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => setSelectedMode(mode)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 text-sm rounded transition-colors",
                    selectedMode.id === mode.id
                      ? "bg-background text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <mode.icon size={14} />
                  <span className="hidden sm:inline">{mode.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            {/* Voice Controls */}
            <button
              onClick={toggleVoiceInput}
              className={cn(
                "p-2 rounded-md transition-colors",
                isListening
                  ? "bg-destructive text-destructive-foreground"
                  : "hover:bg-secondary text-muted-foreground hover:text-foreground"
              )}
              title="Voice input"
            >
              {isListening ? <MicOff size={18} /> : <Mic size={18} />}
            </button>

            <button
              onClick={() => setIsTTSEnabled(!isTTSEnabled)}
              className={cn(
                "p-2 rounded-md transition-colors",
                isTTSEnabled
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-secondary text-muted-foreground hover:text-foreground"
              )}
              title="Text-to-speech"
            >
              {isTTSEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>

            {/* Share */}
            <button
              onClick={shareChat}
              className="p-2 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              title="Share chat"
            >
              <Share2 size={18} />
            </button>

            {/* Settings */}
            <button
              onClick={() => setSettingsOpen(true)}
              className="p-2 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              title="Settings"
            >
              <Settings size={18} />
            </button>

            {/* Auth */}
            {isPuterReady ? (
              isSignedIn ? (
                <div className="flex items-center gap-2 ml-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User size={14} />
                    <span className="hidden sm:inline">{username}</span>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="p-2 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                    title="Sign out"
                  >
                    <LogOut size={14} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleSignIn}
                  className="flex items-center gap-2 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                >
                  <LogIn size={14} />
                  <span className="hidden sm:inline">Sign in</span>
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
              <p className="text-muted-foreground max-w-md mb-4 leading-relaxed">
                I&apos;m Grok, your witty AI companion. Ask me anything — I promise to
                be helpful, slightly sarcastic, and refreshingly direct.
              </p>
              <div className="flex flex-wrap gap-2 justify-center text-xs text-muted-foreground">
                <span className="px-2 py-1 bg-secondary rounded">{selectedModel.name}</span>
                <span className="px-2 py-1 bg-secondary rounded">{selectedMode.name} Mode</span>
                {userProfile && (
                  <span className="px-2 py-1 bg-secondary rounded">Memory Active</span>
                )}
              </div>
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
          disabled={!isPuterReady}
          placeholder={
            selectedMode.id === "image"
              ? "Describe the image you want to generate..."
              : selectedMode.id === "code"
              ? "Ask me to write some code..."
              : "Message Grok..."
          }
        />
      </main>

      {/* Settings Panel */}
      {settingsOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-lg w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-lg font-semibold">Settings</h2>
              <button
                onClick={() => setSettingsOpen(false)}
                className="p-2 hover:bg-secondary rounded-md transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-4 space-y-4">
              {/* Memory Section */}
              <div>
                <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <User size={14} />
                  User Memory
                </h3>
                {userProfile ? (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                      Learned traits: {userProfile.traits.join(", ") || "None yet"}
                    </p>
                    <button
                      onClick={clearMemory}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                    >
                      <Trash2 size={14} />
                      Clear Memory
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Sign in to enable adaptive learning
                  </p>
                )}
              </div>

              {/* Help Section */}
              <div>
                <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <HelpCircle size={14} />
                  Help
                </h3>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>• Switch models using the dropdown in the header</p>
                  <p>• Use Image mode to generate images with AI</p>
                  <p>• Click the mic icon for voice input</p>
                  <p>• Enable speaker icon for text-to-speech responses</p>
                  <p>• The AI learns your preferences over time</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

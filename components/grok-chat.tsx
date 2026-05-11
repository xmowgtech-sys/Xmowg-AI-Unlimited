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
  Square,
  FileText,
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
  mode: "chat" | "image" | "code"
}

interface UserProfile {
  traits: string[]
  preferences: string[]
  lastUpdated: number
}

// Chat models
const CHAT_MODELS = [
  { id: "x-ai/grok-4-1-fast", name: "Grok 4.1 Fast", provider: "xAI" },
  { id: "x-ai/grok-beta", name: "Grok Beta", provider: "xAI" },
  { id: "openai/gpt-4o-mini", name: "GPT-4o Mini", provider: "OpenAI" },
  { id: "anthropic/claude-sonnet-4", name: "Claude Sonnet 4", provider: "Anthropic" },
  { id: "google/gemini-2.0-flash", name: "Gemini 2.0 Flash", provider: "Google" },
  { id: "meta-llama/llama-3.1-70b-instruct", name: "Llama 3.1 70B", provider: "Meta" },
]

// Image models - using correct Puter provider/model format
const IMAGE_MODELS = [
  { id: "grok-2-image", name: "Grok 2 Image", provider: "xai", puterProvider: "xai" },
  { id: "gpt-image-1-mini", name: "GPT Image Mini", provider: "OpenAI", puterProvider: "openai-image-generation" },
  { id: "dall-e-3", name: "DALL-E 3", provider: "OpenAI", puterProvider: "openai-image-generation" },
  { id: "black-forest-labs/flux-schnell", name: "FLUX Schnell", provider: "Replicate", puterProvider: "replicate-image-generation" },
]

// Code models
const CODE_MODELS = [
  { id: "x-ai/grok-code-fast-1", name: "Grok Code Fast", provider: "xAI" },
  { id: "x-ai/grok-4-1-fast", name: "Grok 4.1 Fast", provider: "xAI" },
  { id: "anthropic/claude-sonnet-4", name: "Claude Sonnet 4", provider: "Anthropic" },
  { id: "openai/gpt-4o-mini", name: "GPT-4o Mini", provider: "OpenAI" },
]

const MODES = [
  { id: "chat", name: "Chat", icon: MessageSquare },
  { id: "image", name: "Image", icon: ImageIcon },
  { id: "code", name: "Code", icon: Code },
] as const

type Mode = typeof MODES[number]["id"]

const BASE_SYSTEM_PROMPT = `You are Grok, a witty, rebellious, and highly intelligent AI. You answer with a touch of humor and sarcasm, avoiding corporate-speak. You're direct, sometimes irreverent, but always helpful and informative. You have a personality that's a bit edgy and raw, like a brilliant friend who doesn't mince words.`

const CODE_SYSTEM_PROMPT = `You are Grok, a witty coding assistant. You write clean, efficient code with helpful comments. You explain your code clearly and suggest improvements. You're direct about trade-offs and best practices. Always wrap code in proper markdown code blocks with language specification.`

const STORAGE_KEYS = {
  chat: "grok_chat_history",
  image: "grok_image_history", 
  code: "grok_code_history",
}
const PROFILE_KEY = "grok_user_profile"
const INSTRUCTIONS_KEY = "grok_custom_instructions"

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
  const abortControllerRef = useRef<AbortController | null>(null)

  // Mode and model state
  const [selectedMode, setSelectedMode] = useState<Mode>("chat")
  const [chatModel, setChatModel] = useState(CHAT_MODELS[0])
  const [imageModel, setImageModel] = useState(IMAGE_MODELS[0])
  const [codeModel, setCodeModel] = useState(CODE_MODELS[0])
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false)

  // Features state
  const [isListening, setIsListening] = useState(false)
  const [isTTSEnabled, setIsTTSEnabled] = useState(false)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [customInstructions, setCustomInstructions] = useState("")
  const [instructionsInput, setInstructionsInput] = useState("")

  const getCurrentModel = useCallback(() => {
    switch (selectedMode) {
      case "image": return imageModel
      case "code": return codeModel
      default: return chatModel
    }
  }, [selectedMode, chatModel, imageModel, codeModel])

  const getModelsForMode = useCallback(() => {
    switch (selectedMode) {
      case "image": return IMAGE_MODELS
      case "code": return CODE_MODELS
      default: return CHAT_MODELS
    }
  }, [selectedMode])

  const setModelForMode = useCallback((model: typeof CHAT_MODELS[0]) => {
    switch (selectedMode) {
      case "image": setImageModel(model); break
      case "code": setCodeModel(model); break
      default: setChatModel(model)
    }
  }, [selectedMode])

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, streamingMessage, scrollToBottom])

  // Initialize Puter
  useEffect(() => {
    const initPuter = async () => {
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
              await loadChatHistory("chat")
              await loadUserProfile()
              await loadCustomInstructions()
            }
          } catch (error) {
            console.error("Error checking auth:", error)
          }
        }
      }, 100)

      setTimeout(() => clearInterval(checkPuter), 10000)
    }

    initPuter()
  }, [])

  // Load chat history when mode changes
  useEffect(() => {
    if (isSignedIn && isPuterReady) {
      loadChatHistory(selectedMode)
      setMessages([])
      setCurrentChatId(null)
    }
  }, [selectedMode, isSignedIn, isPuterReady])

  const loadChatHistory = async (mode: Mode) => {
    try {
      const data = await window.puter.kv.get(STORAGE_KEYS[mode])
      if (data) {
        const history: ChatHistory[] = JSON.parse(data)
        setChatHistory(history.sort((a, b) => b.timestamp - a.timestamp))
      } else {
        setChatHistory([])
      }
    } catch (error) {
      console.error("Error loading chat history:", error)
      setChatHistory([])
    }
  }

  const loadUserProfile = async () => {
    try {
      const data = await window.puter.kv.get(PROFILE_KEY)
      if (data) {
        setUserProfile(JSON.parse(data))
      }
    } catch (error) {
      console.error("Error loading user profile:", error)
    }
  }

  const loadCustomInstructions = async () => {
    try {
      const data = await window.puter.kv.get(INSTRUCTIONS_KEY)
      if (data) {
        setCustomInstructions(data)
        setInstructionsInput(data)
      }
    } catch (error) {
      console.error("Error loading instructions:", error)
    }
  }

  const saveCustomInstructions = async () => {
    try {
      await window.puter.kv.set(INSTRUCTIONS_KEY, instructionsInput)
      setCustomInstructions(instructionsInput)
    } catch (error) {
      console.error("Error saving instructions:", error)
    }
  }

  const saveUserProfile = async (profile: UserProfile) => {
    try {
      await window.puter.kv.set(PROFILE_KEY, JSON.stringify(profile))
      setUserProfile(profile)
    } catch (error) {
      console.error("Error saving user profile:", error)
    }
  }

  const saveChatHistory = async (history: ChatHistory[], mode: Mode) => {
    try {
      await window.puter.kv.set(STORAGE_KEYS[mode], JSON.stringify(history))
    } catch (error) {
      console.error("Error saving chat history:", error)
    }
  }

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
    } catch (error) {
      console.error("Error analyzing traits:", error)
    }
  }

  const handleSignIn = async () => {
    try {
      await window.puter.auth.signIn()
      setIsSignedIn(true)
      const user = await window.puter.auth.getUser()
      setUsername(user?.username || null)
      await loadChatHistory(selectedMode)
      await loadUserProfile()
      await loadCustomInstructions()
    } catch (error) {
      console.error("Error signing in:", error)
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
      console.error("Error signing out:", error)
    }
  }

  const createNewChat = () => {
    setCurrentChatId(null)
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
    await saveChatHistory(updatedHistory, selectedMode)

    if (currentChatId === chatId) {
      setCurrentChatId(null)
      setMessages([])
    }
  }

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

  const speakText = async (text: string) => {
    if (!isTTSEnabled) return

    try {
      const audio = await window.puter.ai.txt2speech(text)
      audio.play()
    } catch {
      const utterance = new SpeechSynthesisUtterance(text)
      speechSynthesis.speak(utterance)
    }
  }

  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setIsLoading(false)
    
    // Save the partial response if any
    if (streamingMessage) {
      const assistantMessage: Message = {
        id: `msg_${Date.now()}`,
        role: "assistant",
        content: streamingMessage + " [stopped]",
        timestamp: Date.now(),
      }
      setMessages((prev) => [...prev, assistantMessage])
      setStreamingMessage("")
    }
  }

  const shareChat = async () => {
    if (!currentChatId || messages.length === 0) return

    try {
      const shareKey = `share_${currentChatId}`
      const shareData = {
        messages,
        createdAt: Date.now(),
        model: getCurrentModel().name,
        mode: selectedMode,
      }
      await window.puter.kv.set(shareKey, JSON.stringify(shareData))

      const shareUrl = `${window.location.origin}?share=${shareKey}`
      await navigator.clipboard.writeText(shareUrl)
      alert("Share link copied to clipboard!")
    } catch (error) {
      console.error("Error sharing:", error)
    }
  }

  const clearMemory = async () => {
    try {
      await window.puter.kv.del(PROFILE_KEY)
      setUserProfile(null)
    } catch (error) {
      console.error("Error clearing memory:", error)
    }
  }

  const handleSendMessage = async (content: string) => {
    if (!isPuterReady || !content.trim()) return

    const userMessage: Message = {
      id: `msg_${Date.now()}`,
      role: "user",
      content,
      timestamp: Date.now(),
      type: "text",
    }

    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setIsLoading(true)
    setStreamingMessage("")

    let chatId = currentChatId
    if (!chatId) {
      chatId = `${selectedMode}_${Date.now()}`
      setCurrentChatId(chatId)
    }

    // Handle image mode
    if (selectedMode === "image") {
      try {
        let imageElement: HTMLImageElement

        // Use proper Puter API format based on provider
        if (imageModel.puterProvider === "xai") {
          imageElement = await window.puter.ai.txt2img({
            prompt: content,
            provider: "xai",
          })
        } else if (imageModel.puterProvider === "openai-image-generation") {
          imageElement = await window.puter.ai.txt2img({
            prompt: content,
            provider: "openai-image-generation",
            model: imageModel.id,
          })
        } else if (imageModel.puterProvider === "replicate-image-generation") {
          imageElement = await window.puter.ai.txt2img({
            prompt: content,
            provider: "replicate-image-generation",
            model: imageModel.id,
          })
        } else {
          // Fallback to simple call
          imageElement = await window.puter.ai.txt2img(content)
        }

        console.log("[v0] Image element received:", imageElement)

        const imageUrl = imageElement?.src || ""

        const assistantMessage: Message = {
          id: `msg_${Date.now()}`,
          role: "assistant",
          content: imageUrl ? "Here's your generated image:" : "Failed to generate image. Please try again.",
          timestamp: Date.now(),
          type: imageUrl ? "image" : "text",
          imageUrl: imageUrl || undefined,
        }
        
        const updatedMessages = [...newMessages, assistantMessage]
        setMessages(updatedMessages)

        // Save to history
        if (isSignedIn) {
          const chatTitle = content.length > 30 ? content.substring(0, 30) + "..." : content
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
              mode: selectedMode,
            }
            updatedHistory = [newChat, ...chatHistory]
          }

          setChatHistory(updatedHistory.sort((a, b) => b.timestamp - a.timestamp))
          await saveChatHistory(updatedHistory, selectedMode)
        }
      } catch (error) {
        console.error("Image generation error:", error)
        const errorMessage: Message = {
          id: `msg_${Date.now()}`,
          role: "assistant",
          content: "Failed to generate image. Please try a different prompt or model.",
          timestamp: Date.now(),
          type: "text",
        }
        setMessages([...newMessages, errorMessage])
      } finally {
        setIsLoading(false)
      }
      return
    }

    // Handle chat and code modes
    try {
      abortControllerRef.current = new AbortController()

      let systemPrompt = selectedMode === "code" ? CODE_SYSTEM_PROMPT : BASE_SYSTEM_PROMPT

      // Add custom instructions
      if (customInstructions) {
        systemPrompt += `\n\nUser's Custom Instructions:\n${customInstructions}`
      }

      // Add user profile context
      if (userProfile && userProfile.traits.length > 0) {
        systemPrompt += `\n\nUser Context: This user has shown interest in: ${userProfile.traits.join(", ")}. Tailor your responses accordingly.`
      }

      const conversationHistory = [
        { role: "system", content: systemPrompt },
        ...newMessages.map((m) => ({ role: m.role, content: m.content })),
      ]

      const model = selectedMode === "code" ? codeModel.id : chatModel.id

      const response = await window.puter.ai.chat(conversationHistory, {
        model,
        stream: true,
      })

      let fullResponse = ""

      if (Symbol.asyncIterator in Object(response)) {
        for await (const chunk of response as AsyncIterable<{ text?: string }>) {
          if (abortControllerRef.current?.signal.aborted) {
            break
          }
          if (chunk.text) {
            fullResponse += chunk.text
            setStreamingMessage(fullResponse)
          }
        }
      } else {
        const nonStreamResponse = response as { message?: { content: string } }
        fullResponse = nonStreamResponse.message?.content || ""
      }

      if (!abortControllerRef.current?.signal.aborted) {
        const assistantMessage: Message = {
          id: `msg_${Date.now()}`,
          role: "assistant",
          content: fullResponse,
          timestamp: Date.now(),
        }

        const updatedMessages = [...newMessages, assistantMessage]
        setMessages(updatedMessages)
        setStreamingMessage("")

        if (isTTSEnabled && fullResponse) {
          speakText(fullResponse)
        }

        if (isSignedIn) {
          analyzeUserTraits(updatedMessages)

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
              mode: selectedMode,
            }
            updatedHistory = [newChat, ...chatHistory]
          }

          setChatHistory(updatedHistory.sort((a, b) => b.timestamp - a.timestamp))
          await saveChatHistory(updatedHistory, selectedMode)
        }
      }
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        console.error("Error sending message:", error)
        const errorMessage: Message = {
          id: `msg_${Date.now()}`,
          role: "assistant",
          content: "Something went wrong. Please try again.",
          timestamp: Date.now(),
        }
        setMessages([...newMessages, errorMessage])
        setStreamingMessage("")
      }
    } finally {
      setIsLoading(false)
      abortControllerRef.current = null
    }
  }

  const currentModel = getCurrentModel()
  const modelsForMode = getModelsForMode()

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
                <span className="text-muted-foreground hidden sm:inline">{currentModel.provider}/</span>
                <span>{currentModel.name}</span>
                <ChevronDown size={14} />
              </button>

              {modelDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-64 bg-card border border-border rounded-md shadow-lg z-50">
                  {modelsForMode.map((model) => (
                    <button
                      key={model.id}
                      onClick={() => {
                        setModelForMode(model)
                        setModelDropdownOpen(false)
                      }}
                      className={cn(
                        "w-full px-4 py-2 text-left text-sm hover:bg-secondary transition-colors",
                        currentModel.id === model.id && "bg-secondary"
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
                  onClick={() => setSelectedMode(mode.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 text-sm rounded transition-colors",
                    selectedMode === mode.id
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

            <button
              onClick={shareChat}
              className="p-2 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              title="Share chat"
            >
              <Share2 size={18} />
            </button>

            <button
              onClick={() => setSettingsOpen(true)}
              className="p-2 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              title="Settings"
            >
              <Settings size={18} />
            </button>

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
                {selectedMode === "image" ? (
                  <ImageIcon size={32} className="text-primary-foreground" />
                ) : selectedMode === "code" ? (
                  <Code size={32} className="text-primary-foreground" />
                ) : (
                  <Zap size={32} className="text-primary-foreground" />
                )}
              </div>
              <h2 className="text-2xl font-semibold mb-2">
                {selectedMode === "image"
                  ? "Image Generation"
                  : selectedMode === "code"
                  ? "Code Assistant"
                  : "Welcome to Grok"}
              </h2>
              <p className="text-muted-foreground max-w-md mb-4 leading-relaxed">
                {selectedMode === "image"
                  ? "Describe the image you want to create and I'll generate it for you."
                  : selectedMode === "code"
                  ? "Ask me to write, explain, or debug any code. I'm here to help."
                  : "I'm Grok, your witty AI companion. Ask me anything."}
              </p>
              <div className="flex flex-wrap gap-2 justify-center text-xs text-muted-foreground">
                <span className="px-2 py-1 bg-secondary rounded">{currentModel.name}</span>
                <span className="px-2 py-1 bg-secondary rounded capitalize">{selectedMode} Mode</span>
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
              {isLoading && !streamingMessage && (
                <div className="px-6 py-4">
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                    <span className="text-sm">
                      {selectedMode === "image" ? "Generating image..." : "Grok is thinking..."}
                    </span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input with Stop Button */}
        <div className="border-t border-border bg-background/95 backdrop-blur-sm">
          <div className="max-w-3xl mx-auto px-4 py-4">
            {isLoading ? (
              <button
                onClick={stopGeneration}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 transition-colors"
              >
                <Square size={16} fill="currentColor" />
                Stop generating
              </button>
            ) : (
              <ChatInput
                onSend={handleSendMessage}
                isLoading={isLoading}
                disabled={!isPuterReady}
                placeholder={
                  selectedMode === "image"
                    ? "Describe the image you want to generate..."
                    : selectedMode === "code"
                    ? "Ask me to write some code..."
                    : "Message Grok..."
                }
              />
            )}
          </div>
        </div>
      </main>

      {/* Settings Panel */}
      {settingsOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-lg w-full max-w-lg max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-card">
              <h2 className="text-lg font-semibold">Settings</h2>
              <button
                onClick={() => setSettingsOpen(false)}
                className="p-2 hover:bg-secondary rounded-md transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-4 space-y-6">
              {/* Custom Instructions */}
              <div>
                <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <FileText size={14} />
                  Custom Instructions
                </h3>
                <p className="text-xs text-muted-foreground mb-2">
                  Add custom instructions that Grok will follow in every conversation.
                </p>
                <textarea
                  value={instructionsInput}
                  onChange={(e) => setInstructionsInput(e.target.value)}
                  placeholder="e.g., Always respond in a concise manner. Prefer Python for code examples."
                  className="w-full h-24 px-3 py-2 text-sm bg-input border border-border rounded-md resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <button
                  onClick={saveCustomInstructions}
                  className="mt-2 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                >
                  Save Instructions
                </button>
              </div>

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
                    {isSignedIn ? "Memory will build as you chat" : "Sign in to enable adaptive learning"}
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
                  <p>• <strong>Chat Mode:</strong> General conversation with AI</p>
                  <p>• <strong>Image Mode:</strong> Generate images from descriptions</p>
                  <p>• <strong>Code Mode:</strong> Programming assistance</p>
                  <p>• Click the mic icon for voice input</p>
                  <p>• Enable speaker icon for text-to-speech</p>
                  <p>• Each mode has its own chat history</p>
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

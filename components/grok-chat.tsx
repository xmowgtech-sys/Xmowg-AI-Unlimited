"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { ChatSidebar } from "./chat-sidebar"
import { ChatMessage } from "./chat-message"
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
  Pause,
  FileText,
  Plus,
  Send,
  Paperclip,
  Play,
  Phone,
  PhoneOff,
  Sparkles,
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

// Chat models - Extended with latest Puter models
const CHAT_MODELS = [
  { id: "x-ai/grok-4.3", name: "Grok 4.3", provider: "xAI", badge: "Latest" },
  { id: "x-ai/grok-4.20-multi-agent", name: "Grok Multi-Agent", provider: "xAI", badge: "Pro" },
  { id: "x-ai/grok-4-1-fast", name: "Grok 4.1 Fast", provider: "xAI", badge: "Fast" },
  { id: "x-ai/grok-4-1-fast-non-reasoning", name: "Grok 4.1 Non-Reasoning", provider: "xAI" },
  { id: "x-ai/grok-4", name: "Grok 4", provider: "xAI", badge: "Deep Research" },
  { id: "x-ai/grok-4-fast", name: "Grok 4 Fast", provider: "xAI" },
  { id: "openai/gpt-5.2-pro", name: "GPT-5.2 Pro", provider: "OpenAI", badge: "Thinking" },
  { id: "openai/gpt-5.2", name: "GPT-5.2", provider: "OpenAI" },
  { id: "openai/gpt-5-mini", name: "GPT-5 Mini", provider: "OpenAI", badge: "Fast" },
  { id: "anthropic/claude-opus-4-6", name: "Claude Opus 4.6", provider: "Anthropic", badge: "Pro" },
  { id: "anthropic/claude-sonnet-4-6", name: "Claude Sonnet 4.6", provider: "Anthropic" },
  { id: "google/gemini-3-pro-preview", name: "Gemini 3 Pro", provider: "Google", badge: "Thinking" },
  { id: "google/gemini-3-flash-preview", name: "Gemini 3 Flash", provider: "Google", badge: "Fast" },
  { id: "deepseek/deepseek-v3.2", name: "DeepSeek V3.2", provider: "DeepSeek" },
  { id: "qwen/qwen3-max-thinking", name: "Qwen3 Max Thinking", provider: "Qwen", badge: "Thinking" },
]

// Image models - using correct Puter txt2img API format
const IMAGE_MODELS = [
  { id: "grok-2-image", name: "Grok 2 Image", provider: "xAI", badge: "New" },
  { id: "openai/gpt-image-1.5", name: "GPT Image 1.5", provider: "OpenAI", badge: "Best" },
  { id: "openai/gpt-image-1-mini", name: "GPT Image Mini", provider: "OpenAI", badge: "Fast" },
  { id: "google/gemini-3-pro-image-preview", name: "Gemini 3 Pro Image", provider: "Google" },
  { id: "google/imagen-4.0-ultra", name: "Imagen 4 Ultra", provider: "Google", badge: "Pro" },
  { id: "black-forest-labs/flux.2-klein-9b", name: "FLUX.2 Klein 9B", provider: "Black Forest" },
  { id: "black-forest-labs/flux.2-klein-4b", name: "FLUX.2 Klein 4B", provider: "Black Forest", badge: "Fast" },
  { id: "bytedance-seed/seedream-4.0", name: "Seedream 4.0", provider: "ByteDance" },
]

// Code models
const CODE_MODELS = [
  { id: "x-ai/grok-code-fast-1", name: "Grok Code Fast", provider: "xAI", badge: "Fast" },
  { id: "x-ai/grok-4.3", name: "Grok 4.3", provider: "xAI", badge: "Latest" },
  { id: "openai/gpt-5.2-codex", name: "GPT-5.2 Codex", provider: "OpenAI", badge: "Pro" },
  { id: "openai/gpt-5.1-codex-max", name: "GPT-5.1 Codex Max", provider: "OpenAI" },
  { id: "anthropic/claude-opus-4-6", name: "Claude Opus 4.6", provider: "Anthropic" },
  { id: "qwen/qwen3-coder-plus", name: "Qwen3 Coder Plus", provider: "Qwen" },
  { id: "mistralai/devstral-2512", name: "Devstral 2", provider: "Mistral", badge: "Open" },
]

const MODES = [
  { id: "chat", name: "Chat", icon: MessageSquare },
  { id: "image", name: "Image", icon: ImageIcon },
  { id: "code", name: "Code", icon: Code },
  { id: "voice", name: "Voice", icon: Mic },
] as const

// Voice options for TTS
const VOICE_OPTIONS = [
  { id: "eve", name: "Eve", gender: "female", description: "Warm & friendly" },
  { id: "asteria", name: "Asteria", gender: "female", description: "Professional" },
  { id: "luna", name: "Luna", gender: "female", description: "Calm & soothing" },
  { id: "charon", name: "Charon", gender: "male", description: "Deep & authoritative" },
  { id: "glinda", name: "Glinda", gender: "female", description: "Cheerful & bright" },
  { id: "puck", name: "Puck", gender: "male", description: "Energetic & playful" },
  { id: "kore", name: "Kore", gender: "female", description: "Soft & gentle" },
  { id: "fenrir", name: "Fenrir", gender: "male", description: "Bold & confident" },
]

type Mode = typeof MODES[number]["id"]

const BASE_SYSTEM_PROMPT = `You are Xmowg AI, a witty, rebellious, and highly intelligent AI assistant. You answer with a touch of humor and sarcasm, avoiding corporate-speak. You're direct, sometimes irreverent, but always helpful and informative. You have a personality that's a bit edgy and raw, like a brilliant friend who doesn't mince words. You're powered by cutting-edge AI models and love to push boundaries.`

const CODE_SYSTEM_PROMPT = `You are Xmowg AI, a witty coding assistant. You write clean, efficient code with helpful comments. You explain your code clearly and suggest improvements. You're direct about trade-offs and best practices. Always wrap code in proper markdown code blocks with language specification.`

const VOICE_SYSTEM_PROMPT = `You are Xmowg AI in voice chat mode. Keep your responses conversational, concise, and natural - like you're having a real-time conversation. Avoid long paragraphs and use natural speech patterns. Be warm, engaging, and responsive.`

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
  const [inputValue, setInputValue] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
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
  
  // Voice chat state
  const [selectedVoice, setSelectedVoice] = useState(VOICE_OPTIONS[0])
  const [isVoiceChatActive, setIsVoiceChatActive] = useState(false)
  const [voiceDropdownOpen, setVoiceDropdownOpen] = useState(false)
  const [isPlayingAudio, setIsPlayingAudio] = useState(false)
  
  // File upload state
  const [attachedFiles, setAttachedFiles] = useState<File[]>([])
  const [previewUrls, setPreviewUrls] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`
    }
  }, [inputValue])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setModelDropdownOpen(false)
    if (modelDropdownOpen) {
      document.addEventListener("click", handleClickOutside)
      return () => document.removeEventListener("click", handleClickOutside)
    }
  }, [modelDropdownOpen])

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
    if (!isTTSEnabled && selectedMode !== "voice") return

    try {
      setIsPlayingAudio(true)
      const audio = await window.puter.ai.txt2speech(text, {
        provider: "xai",
        voice: selectedVoice.id,
        output_format: "mp3"
      })
      audio.onended = () => setIsPlayingAudio(false)
      audio.play()
    } catch {
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.onend = () => setIsPlayingAudio(false)
      speechSynthesis.speak(utterance)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    
    const validFiles: File[] = []
    const urls: string[] = []
    
    Array.from(files).forEach(file => {
      if (file.type.startsWith("image/") || file.type.startsWith("video/")) {
        validFiles.push(file)
        urls.push(URL.createObjectURL(file))
      }
    })
    
    setAttachedFiles(prev => [...prev, ...validFiles])
    setPreviewUrls(prev => [...prev, ...urls])
  }

  const removeFile = (index: number) => {
    URL.revokeObjectURL(previewUrls[index])
    setAttachedFiles(prev => prev.filter((_, i) => i !== index))
    setPreviewUrls(prev => prev.filter((_, i) => i !== index))
  }

  const clearFiles = () => {
    previewUrls.forEach(url => URL.revokeObjectURL(url))
    setAttachedFiles([])
    setPreviewUrls([])
  }

  const startVoiceChat = () => {
    setIsVoiceChatActive(true)
    setIsTTSEnabled(true)
    toggleVoiceInput()
  }

  const endVoiceChat = () => {
    setIsVoiceChatActive(false)
    setIsListening(false)
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

    // Save user message to chat history immediately before AI responds
    if (isSignedIn) {
      const chatTitle = content.length > 30 ? content.substring(0, 30) + "..." : content
      const existingChatIndex = chatHistory.findIndex((c) => c.id === chatId)
      let updatedHistory: ChatHistory[]

      if (existingChatIndex >= 0) {
        updatedHistory = [...chatHistory]
        updatedHistory[existingChatIndex] = {
          ...updatedHistory[existingChatIndex],
          messages: newMessages,
          timestamp: Date.now(),
        }
      } else {
        const newChat: ChatHistory = {
          id: chatId!,
          title: chatTitle,
          timestamp: Date.now(),
          messages: newMessages,
          mode: selectedMode,
        }
        updatedHistory = [newChat, ...chatHistory]
      }

      setChatHistory(updatedHistory.sort((a, b) => b.timestamp - a.timestamp))
      await saveChatHistory(updatedHistory, selectedMode)
    }

    // Handle image mode
    if (selectedMode === "image") {
      try {
        // Use correct Puter txt2img API format from docs
        const imageElement = await window.puter.ai.txt2img(content, { model: imageModel.id })

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

        // Save assistant message to history
        if (isSignedIn) {
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
            const chatTitle = content.length > 30 ? content.substring(0, 30) + "..." : content
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
        selectedMode={selectedMode}
        onModeChange={setSelectedMode}
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
            <div className="flex items-center gap-2 group">
              <div className="relative">
                <Sparkles size={20} className="text-primary animate-pulse" />
                <div className="absolute inset-0 bg-primary/20 blur-md rounded-full animate-ping" style={{ animationDuration: "2s" }} />
              </div>
              <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-primary via-purple-500 to-primary bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">
                Xmowg AI
              </h1>
            </div>

            {/* Current Mode Indicator */}
            <div className="flex items-center gap-2 px-3 py-1.5 text-sm bg-secondary rounded-md transition-all duration-300 hover:bg-secondary/80 hover:scale-105">
              {selectedMode === "voice" ? (
                <Phone size={14} className={isVoiceChatActive ? "animate-bounce text-green-500" : ""} />
              ) : selectedMode === "image" ? (
                <ImageIcon size={14} />
              ) : selectedMode === "code" ? (
                <Code size={14} />
              ) : (
                <MessageSquare size={14} />
              )}
              <span className="capitalize">{selectedMode}</span>
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
              <h2 className="text-2xl font-semibold mb-2 animate-float">
                {selectedMode === "voice"
                  ? "Voice Chat"
                  : selectedMode === "image"
                  ? "Image Generation"
                  : selectedMode === "code"
                  ? "Code Assistant"
                  : "Welcome to Xmowg AI"}
              </h2>
              <p className="text-muted-foreground max-w-md mb-4 leading-relaxed">
                {selectedMode === "voice"
                  ? "Start a voice conversation with me. Choose your preferred voice style and let's talk!"
                  : selectedMode === "image"
                  ? "Describe the image you want to create and I'll generate it for you."
                  : selectedMode === "code"
                  ? "Ask me to write, explain, or debug any code. I'm here to help."
                  : "I'm Xmowg AI, your witty AI companion. Ask me anything."}
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
                      {selectedMode === "image" ? "Generating image..." : selectedMode === "voice" ? "Listening..." : "Xmowg is thinking..."}
                    </span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input with Model Selector and Pause Button */}
        <div className="border-t border-border bg-background/95 backdrop-blur-sm">
          <div className="max-w-3xl mx-auto px-4 py-4">
            {/* File preview section */}
            {previewUrls.length > 0 && (
              <div className="flex gap-2 mb-3 flex-wrap">
                {previewUrls.map((url, index) => (
                  <div key={index} className="relative group">
                    {attachedFiles[index]?.type.startsWith("video/") ? (
                      <video src={url} className="w-20 h-20 object-cover rounded-md border border-border" />
                    ) : (
                      <img src={url} alt="Preview" className="w-20 h-20 object-cover rounded-md border border-border" />
                    )}
                    <button
                      onClick={() => removeFile(index)}
                      className="absolute -top-2 -right-2 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            {/* Voice mode special UI */}
            {selectedMode === "voice" ? (
              <div className="flex flex-col items-center gap-4 py-8">
                {/* Voice selector */}
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setVoiceDropdownOpen(!voiceDropdownOpen)
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-secondary rounded-md hover:bg-secondary/80 transition-colors"
                  >
                    <Volume2 size={16} />
                    <span>{selectedVoice.name}</span>
                    <span className="text-xs text-muted-foreground">({selectedVoice.gender})</span>
                    <ChevronDown size={14} />
                  </button>
                  
                  {voiceDropdownOpen && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-card border border-border rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
                      {VOICE_OPTIONS.map((voice) => (
                        <button
                          key={voice.id}
                          onClick={() => {
                            setSelectedVoice(voice)
                            setVoiceDropdownOpen(false)
                          }}
                          className={cn(
                            "w-full px-4 py-2 text-left hover:bg-secondary transition-colors flex items-center justify-between",
                            selectedVoice.id === voice.id && "bg-secondary"
                          )}
                        >
                          <div>
                            <span className="font-medium">{voice.name}</span>
                            <span className="text-xs text-muted-foreground ml-2">({voice.gender})</span>
                          </div>
                          <span className="text-xs text-muted-foreground">{voice.description}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Voice chat button */}
                <button
                  onClick={isVoiceChatActive ? endVoiceChat : startVoiceChat}
                  className={cn(
                    "w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 transform hover:scale-105",
                    isVoiceChatActive
                      ? "bg-destructive text-destructive-foreground animate-pulse"
                      : "bg-primary text-primary-foreground hover:shadow-lg hover:shadow-primary/30"
                  )}
                >
                  {isVoiceChatActive ? (
                    <PhoneOff size={32} />
                  ) : (
                    <Phone size={32} />
                  )}
                </button>
                
                <p className="text-sm text-muted-foreground">
                  {isVoiceChatActive ? (
                    <span className="flex items-center gap-2">
                      {isListening ? (
                        <>
                          <span className="voice-wave">
                            <span style={{ height: "8px" }} />
                            <span style={{ height: "12px" }} />
                            <span style={{ height: "16px" }} />
                            <span style={{ height: "12px" }} />
                            <span style={{ height: "8px" }} />
                          </span>
                          Listening...
                        </>
                      ) : isPlayingAudio ? (
                        "Speaking..."
                      ) : (
                        "Tap to end call"
                      )}
                    </span>
                  ) : (
                    "Tap to start voice chat"
                  )}
                </p>
              </div>
            ) : (
              <>
                <div className="relative flex items-end gap-2 bg-input rounded-md border border-border focus-within:border-ring transition-colors">
                  {/* File upload button */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="m-2 p-2 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                    title="Attach files"
                  >
                    <Paperclip size={18} />
                  </button>
                  
                  <textarea
                    ref={textareaRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault()
                        if (inputValue.trim() && !isLoading && isPuterReady) {
                          handleSendMessage(inputValue.trim())
                          setInputValue("")
                          clearFiles()
                        }
                      }
                    }}
                    placeholder={
                      selectedMode === "image"
                        ? "Describe the image you want to generate..."
                        : selectedMode === "code"
                        ? "Ask me to write some code..."
                        : "Message Xmowg AI..."
                    }
                    disabled={isLoading || !isPuterReady}
                    className="flex-1 bg-transparent px-2 py-3 text-foreground placeholder:text-muted-foreground resize-none focus:outline-none min-h-[48px] max-h-[200px] disabled:opacity-50"
                    rows={1}
                  />
                  
                  {/* Model selector inline */}
                  <div className="relative pb-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setModelDropdownOpen(!modelDropdownOpen)
                      }}
                      className="flex items-center gap-1 px-2 py-1 text-xs bg-secondary rounded hover:bg-secondary/80 transition-colors whitespace-nowrap"
                    >
                      <span className="text-muted-foreground">{currentModel.name}</span>
                      {(currentModel as { badge?: string }).badge && (
                        <span className="px-1 py-0.5 text-[10px] bg-primary/20 text-primary rounded">
                          {(currentModel as { badge?: string }).badge}
                        </span>
                      )}
                      <ChevronDown size={12} />
                    </button>
                    
                    {modelDropdownOpen && (
                      <div 
                        className="absolute bottom-full right-0 mb-1 w-72 bg-card border border-border rounded-md shadow-lg z-50 max-h-80 overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {modelsForMode.map((model) => (
                          <button
                            key={model.id}
                            onClick={() => {
                              setModelForMode(model)
                              setModelDropdownOpen(false)
                            }}
                            className={cn(
                              "w-full px-3 py-2 text-left text-xs hover:bg-secondary transition-colors flex items-center justify-between",
                              currentModel.id === model.id && "bg-secondary"
                            )}
                          >
                            <div>
                              <span className="text-muted-foreground">{model.provider}/</span>
                              <span>{model.name}</span>
                            </div>
                            {(model as { badge?: string }).badge && (
                              <span className="px-1.5 py-0.5 text-[10px] bg-primary/20 text-primary rounded">
                                {(model as { badge?: string }).badge}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {/* Send or Pause button */}
                  {isLoading ? (
                    <button
                      onClick={stopGeneration}
                      className="m-2 p-2 rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-all animate-pulse"
                      aria-label="Stop generating"
                    >
                      <Pause size={18} />
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        if (inputValue.trim() && !isLoading && isPuterReady) {
                          handleSendMessage(inputValue.trim())
                          setInputValue("")
                          clearFiles()
                        }
                      }}
                      disabled={!inputValue.trim() || isLoading || !isPuterReady}
                      className="m-2 p-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-30 disabled:cursor-not-allowed transition-all hover:scale-105"
                      aria-label="Send message"
                    >
                      <Send size={18} />
                    </button>
                  )}
                </div>
              </>
            )}
            <p className="text-xs text-muted-foreground text-center mt-3">
              Xmowg AI can make mistakes. Consider checking important information.
            </p>
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
                  Add custom instructions that Xmowg AI will follow in every conversation.
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

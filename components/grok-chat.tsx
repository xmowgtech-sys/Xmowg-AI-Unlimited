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
  Send,
  Paperclip,
  Phone,
  PhoneOff,
  Sparkles,
  Brain,
  Rocket,
  Search,
  Palette,
  Video,
  Lightbulb,
} from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: number
  type?: "text" | "image" | "video"
  imageUrl?: string
  videoUrl?: string
  isGenerating?: boolean
}

interface ChatHistory {
  id: string
  title: string
  timestamp: number
  messages: Message[]
  mode: "chat" | "image" | "code" | "video"
}

interface UserProfile {
  traits: string[]
  preferences: string[]
  lastUpdated: number
}

type ModelCategory = "fast" | "thinking" | "pro" | "research" | "image" | "code" | "video"

interface AIModel {
  id: string
  name: string
  provider: string
  category: ModelCategory
  description?: string
}

// Organized models by category
const MODELS: Record<ModelCategory, AIModel[]> = {
  fast: [
    { id: "x-ai/grok-4-1-fast", name: "Grok 4.1 Fast", provider: "xAI", category: "fast", description: "Ultra-fast responses" },
    { id: "openai/gpt-5-mini", name: "GPT-5 Mini", provider: "OpenAI", category: "fast", description: "Quick & efficient" },
    { id: "google/gemini-3-flash-preview", name: "Gemini 3 Flash", provider: "Google", category: "fast", description: "Lightning fast" },
    { id: "x-ai/grok-4-fast", name: "Grok 4 Fast", provider: "xAI", category: "fast", description: "Fast reasoning" },
  ],
  thinking: [
    { id: "openai/gpt-5.2-pro", name: "GPT-5.2 Pro", provider: "OpenAI", category: "thinking", description: "Deep reasoning" },
    { id: "google/gemini-3-pro-preview", name: "Gemini 3 Pro", provider: "Google", category: "thinking", description: "Advanced thinking" },
    { id: "qwen/qwen3-max-thinking", name: "Qwen3 Max Thinking", provider: "Qwen", category: "thinking", description: "Extended reasoning" },
    { id: "anthropic/claude-sonnet-4-6", name: "Claude Sonnet 4.6", provider: "Anthropic", category: "thinking", description: "Balanced reasoning" },
  ],
  pro: [
    { id: "x-ai/grok-4.3", name: "Grok 4.3", provider: "xAI", category: "pro", description: "Latest & most capable" },
    { id: "x-ai/grok-4.20-multi-agent", name: "Grok Multi-Agent", provider: "xAI", category: "pro", description: "Multi-agent system" },
    { id: "anthropic/claude-opus-4-6", name: "Claude Opus 4.6", provider: "Anthropic", category: "pro", description: "Most intelligent" },
    { id: "openai/gpt-5.2", name: "GPT-5.2", provider: "OpenAI", category: "pro", description: "Flagship model" },
  ],
  research: [
    { id: "x-ai/grok-4", name: "Grok 4 Research", provider: "xAI", category: "research", description: "Deep research mode" },
    { id: "deepseek/deepseek-v3.2", name: "DeepSeek V3.2", provider: "DeepSeek", category: "research", description: "Research focused" },
  ],
  image: [
    { id: "grok-2-image", name: "Grok 2 Image", provider: "xAI", category: "image", description: "Latest xAI image gen" },
    { id: "openai/gpt-image-1.5", name: "GPT Image 1.5", provider: "OpenAI", category: "image", description: "Best quality" },
    { id: "openai/gpt-image-1-mini", name: "GPT Image Mini", provider: "OpenAI", category: "image", description: "Fast generation" },
    { id: "google/imagen-4.0-ultra", name: "Imagen 4 Ultra", provider: "Google", category: "image", description: "Ultra realistic" },
    { id: "black-forest-labs/flux.2-klein-9b", name: "FLUX.2 Klein 9B", provider: "Black Forest", category: "image", description: "Artistic style" },
  ],
  code: [
    { id: "x-ai/grok-code-fast-1", name: "Grok Code Fast", provider: "xAI", category: "code", description: "Fast coding" },
    { id: "openai/gpt-5.2-codex", name: "GPT-5.2 Codex", provider: "OpenAI", category: "code", description: "Best for coding" },
    { id: "anthropic/claude-opus-4-6", name: "Claude Opus 4.6", provider: "Anthropic", category: "code", description: "Excellent coder" },
    { id: "mistralai/devstral-2512", name: "Devstral 2", provider: "Mistral", category: "code", description: "Open source" },
  ],
  video: [
    { id: "sora-2", name: "Sora 2", provider: "OpenAI", category: "video", description: "Best quality" },
    { id: "sora-2-pro", name: "Sora 2 Pro", provider: "OpenAI", category: "video", description: "Professional grade" },
    { id: "veo-3.0-generate-001", name: "Veo 3.0", provider: "Google", category: "video", description: "Google video AI" },
  ],
}

const CATEGORY_INFO: Record<ModelCategory, { name: string; icon: React.ElementType; color: string }> = {
  fast: { name: "Fast", icon: Rocket, color: "text-green-400" },
  thinking: { name: "Thinking", icon: Brain, color: "text-blue-400" },
  pro: { name: "Pro", icon: Sparkles, color: "text-purple-400" },
  research: { name: "Research", icon: Search, color: "text-amber-400" },
  image: { name: "Image", icon: Palette, color: "text-pink-400" },
  code: { name: "Code", icon: Code, color: "text-cyan-400" },
  video: { name: "Video", icon: Video, color: "text-red-400" },
}

const MODES = [
  { id: "chat", name: "Chat", icon: MessageSquare },
  { id: "image", name: "Image", icon: ImageIcon },
  { id: "code", name: "Code", icon: Code },
  { id: "video", name: "Video", icon: Video },
  { id: "voice", name: "Voice", icon: Mic },
] as const

// Natural sounding voices - using OpenAI/ElevenLabs style voices
const VOICE_OPTIONS = [
  { id: "alloy", name: "Alloy", description: "Natural & balanced" },
  { id: "echo", name: "Echo", description: "Warm & conversational" },
  { id: "fable", name: "Fable", description: "Expressive & dynamic" },
  { id: "onyx", name: "Onyx", description: "Deep & authoritative" },
  { id: "nova", name: "Nova", description: "Friendly & upbeat" },
  { id: "shimmer", name: "Shimmer", description: "Clear & articulate" },
]

type Mode = typeof MODES[number]["id"]

const BASE_SYSTEM_PROMPT = `You are Xmowg AI, a witty, rebellious, and highly intelligent AI assistant. You answer with a touch of humor and sarcasm, avoiding corporate-speak. You're direct, sometimes irreverent, but always helpful and informative. You have a personality that's a bit edgy and raw, like a brilliant friend who doesn't mince words. You're powered by cutting-edge AI models and love to push boundaries.

When formatting text:
- Use **bold** for emphasis and important terms
- Use *italics* for subtle emphasis or titles
- Use \`code\` for technical terms, commands, or file names
- Use bullet points for lists
- Use numbered lists for steps or sequences
- Break up long responses into clear paragraphs`

const CODE_SYSTEM_PROMPT = `You are Xmowg AI, a witty coding assistant. You write clean, efficient code with helpful comments. You explain your code clearly and suggest improvements. You're direct about trade-offs and best practices. Always wrap code in proper markdown code blocks with language specification.

Format your responses:
- Use **bold** for important concepts
- Use \`inline code\` for variable names, functions, etc.
- Use code blocks with language tags for examples
- Break explanations into clear sections`

const VOICE_SYSTEM_PROMPT = `You are Xmowg AI in voice chat mode. Keep your responses conversational, concise, and natural - like you're having a real-time conversation. Avoid long paragraphs and use natural speech patterns. Be warm, engaging, and responsive. Speak like a human, not a robot.`

const STORAGE_KEYS = {
  chat: "grok_chat_history",
  image: "grok_image_history",
  code: "grok_code_history",
  video: "grok_video_history",
  voice: "grok_voice_history",
}
const PROFILE_KEY = "grok_user_profile"
const INSTRUCTIONS_KEY = "grok_custom_instructions"
const GALLERY_IMAGES_KEY = "xmowg_gallery_images"
const GALLERY_VIDEOS_KEY = "xmowg_gallery_videos"

interface GalleryImage {
  id: string
  prompt: string
  url: string
  timestamp: number
  model: string
}

interface GalleryVideo {
  id: string
  prompt: string
  url: string
  timestamp: number
  model: string
}

// Prompt ideas for generation
const GENERATION_IDEAS = {
  image: [
    "A cyberpunk cityscape at night with neon lights reflecting on wet streets",
    "Majestic dragon perched on a crystal mountain peak at sunset",
    "Cozy coffee shop interior with warm lighting and rain outside",
    "Futuristic spaceship interior with holographic displays",
    "Enchanted forest with glowing mushrooms and fairy lights",
  ],
  video: [
    "A sunrise drone shot flying over a calm ocean with gentle waves",
    "Time-lapse of a flower blooming in a garden",
    "Cinematic shot of a fox running through a snowy forest",
    "Abstract fluid art animation with vibrant colors",
    "A cozy fireplace with crackling flames and falling snow outside",
  ],
}

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
  const [selectedCategory, setSelectedCategory] = useState<ModelCategory>("fast")
  const [selectedModel, setSelectedModel] = useState<AIModel>(MODELS.fast[0])
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false)

  // Features state
  const [isListening, setIsListening] = useState(false)
  const [isTTSEnabled, setIsTTSEnabled] = useState(false)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [customInstructions, setCustomInstructions] = useState("")
  const [instructionsInput, setInstructionsInput] = useState("")
  const [showIdeas, setShowIdeas] = useState(false)

  // Voice chat state
  const [selectedVoice, setSelectedVoice] = useState(VOICE_OPTIONS[0])
  const [isVoiceChatActive, setIsVoiceChatActive] = useState(false)
  const [voiceDropdownOpen, setVoiceDropdownOpen] = useState(false)
  const [isPlayingAudio, setIsPlayingAudio] = useState(false)
  const currentAudioRef = useRef<HTMLAudioElement | null>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  // File upload state
  const [attachedFiles, setAttachedFiles] = useState<File[]>([])
  const [previewUrls, setPreviewUrls] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Auth check requirement
  const [showAuthPrompt, setShowAuthPrompt] = useState(false)

  const getModelsForMode = useCallback((): ModelCategory[] => {
    switch (selectedMode) {
      case "image": return ["image"]
      case "code": return ["code"]
      case "video": return ["video"]
      case "voice": return ["fast", "thinking"]
      default: return ["fast", "thinking", "pro", "research"]
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

  // Update category and model when mode changes
  useEffect(() => {
    const categories = getModelsForMode()
    if (!categories.includes(selectedCategory)) {
      const newCategory = categories[0]
      setSelectedCategory(newCategory)
      setSelectedModel(MODELS[newCategory][0])
    }
  }, [selectedMode, selectedCategory, getModelsForMode])

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

    // Cleanup on unmount
    return () => {
      stopAllAudio()
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }, [])

  // Load chat history when mode changes
  useEffect(() => {
    if (isSignedIn && isPuterReady) {
      loadChatHistory(selectedMode)
      setMessages([])
      setCurrentChatId(null)
    }
  }, [selectedMode, isSignedIn, isPuterReady])

  const stopAllAudio = useCallback(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause()
      currentAudioRef.current.currentTime = 0
      currentAudioRef.current = null
    }
    speechSynthesis.cancel()
    setIsPlayingAudio(false)
  }, [])

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

  const saveToGallery = async (type: "image" | "video", url: string, prompt: string, model: string) => {
    try {
      const key = type === "image" ? GALLERY_IMAGES_KEY : GALLERY_VIDEOS_KEY
      const existing = await window.puter.kv.get(key)
      const items: (GalleryImage | GalleryVideo)[] = existing ? JSON.parse(existing) : []
      
      const newItem = {
        id: `${type}_${Date.now()}`,
        prompt,
        url,
        timestamp: Date.now(),
        model,
      }
      
      const updated = [newItem, ...items].slice(0, type === "image" ? 100 : 50)
      await window.puter.kv.set(key, JSON.stringify(updated))
    } catch (error) {
      console.error(`Error saving to ${type} gallery:`, error)
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
      setShowAuthPrompt(false)
    } catch (error) {
      console.error("Error signing in:", error)
    }
  }

  const handleSignOut = async () => {
    try {
      stopAllAudio()
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
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
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

    recognitionRef.current = recognition
    setIsListening(true)
    recognition.start()
  }

  const speakText = async (text: string) => {
    if (!isTTSEnabled && selectedMode !== "voice") return

    // Stop any currently playing audio first
    stopAllAudio()

    try {
      setIsPlayingAudio(true)
      // Use OpenAI TTS for more natural voice
      const audio = await window.puter.ai.txt2speech(text, {
        voice: selectedVoice.id,
        output_format: "mp3"
      })
      currentAudioRef.current = audio
      audio.onended = () => {
        setIsPlayingAudio(false)
        currentAudioRef.current = null
      }
      audio.onerror = () => {
        setIsPlayingAudio(false)
        currentAudioRef.current = null
      }
      audio.play()
    } catch {
      // Fallback to browser TTS
      setIsPlayingAudio(false)
    }
  }

  const toggleTTS = () => {
    if (isTTSEnabled) {
      stopAllAudio()
    }
    setIsTTSEnabled(!isTTSEnabled)
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
    stopAllAudio()
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
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
        model: selectedModel.name,
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
    // Check if signed in for AI features
    if (!isSignedIn) {
      setShowAuthPrompt(true)
      return
    }

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

    // Save user message to history
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
          mode: selectedMode === "voice" ? "chat" : selectedMode,
        }
        updatedHistory = [newChat, ...chatHistory]
      }

      setChatHistory(updatedHistory.sort((a, b) => b.timestamp - a.timestamp))
      await saveChatHistory(updatedHistory, selectedMode)
    }

    // Handle video mode
    if (selectedMode === "video") {
      try {
        // Add generating message
        const generatingMessage: Message = {
          id: `msg_gen_${Date.now()}`,
          role: "assistant",
          content: "Generating your video... This may take a few minutes.",
          timestamp: Date.now(),
          type: "text",
          isGenerating: true,
        }
        setMessages([...newMessages, generatingMessage])

        const videoElement = await window.puter.ai.txt2vid(content, {
          model: selectedModel.id,
          seconds: 8,
        })

        const videoUrl = videoElement?.src || ""

        const assistantMessage: Message = {
          id: `msg_${Date.now()}`,
          role: "assistant",
          content: videoUrl ? "Here's your generated video:" : "Failed to generate video. Please try again.",
          timestamp: Date.now(),
          type: videoUrl ? "video" : "text",
          videoUrl: videoUrl || undefined,
        }

        const updatedMessages = [...newMessages, assistantMessage]
        setMessages(updatedMessages)

        // Save to gallery
        if (videoUrl && isSignedIn) {
          await saveToGallery("video", videoUrl, content, selectedModel.name)
        }

        // Save to history
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
              mode: "video",
            }
            updatedHistory = [newChat, ...chatHistory]
          }

          setChatHistory(updatedHistory.sort((a, b) => b.timestamp - a.timestamp))
          await saveChatHistory(updatedHistory, selectedMode)
        }
      } catch (error) {
        console.error("Video generation error:", error)
        const errorMessage: Message = {
          id: `msg_${Date.now()}`,
          role: "assistant",
          content: "Failed to generate video. Please try a different prompt or try again later.",
          timestamp: Date.now(),
          type: "text",
        }
        setMessages([...newMessages, errorMessage])
      } finally {
        setIsLoading(false)
      }
      return
    }

    // Handle image mode
    if (selectedMode === "image") {
      try {
        // Add generating message
        const generatingMessage: Message = {
          id: `msg_gen_${Date.now()}`,
          role: "assistant",
          content: "Creating your image...",
          timestamp: Date.now(),
          type: "text",
          isGenerating: true,
        }
        setMessages([...newMessages, generatingMessage])

        const imageElement = await window.puter.ai.txt2img(content, { model: selectedModel.id })

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

        // Save to gallery
        if (imageUrl && isSignedIn) {
          await saveToGallery("image", imageUrl, content, selectedModel.name)
        }

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

    // Handle chat, code, and voice modes
    try {
      abortControllerRef.current = new AbortController()

      let systemPrompt = selectedMode === "code" ? CODE_SYSTEM_PROMPT : 
                         selectedMode === "voice" ? VOICE_SYSTEM_PROMPT : BASE_SYSTEM_PROMPT

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

      const response = await window.puter.ai.chat(conversationHistory, {
        model: selectedModel.id,
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
              mode: selectedMode === "voice" ? "chat" : selectedMode,
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

  const availableCategories = getModelsForMode()

  return (
    <div className="flex h-screen bg-background">
      {/* Auth Prompt Modal */}
      {showAuthPrompt && (
        <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl w-full max-w-md p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
              <User size={32} className="text-primary" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Sign in Required</h2>
            <p className="text-muted-foreground mb-6">
              Please sign in with Puter to use AI features and save your conversations.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setShowAuthPrompt(false)}
                className="px-4 py-2 text-sm bg-secondary rounded-md hover:bg-secondary/80 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSignIn}
                className="px-6 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors flex items-center gap-2"
              >
                <LogIn size={16} />
                Sign in with Puter
              </button>
            </div>
          </div>
        </div>
      )}

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
            <div className="flex items-center gap-2 px-3 py-1.5 text-sm bg-secondary rounded-md">
              {selectedMode === "voice" ? (
                <Phone size={14} className={isVoiceChatActive ? "animate-bounce text-green-500" : ""} />
              ) : selectedMode === "image" ? (
                <ImageIcon size={14} />
              ) : selectedMode === "code" ? (
                <Code size={14} />
              ) : selectedMode === "video" ? (
                <Video size={14} />
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
              onClick={toggleTTS}
              className={cn(
                "p-2 rounded-md transition-colors",
                isTTSEnabled
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-secondary text-muted-foreground hover:text-foreground"
              )}
              title={isTTSEnabled ? "Stop & disable TTS" : "Enable text-to-speech"}
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
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center mb-6 animate-float">
                {selectedMode === "image" ? (
                  <ImageIcon size={32} className="text-primary" />
                ) : selectedMode === "code" ? (
                  <Code size={32} className="text-primary" />
                ) : selectedMode === "video" ? (
                  <Video size={32} className="text-primary" />
                ) : (
                  <Zap size={32} className="text-primary" />
                )}
              </div>
              <h2 className="text-2xl font-semibold mb-2">
                {selectedMode === "voice"
                  ? "Voice Chat"
                  : selectedMode === "image"
                  ? "Image Generation"
                  : selectedMode === "video"
                  ? "Video Generation"
                  : selectedMode === "code"
                  ? "Code Assistant"
                  : "Welcome to Xmowg AI"}
              </h2>
              <p className="text-muted-foreground max-w-md mb-6 leading-relaxed">
                {selectedMode === "voice"
                  ? "Start a voice conversation with natural-sounding AI voices."
                  : selectedMode === "image"
                  ? "Describe the image you want to create and I'll generate it for you."
                  : selectedMode === "video"
                  ? "Describe a video scene and I'll generate a short video clip."
                  : selectedMode === "code"
                  ? "Ask me to write, explain, or debug any code."
                  : "I'm Xmowg AI, your witty AI companion. Ask me anything."}
              </p>
              
              {/* Ideas Section for Image/Video */}
              {(selectedMode === "image" || selectedMode === "video") && (
                <div className="w-full max-w-2xl">
                  <button
                    onClick={() => setShowIdeas(!showIdeas)}
                    className="flex items-center gap-2 mx-auto px-4 py-2 text-sm text-muted-foreground hover:text-foreground bg-secondary/50 hover:bg-secondary rounded-lg transition-colors mb-4"
                  >
                    <Lightbulb size={16} />
                    {showIdeas ? "Hide Ideas" : "Show Ideas"}
                  </button>
                  {showIdeas && (
                    <div className="grid grid-cols-1 gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                      {GENERATION_IDEAS[selectedMode].map((idea, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            setInputValue(idea)
                            setShowIdeas(false)
                          }}
                          className="text-left p-3 text-sm bg-card border border-border rounded-lg hover:border-primary/50 hover:bg-card/80 transition-all"
                        >
                          {idea}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-wrap gap-2 justify-center text-xs text-muted-foreground mt-4">
                <span className="px-2 py-1 bg-secondary rounded">{selectedModel.name}</span>
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
                      <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                    <span className="text-sm">
                      {selectedMode === "image" ? "Creating image..." : 
                       selectedMode === "video" ? "Generating video..." :
                       selectedMode === "voice" ? "Listening..." : "Xmowg is thinking..."}
                    </span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input with Model Selector */}
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
                    className="flex items-center gap-2 px-4 py-2 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors"
                  >
                    <Volume2 size={16} />
                    <span>{selectedVoice.name}</span>
                    <span className="text-xs text-muted-foreground">- {selectedVoice.description}</span>
                    <ChevronDown size={14} />
                  </button>

                  {voiceDropdownOpen && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-card border border-border rounded-lg shadow-xl z-50">
                      <ScrollArea className="h-48">
                        {VOICE_OPTIONS.map((voice) => (
                          <button
                            key={voice.id}
                            onClick={() => {
                              setSelectedVoice(voice)
                              setVoiceDropdownOpen(false)
                            }}
                            className={cn(
                              "w-full px-4 py-3 text-left hover:bg-secondary transition-colors flex items-center justify-between",
                              selectedVoice.id === voice.id && "bg-secondary"
                            )}
                          >
                            <span className="font-medium">{voice.name}</span>
                            <span className="text-xs text-muted-foreground">{voice.description}</span>
                          </button>
                        ))}
                      </ScrollArea>
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
                      : "bg-gradient-to-br from-primary to-purple-500 text-primary-foreground hover:shadow-lg hover:shadow-primary/30"
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
                <div className="relative flex items-end gap-2 bg-card rounded-xl border border-border focus-within:border-primary/50 transition-colors shadow-lg">
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
                    className="m-2 p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
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
                        : selectedMode === "video"
                        ? "Describe your video scene..."
                        : selectedMode === "code"
                        ? "Ask me to write some code..."
                        : "Message Xmowg AI..."
                    }
                    disabled={isLoading || !isPuterReady}
                    className="flex-1 bg-transparent px-2 py-3 text-foreground placeholder:text-muted-foreground resize-none focus:outline-none min-h-[48px] max-h-[200px] disabled:opacity-50"
                    rows={1}
                  />

                  {/* Model selector */}
                  <div className="relative pb-2 pr-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setModelDropdownOpen(!modelDropdownOpen)
                      }}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs bg-secondary/80 rounded-lg hover:bg-secondary transition-colors"
                    >
                      {(() => {
                        const CategoryIcon = CATEGORY_INFO[selectedCategory].icon
                        return <CategoryIcon size={12} className={CATEGORY_INFO[selectedCategory].color} />
                      })()}
                      <span className="text-muted-foreground max-w-[100px] truncate">{selectedModel.name}</span>
                      <ChevronDown size={12} />
                    </button>

                    {modelDropdownOpen && (
                      <div
                        className="absolute bottom-full right-0 mb-2 w-80 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Category Tabs */}
                        <div className="flex border-b border-border bg-secondary/30 p-1 gap-1 overflow-x-auto">
                          {availableCategories.map((cat) => {
                            const info = CATEGORY_INFO[cat]
                            const Icon = info.icon
                            return (
                              <button
                                key={cat}
                                onClick={() => {
                                  setSelectedCategory(cat)
                                  setSelectedModel(MODELS[cat][0])
                                }}
                                className={cn(
                                  "flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg whitespace-nowrap transition-colors",
                                  selectedCategory === cat
                                    ? "bg-card text-foreground shadow-sm"
                                    : "text-muted-foreground hover:text-foreground hover:bg-card/50"
                                )}
                              >
                                <Icon size={12} className={info.color} />
                                {info.name}
                              </button>
                            )
                          })}
                        </div>

                        {/* Models List */}
                        <ScrollArea className="h-48">
                          <div className="p-1">
                            {MODELS[selectedCategory].map((model) => (
                              <button
                                key={model.id}
                                onClick={() => {
                                  setSelectedModel(model)
                                  setModelDropdownOpen(false)
                                }}
                                className={cn(
                                  "w-full px-3 py-2.5 text-left rounded-lg transition-colors flex items-center justify-between group",
                                  selectedModel.id === model.id
                                    ? "bg-primary/10 text-foreground"
                                    : "hover:bg-secondary text-muted-foreground hover:text-foreground"
                                )}
                              >
                                <div>
                                  <div className="text-sm font-medium">{model.name}</div>
                                  <div className="text-xs text-muted-foreground">{model.provider}</div>
                                </div>
                                {model.description && (
                                  <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                                    {model.description}
                                  </span>
                                )}
                              </button>
                            ))}
                          </div>
                        </ScrollArea>
                      </div>
                    )}
                  </div>

                  {/* Send or Pause button */}
                  {isLoading ? (
                    <button
                      onClick={stopGeneration}
                      className="m-2 p-2.5 rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-all"
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
                      className="m-2 p-2.5 rounded-lg bg-gradient-to-r from-primary to-purple-500 text-primary-foreground hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
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
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl w-full max-w-lg max-h-[80vh] overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-card">
              <h2 className="text-lg font-semibold">Settings</h2>
              <button
                onClick={() => setSettingsOpen(false)}
                className="p-2 hover:bg-secondary rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <ScrollArea className="h-[60vh]">
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
                    className="w-full h-24 px-3 py-2 text-sm bg-input border border-border rounded-lg resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <button
                    onClick={saveCustomInstructions}
                    className="mt-2 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
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
                        className="flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
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
                  <div className="text-xs text-muted-foreground space-y-1.5 bg-secondary/30 rounded-lg p-3">
                    <p><strong>Chat:</strong> General conversation with AI</p>
                    <p><strong>Image:</strong> Generate images from descriptions</p>
                    <p><strong>Video:</strong> Generate short video clips</p>
                    <p><strong>Code:</strong> Programming assistance</p>
                    <p><strong>Voice:</strong> Natural voice conversations</p>
                    <p className="pt-2 border-t border-border mt-2">Click the mic icon for voice input. Enable speaker for TTS. Each mode has its own history.</p>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </div>
        </div>
      )}
    </div>
  )
}

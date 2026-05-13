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
  thinking?: string // AI's thought process
  thinkingComplete?: boolean
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
  facts: string[] // Specific facts about the user (name, location, favorites, etc.)
  conversationStyle: string // How the user prefers to be communicated with
  lastUpdated: number
}

// Storage key for explicit memories (things user asked to remember)
const MEMORIES_KEY = "xmowg_user_memories"

type ModelCategory = "fast" | "thinking" | "pro" | "research" | "image" | "code" | "video"

interface AIModel {
  id: string
  name: string
  provider: string
  category: ModelCategory
  description?: string
}

// Organized models by category - using free Puter.js models
const MODELS: Record<ModelCategory, AIModel[]> = {
  fast: [
    { id: "gpt-5-nano", name: "GPT-5 Nano", provider: "OpenAI", category: "fast", description: "Fast & efficient" },
    { id: "gpt-5.4-nano", name: "GPT-5.4 Nano", provider: "OpenAI", category: "fast", description: "Latest fast model" },
    { id: "gpt-4o-mini", name: "GPT-4o Mini", provider: "OpenAI", category: "fast", description: "Quick responses" },
    { id: "claude-3-5-haiku-latest", name: "Claude 3.5 Haiku", provider: "Anthropic", category: "fast", description: "Lightning fast" },
    { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash", provider: "Google", category: "fast", description: "Super fast" },
    { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", provider: "Google", category: "fast", description: "Latest flash" },
    { id: "gemini-3-flash-preview", name: "Gemini 3 Flash", provider: "Google", category: "fast", description: "Newest flash" },
    { id: "x-ai/grok-4-1-fast", name: "Grok 4.1 Fast", provider: "xAI", category: "fast", description: "Fast Grok" },
    { id: "llama-3.3-70b", name: "Llama 3.3 70B", provider: "Meta", category: "fast", description: "Open source" },
  ],
  thinking: [
    { id: "gpt-4o", name: "GPT-4o", provider: "OpenAI", category: "thinking", description: "Deep reasoning" },
    { id: "claude-sonnet-4-5", name: "Claude Sonnet 4.5", provider: "Anthropic", category: "thinking", description: "Balanced thinking" },
    { id: "claude-sonnet-4-20250514", name: "Claude Sonnet 4", provider: "Anthropic", category: "thinking", description: "Advanced Claude" },
    { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", provider: "Google", category: "thinking", description: "Pro thinking" },
    { id: "gemini-3.1-pro-preview", name: "Gemini 3.1 Pro", provider: "Google", category: "thinking", description: "Latest Pro" },
    { id: "deepseek-chat", name: "DeepSeek Chat", provider: "DeepSeek", category: "thinking", description: "Deep analysis" },
    { id: "deepseek/deepseek-r1", name: "DeepSeek R1", provider: "DeepSeek", category: "thinking", description: "Deep reasoning" },
    { id: "x-ai/grok-4.3", name: "Grok 4.3", provider: "xAI", category: "thinking", description: "Latest Grok" },
    { id: "x-ai/grok-4", name: "Grok 4", provider: "xAI", category: "thinking", description: "Powerful Grok" },
  ],
  pro: [
    { id: "claude-opus-4-20250514", name: "Claude Opus 4", provider: "Anthropic", category: "pro", description: "Most intelligent" },
    { id: "gpt-4.1", name: "GPT-4.1", provider: "OpenAI", category: "pro", description: "Latest GPT" },
    { id: "o3", name: "o3", provider: "OpenAI", category: "pro", description: "Best reasoning" },
    { id: "gemini-3-pro-preview", name: "Gemini 3 Pro", provider: "Google", category: "pro", description: "Top tier" },
    { id: "x-ai/grok-4.20", name: "Grok 4.20", provider: "xAI", category: "pro", description: "Premium Grok" },
    { id: "x-ai/grok-4.20-multi-agent", name: "Grok Multi-Agent", provider: "xAI", category: "pro", description: "Multi-agent" },
  ],
  research: [
    { id: "o4-mini", name: "o4 Mini", provider: "OpenAI", category: "research", description: "Reasoning model" },
    { id: "deepseek-reasoner", name: "DeepSeek Reasoner", provider: "DeepSeek", category: "research", description: "Research focused" },
    { id: "qwq-32b", name: "QwQ 32B", provider: "Qwen", category: "research", description: "Deep reasoning" },
    { id: "x-ai/grok-3-beta", name: "Grok 3 Beta", provider: "xAI", category: "research", description: "Research Grok" },
  ],
  image: [
    // OpenAI GPT Image models
    { id: "gpt-image-1.5", name: "GPT Image 1.5", provider: "OpenAI", category: "image", description: "Latest & best" },
    { id: "gpt-image-1", name: "GPT Image 1", provider: "OpenAI", category: "image", description: "High quality" },
    { id: "gpt-image-1-mini", name: "GPT Image Mini", provider: "OpenAI", category: "image", description: "Fast & free" },
    { id: "dall-e-3", name: "DALL-E 3", provider: "OpenAI", category: "image", description: "Classic DALL-E" },
    // FLUX models (Black Forest Labs)
    { id: "black-forest-labs/flux.2-max", name: "FLUX 2 Max", provider: "Black Forest", category: "image", description: "Highest quality" },
    { id: "black-forest-labs/flux.2-pro", name: "FLUX 2 Pro", provider: "Black Forest", category: "image", description: "Professional" },
    { id: "black-forest-labs/flux.2-flex", name: "FLUX 2 Flex", provider: "Black Forest", category: "image", description: "Customizable" },
    { id: "black-forest-labs/flux.2-dev", name: "FLUX 2 Dev", provider: "Black Forest", category: "image", description: "Development" },
    { id: "black-forest-labs/flux.1-schnell", name: "FLUX Schnell", provider: "Black Forest", category: "image", description: "Ultra fast" },
    { id: "black-forest-labs/flux.1-kontext-pro", name: "FLUX Kontext", provider: "Black Forest", category: "image", description: "Image editing" },
    { id: "black-forest-labs/flux.1.1-pro", name: "FLUX 1.1 Pro", provider: "Black Forest", category: "image", description: "Pro quality" },
    // xAI Grok
    { id: "grok-2-image", name: "Grok 2 Image", provider: "xAI", category: "image", description: "Grok imaging" },
    // Google Gemini
    { id: "gemini-2.5-flash-image-preview", name: "Nano Banana", provider: "Google", category: "image", description: "Gemini image" },
  ],
  code: [
    { id: "openai/gpt-5.3-codex", name: "GPT-5.3 Codex", provider: "OpenAI", category: "code", description: "Latest Codex" },
    { id: "openai/gpt-5.2-codex", name: "GPT-5.2 Codex", provider: "OpenAI", category: "code", description: "Advanced Codex" },
    { id: "openai/gpt-5.1-codex-max", name: "Codex Max", provider: "OpenAI", category: "code", description: "Maximum power" },
    { id: "openai/gpt-5.1-codex", name: "GPT-5.1 Codex", provider: "OpenAI", category: "code", description: "Balanced Codex" },
    { id: "openai/gpt-5.1-codex-mini", name: "Codex Mini", provider: "OpenAI", category: "code", description: "Fast Codex" },
    { id: "x-ai/grok-code-fast-1", name: "Grok Code", provider: "xAI", category: "code", description: "Grok coding" },
    { id: "claude-sonnet-4-20250514", name: "Claude Sonnet 4", provider: "Anthropic", category: "code", description: "Excellent coder" },
    { id: "deepseek-chat", name: "DeepSeek Coder", provider: "DeepSeek", category: "code", description: "Code specialist" },
    { id: "codestral-latest", name: "Codestral", provider: "Mistral", category: "code", description: "Code focused" },
  ],
  video: [
    // OpenAI Sora models
    { id: "sora-2-pro", name: "Sora 2 Pro", provider: "OpenAI", category: "video", description: "Best quality" },
    { id: "sora-2", name: "Sora 2", provider: "OpenAI", category: "video", description: "Balanced" },
    // Google Veo models
    { id: "veo-3.0-generate-001", name: "Veo 3.0", provider: "Google", category: "video", description: "Google video" },
    { id: "veo-2.0-generate-001", name: "Veo 2.0", provider: "Google", category: "video", description: "Stable quality" },
    // Vidu models
    { id: "vidu/vidu-q1", name: "Vidu Q1", provider: "Vidu", category: "video", description: "1080p + audio" },
    { id: "vidu/vidu-2.0", name: "Vidu 2.0", provider: "Vidu", category: "video", description: "High quality" },
    // Wan AI models
    { id: "Wan-AI/Wan2.2-T2V-A14B", name: "Wan 2.2 T2V", provider: "Wan AI", category: "video", description: "Text to video" },
    // Kling AI
    { id: "kling-video/v1.6/pro", name: "Kling 1.6 Pro", provider: "Kling", category: "video", description: "Kling pro" },
    { id: "kling-video/v1.6/standard", name: "Kling 1.6", provider: "Kling", category: "video", description: "Kling standard" },
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

// Natural sounding voices - using OpenAI provider via Puter.js
const VOICE_OPTIONS = [
  { id: "alloy", name: "Alloy", description: "Natural & balanced", provider: "openai" },
  { id: "echo", name: "Echo", description: "Warm & conversational", provider: "openai" },
  { id: "fable", name: "Fable", description: "Expressive & dynamic", provider: "openai" },
  { id: "onyx", name: "Onyx", description: "Deep & authoritative", provider: "openai" },
  { id: "nova", name: "Nova", description: "Friendly & upbeat", provider: "openai" },
  { id: "shimmer", name: "Shimmer", description: "Clear & articulate", provider: "openai" },
  { id: "ash", name: "Ash", description: "Calm & professional", provider: "openai" },
  { id: "coral", name: "Coral", description: "Bright & energetic", provider: "openai" },
  { id: "sage", name: "Sage", description: "Wise & thoughtful", provider: "openai" },
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
    "Steampunk airship flying through golden clouds at golden hour",
    "Underwater crystal palace with bioluminescent sea creatures",
    "Samurai warrior standing in a field of cherry blossoms",
    "Northern lights dancing over a snowy mountain village",
    "Art deco robot butler serving tea in a 1920s mansion",
  ],
  video: [
    "A sunrise drone shot flying over a calm ocean with gentle waves",
    "Time-lapse of a flower blooming in a garden",
    "Cinematic shot of a fox running through a snowy forest",
    "Abstract fluid art animation with vibrant colors",
    "A cozy fireplace with crackling flames and falling snow outside",
    "Majestic eagle soaring through mountain peaks at golden hour",
    "Northern lights dancing over a frozen lake with reflections",
    "Rain drops falling on a window with city lights blurred behind",
    "Butterfly emerging from a cocoon in slow motion",
    "Clouds forming and swirling around a mountain peak",
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
  const [userMemories, setUserMemories] = useState<string[]>([])
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [customInstructions, setCustomInstructions] = useState("")
  const [instructionsInput, setInstructionsInput] = useState("")
  const [showIdeas, setShowIdeas] = useState(false)
  const [newMemoryInput, setNewMemoryInput] = useState("")
  const [currentThinking, setCurrentThinking] = useState<string>("")
  const [showThinking, setShowThinking] = useState(true) // Toggle to show/hide thinking

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
              await loadUserMemories()
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

  // Check for auto-generate prompt from gallery ideas
  useEffect(() => {
    if (isPuterReady && isSignedIn) {
      const autoPrompt = sessionStorage.getItem("autoGeneratePrompt")
      const autoMode = sessionStorage.getItem("autoGenerateMode") as Mode | null
      
      if (autoPrompt && autoMode) {
        // Clear the stored values
        sessionStorage.removeItem("autoGeneratePrompt")
        sessionStorage.removeItem("autoGenerateMode")
        
        // Switch to the correct mode and send the prompt
        if (autoMode !== selectedMode) {
          setSelectedMode(autoMode)
        }
        
        // Small delay to ensure mode switch is complete
        setTimeout(() => {
          createNewChat()
          handleSendMessage(autoPrompt)
        }, 200)
      }
    }
  }, [isPuterReady, isSignedIn])

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

  const loadUserMemories = async () => {
    try {
      const data = await window.puter.kv.get(MEMORIES_KEY)
      if (data) {
        setUserMemories(JSON.parse(data))
      }
    } catch (error) {
      console.error("Error loading memories:", error)
    }
  }

  const saveUserMemory = async (memory: string) => {
    try {
      const updated = [...userMemories, memory].slice(-50) // Keep last 50 memories
      await window.puter.kv.set(MEMORIES_KEY, JSON.stringify(updated))
      setUserMemories(updated)
    } catch (error) {
      console.error("Error saving memory:", error)
    }
  }

  const deleteUserMemory = async (index: number) => {
    try {
      const updated = userMemories.filter((_, i) => i !== index)
      await window.puter.kv.set(MEMORIES_KEY, JSON.stringify(updated))
      setUserMemories(updated)
    } catch (error) {
      console.error("Error deleting memory:", error)
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
      // Limit chat history and message content to stay under KV storage limits
      const limitedHistory = history.slice(0, 50).map(chat => ({
        ...chat,
        messages: chat.messages.slice(-20).map(msg => ({
          ...msg,
          // Don't store large image/video URLs in chat history
          imageUrl: undefined,
          videoUrl: undefined,
          content: msg.content.length > 5000 ? msg.content.substring(0, 5000) + "..." : msg.content,
          thinking: msg.thinking ? msg.thinking.substring(0, 1000) : undefined,
        }))
      }))
      
      try {
        await window.puter.kv.set(STORAGE_KEYS[mode], JSON.stringify(limitedHistory))
      } catch (kvError: unknown) {
        const kvErr = kvError as { code?: string }
        if (kvErr?.code === "value_too_large") {
          // Further reduce if still too large
          const reduced = limitedHistory.slice(0, 20)
          await window.puter.kv.set(STORAGE_KEYS[mode], JSON.stringify(reduced))
        } else {
          throw kvError
        }
      }
    } catch (error) {
      console.error("Error saving chat history:", error)
    }
  }

  const saveToGallery = async (type: "image" | "video", url: string, prompt: string, model: string) => {
    try {
      const key = type === "image" ? GALLERY_IMAGES_KEY : GALLERY_VIDEOS_KEY
      const existing = await window.puter.kv.get(key)
      const items: (GalleryImage | GalleryVideo)[] = existing ? JSON.parse(existing) : []
      
      // For Puter KV storage, we have a ~400KB limit
      // Store the URL directly - blob URLs won't persist but that's okay
      // The gallery will show items that have valid URLs
      const newItem = {
        id: `${type}_${Date.now()}`,
        prompt,
        url: url, // Keep the original URL
        timestamp: Date.now(),
        model,
      }
      
      // Limit storage size to stay under KV limits
      const maxItems = type === "image" ? 30 : 10
      const updated = [newItem, ...items].slice(0, maxItems)
      
      // Try to save, if it fails due to size, reduce items
      try {
        await window.puter.kv.set(key, JSON.stringify(updated))
      } catch (kvError: unknown) {
        const kvErr = kvError as { code?: string }
        if (kvErr?.code === "value_too_large") {
          // Reduce to fewer items and try again
          const reduced = updated.slice(0, Math.floor(maxItems / 2))
          await window.puter.kv.set(key, JSON.stringify(reduced))
        } else {
          throw kvError
        }
      }
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
      await loadUserMemories()
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

  const toggleVoiceInput = async () => {
    // Check for browser speech recognition support
    const hasBrowserSTT = ("webkitSpeechRecognition" in window) || ("SpeechRecognition" in window)
    
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
      setIsListening(false)
      return
    }

    // Request microphone permission first
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      alert("Microphone permission denied. Please allow microphone access to use voice input.")
      return
    }

    // Use browser's SpeechRecognition for real-time voice input
    if (hasBrowserSTT) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      const recognition = new SpeechRecognition()
      recognition.continuous = selectedMode === "voice" // Continuous for voice mode
      recognition.interimResults = true
      recognition.lang = "en-US"

      let finalTranscript = ""

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interimTranscript = ""
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            finalTranscript += transcript
          } else {
            interimTranscript += transcript
          }
        }
        
        // Show interim results in input
        if (interimTranscript && selectedMode !== "voice") {
          setInputValue(prev => prev ? prev : interimTranscript)
        }
        
        // Send final result
        if (finalTranscript.trim() && selectedMode === "voice") {
          handleSendMessage(finalTranscript.trim())
          finalTranscript = ""
        }
      }

      recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error)
        if (event.error !== "no-speech") {
          setIsListening(false)
        }
      }
      
      recognition.onend = () => {
        // For non-voice mode, send final transcript
        if (finalTranscript.trim() && selectedMode !== "voice") {
          handleSendMessage(finalTranscript.trim())
        }
        setIsListening(false)
        
        // In voice chat mode, restart listening after a pause
        if (isVoiceChatActive && !isPlayingAudio) {
          setTimeout(() => {
            if (isVoiceChatActive) {
              toggleVoiceInput()
            }
          }, 1000)
        }
      }

      recognitionRef.current = recognition
      setIsListening(true)
      recognition.start()
    } else {
      alert("Speech recognition not supported in this browser. Please use Chrome or Edge.")
    }
  }

  const speakText = async (text: string, force: boolean = false) => {
    if (!force && !isTTSEnabled && selectedMode !== "voice") return
    if (!text.trim()) return

    // Stop any currently playing audio first
    stopAllAudio()

    // Clean text for speech (remove markdown)
    const cleanText = text
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/\*(.*?)\*/g, "$1")
      .replace(/`(.*?)`/g, "$1")
      .replace(/```[\s\S]*?```/g, "code block")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .trim()

    // Limit text length for TTS (max 3000 chars per Puter docs)
    const truncatedText = cleanText.length > 2500 ? cleanText.substring(0, 2500) + "..." : cleanText

    try {
      setIsPlayingAudio(true)
      // Use Puter TTS with OpenAI provider and selected voice
      const audio = await window.puter.ai.txt2speech(truncatedText, {
        provider: "openai",
        model: "gpt-4o-mini-tts",
        voice: selectedVoice.id,
        response_format: "mp3",
        instructions: "Speak naturally and conversationally, with appropriate emotion and pacing."
      })
      currentAudioRef.current = audio
      audio.onended = () => {
        setIsPlayingAudio(false)
        currentAudioRef.current = null
        // If in voice chat mode, start listening again after response
        if (isVoiceChatActive && selectedMode === "voice") {
          setTimeout(() => {
            toggleVoiceInput()
          }, 500)
        }
      }
      audio.onerror = () => {
        setIsPlayingAudio(false)
        currentAudioRef.current = null
        // Fallback to browser TTS
        fallbackTTS(truncatedText)
      }
      audio.play()
    } catch (error) {
      console.error("TTS error:", error)
      // Fallback to browser TTS
      fallbackTTS(truncatedText)
    }
  }

  const fallbackTTS = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 1
    utterance.pitch = 1
    utterance.onend = () => setIsPlayingAudio(false)
    utterance.onerror = () => setIsPlayingAudio(false)
    setIsPlayingAudio(true)
    speechSynthesis.speak(utterance)
  }

  const speakLastAIMessage = () => {
    // Find the last assistant message
    const lastAIMessage = [...messages].reverse().find(m => m.role === "assistant" && m.type !== "image" && m.type !== "video")
    if (lastAIMessage) {
      if (isPlayingAudio) {
        stopAllAudio()
      } else {
        speakText(lastAIMessage.content, true)
      }
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

  const startVoiceChat = async () => {
    // Request microphone permission first
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch (error) {
      alert("Microphone permission denied. Please allow microphone access to use voice chat.")
      return
    }
    
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
      await window.puter.kv.del(MEMORIES_KEY)
      setUserProfile(null)
      setUserMemories([])
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
          content: "Generating your video... This may take 1-3 minutes. Uses Puter credits (sign in to get free credits).",
          timestamp: Date.now(),
          type: "text",
          isGenerating: true,
        }
        setMessages([...newMessages, generatingMessage])

        const videoElement = await window.puter.ai.txt2vid(content, {
          model: selectedModel.id,
          seconds: 6,
          size: "1280x720"
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
      } catch (error: unknown) {
        console.error("Video generation error:", error)
        const errorObj = error as { code?: string; message?: string; error?: string }
        const errorCode = errorObj?.code || ""
        const errorText = errorObj?.message || errorObj?.error || (error instanceof Error ? error.message : String(error))
        
        // Check for insufficient funds - Puter uses "User-Pays" model
        const isInsufficientFunds = errorCode === "insufficient_funds" || 
          errorText.toLowerCase().includes("insufficient") ||
          errorText.toLowerCase().includes("funds") ||
          errorText.toLowerCase().includes("balance") ||
          errorText.toLowerCase().includes("credits")
        
        let helpfulMessage = ""
        if (isInsufficientFunds) {
          helpfulMessage = `**Need Puter Credits** 

Video generation uses your Puter account credits. To generate videos:

1. **Sign in to Puter** - Click "Sign In" at the top right
2. **Get free credits** - New accounts get free credits to try AI features
3. **Add more credits** - Visit [puter.com](https://puter.com) to add credits if needed

Puter uses a "User-Pays" model where you control your own AI usage. This keeps the service free for developers!`
        } else if (errorText.toLowerCase().includes("timeout") || errorText.toLowerCase().includes("timed out")) {
          helpfulMessage = "Video generation is taking longer than expected. Video can take 1-3 minutes. Please try again."
        } else if (errorText.toLowerCase().includes("network") || errorText.toLowerCase().includes("fetch")) {
          helpfulMessage = "Network connection issue. Please check your internet and try again."
        } else {
          helpfulMessage = `Video generation error: ${errorText}. Try a different prompt or model.`
        }
        
        const errorMessage: Message = {
          id: `msg_${Date.now()}`,
          role: "assistant",
          content: helpfulMessage,
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
      } catch (error: unknown) {
        console.error("Image generation error:", error)
        const errorObj = error as { code?: string; message?: string; error?: string }
        const errorCode = errorObj?.code || ""
        const errorText = errorObj?.message || errorObj?.error || (error instanceof Error ? error.message : String(error))
        
        const isInsufficientFunds = errorCode === "insufficient_funds" || 
          errorText.toLowerCase().includes("insufficient") ||
          errorText.toLowerCase().includes("funds") ||
          errorText.toLowerCase().includes("balance") ||
          errorText.toLowerCase().includes("credits")
        
        let helpfulMessage = ""
        if (isInsufficientFunds) {
          helpfulMessage = `**Need Puter Credits**

Image generation uses your Puter account credits. Sign in to Puter and ensure you have credits available. New accounts get free credits! Visit [puter.com](https://puter.com) to manage your account.`
        } else {
          helpfulMessage = `Image generation error: ${errorText}. Try a different prompt or model.`
        }
        
        const errorMessage: Message = {
          id: `msg_${Date.now()}`,
          role: "assistant",
          content: helpfulMessage,
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
        systemPrompt += `\n\nUser Interests & Traits: ${userProfile.traits.join(", ")}. Tailor your responses accordingly.`
      }

      // Add explicit user memories
      if (userMemories.length > 0) {
        systemPrompt += `\n\n**Important User Information to Remember:**\n${userMemories.map((m, i) => `${i + 1}. ${m}`).join("\n")}\n\nUse this information naturally in your responses when relevant.`
      }

      // Add thinking mode for research category or when explicitly enabled
      const isResearchMode = selectedCategory === "research"
      if (isResearchMode && showThinking) {
        systemPrompt += `\n\n**Thinking Mode Enabled:**
When answering, first show your thought process wrapped in <thinking>...</thinking> tags.
Inside these tags, explain:
- What the user is asking for
- Key considerations and approaches
- Your reasoning process
Then provide your final answer after the thinking section.
Example format:
<thinking>
Let me analyze this question...
The key points are...
I should consider...
</thinking>

[Your actual response here]`
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
            
            // Check for thinking tags in streaming content
            const thinkingMatch = fullResponse.match(/<thinking>([\s\S]*?)(<\/thinking>)?/i)
            if (thinkingMatch) {
              setCurrentThinking(thinkingMatch[1])
              // Only show content after thinking tags
              const afterThinking = fullResponse.replace(/<thinking>[\s\S]*?(<\/thinking>)?/i, "").trim()
              setStreamingMessage(afterThinking)
            } else {
              setStreamingMessage(fullResponse)
            }
          }
        }
      } else {
        const nonStreamResponse = response as { message?: { content: string } }
        fullResponse = nonStreamResponse.message?.content || ""
      }

      if (!abortControllerRef.current?.signal.aborted) {
        // Parse thinking tags from response
        let thinking = ""
        let actualContent = fullResponse
        const thinkingMatch = fullResponse.match(/<thinking>([\s\S]*?)<\/thinking>/i)
        if (thinkingMatch) {
          thinking = thinkingMatch[1].trim()
          actualContent = fullResponse.replace(/<thinking>[\s\S]*?<\/thinking>/i, "").trim()
        }

        const assistantMessage: Message = {
          id: `msg_${Date.now()}`,
          role: "assistant",
          content: actualContent,
          timestamp: Date.now(),
          thinking: thinking || undefined,
          thinkingComplete: true,
        }

        const updatedMessages = [...newMessages, assistantMessage]
        setMessages(updatedMessages)
        setStreamingMessage("")
        setCurrentThinking("")

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
              onClick={speakLastAIMessage}
              className={cn(
                "p-2 rounded-md transition-colors",
                isPlayingAudio
                  ? "bg-primary text-primary-foreground animate-pulse"
                  : "hover:bg-secondary text-muted-foreground hover:text-foreground"
              )}
              title={isPlayingAudio ? "Stop speaking" : "Read last AI response"}
            >
              {isPlayingAudio ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>

            {/* Thinking mode toggle - only show for research models */}
            {selectedCategory === "research" && (
              <button
                onClick={() => setShowThinking(!showThinking)}
                className={cn(
                  "p-2 rounded-md transition-colors",
                  showThinking
                    ? "bg-primary/20 text-primary"
                    : "hover:bg-secondary text-muted-foreground hover:text-foreground"
                )}
                title={showThinking ? "Hide AI thinking" : "Show AI thinking"}
              >
                <Brain size={18} />
              </button>
            )}

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
                            // Create new chat and auto-send the idea
                            createNewChat()
                            setShowIdeas(false)
                            // Small delay to ensure state is updated
                            setTimeout(() => {
                              handleSendMessage(idea)
                            }, 100)
                          }}
                          className="text-left p-3 text-sm bg-card border border-border rounded-lg hover:border-primary/50 hover:bg-card/80 transition-all group"
                        >
                          <span>{idea}</span>
                          <span className="ml-2 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">Click to generate</span>
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
              {(streamingMessage || currentThinking) && (
                <ChatMessage
                  message={{
                    id: "streaming",
                    role: "assistant",
                    content: streamingMessage || "...",
                    timestamp: Date.now(),
                    thinking: currentThinking || undefined,
                    thinkingComplete: false,
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
                    <Brain size={14} />
                    Memory & Personalization
                  </h3>
                  <p className="text-xs text-muted-foreground mb-3">
                    Xmowg will remember these things about you across all conversations.
                  </p>
                  
                  {/* Add new memory */}
                  {isSignedIn && (
                    <div className="flex gap-2 mb-3">
                      <input
                        type="text"
                        value={newMemoryInput}
                        onChange={(e) => setNewMemoryInput(e.target.value)}
                        placeholder="e.g., My name is Alex, I love Python..."
                        className="flex-1 px-3 py-2 text-sm bg-input border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && newMemoryInput.trim()) {
                            saveUserMemory(newMemoryInput.trim())
                            setNewMemoryInput("")
                          }
                        }}
                      />
                      <button
                        onClick={() => {
                          if (newMemoryInput.trim()) {
                            saveUserMemory(newMemoryInput.trim())
                            setNewMemoryInput("")
                          }
                        }}
                        className="px-3 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                      >
                        Add
                      </button>
                    </div>
                  )}

                  {/* Explicit memories list */}
                  {userMemories.length > 0 && (
                    <div className="space-y-2 mb-3 max-h-32 overflow-y-auto">
                      {userMemories.map((memory, i) => (
                        <div key={i} className="flex items-center justify-between gap-2 px-3 py-2 bg-secondary/50 rounded-lg text-xs">
                          <span className="truncate">{memory}</span>
                          <button
                            onClick={() => deleteUserMemory(i)}
                            className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Learned traits */}
                  {userProfile && userProfile.traits.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs text-muted-foreground mb-1">Learned from conversations:</p>
                      <div className="flex flex-wrap gap-1">
                        {userProfile.traits.map((trait, i) => (
                          <span key={i} className="px-2 py-1 bg-secondary text-xs rounded">{trait}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {isSignedIn ? (
                    <button
                      onClick={clearMemory}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                    >
                      <Trash2 size={14} />
                      Clear All Memory
                    </button>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Sign in to enable memory and personalization
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

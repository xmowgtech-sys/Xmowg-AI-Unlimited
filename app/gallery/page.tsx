"use client"

import { useState, useEffect, Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { 
  ArrowLeft, 
  Download, 
  Sparkles, 
  Image as ImageIcon,
  Video,
  Trash2,
  Play,
  FolderOpen,
  FolderPlus,
  MoreVertical,
  ChevronRight,
  Lightbulb,
  User,
  LogIn
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"

interface GeneratedImage {
  id: string
  prompt: string
  url: string
  timestamp: number
  model: string
  folderId?: string
}

interface GeneratedVideo {
  id: string
  prompt: string
  url: string
  timestamp: number
  model: string
  folderId?: string
}

interface Folder {
  id: string
  name: string
  createdAt: number
  type: "image" | "video"
}

const IMAGE_IDEAS = [
  "A cyberpunk cityscape at night with neon lights reflecting on wet streets",
  "Majestic dragon perched on a crystal mountain peak at sunset",
  "Cozy coffee shop interior with warm lighting and rain outside",
  "Futuristic spaceship interior with holographic displays",
  "Enchanted forest with glowing mushrooms and fairy lights",
  "Abstract fluid art with metallic gold and deep blue colors",
  "Ancient temple ruins reclaimed by nature with vines and moss",
  "Underwater city of merfolk with bioluminescent architecture",
]

const VIDEO_IDEAS = [
  "A sunrise drone shot flying over a calm ocean with gentle waves",
  "Time-lapse of a flower blooming in a garden",
  "Cinematic shot of a fox running through a snowy forest",
  "Abstract fluid art animation with vibrant colors",
  "A cozy fireplace with crackling flames and falling snow outside",
  "Northern lights dancing over a frozen tundra",
  "Clouds forming and moving across a mountain landscape",
  "Rain drops falling on a window with city lights in background",
]

// 1. THIS IS THE LOGIC WRAPPER
function GalleryContent() {
  const searchParams = useSearchParams()
  const initialTab = searchParams.get("tab") as "image" | "video" | "folders" | "ideas" | null
  
  const [isPuterReady, setIsPuterReady] = useState(false)
  const [isSignedIn, setIsSignedIn] = useState(false)
  const [activeTab, setActiveTab] = useState<"image" | "video" | "folders">(initialTab === "ideas" ? "image" : initialTab || "image")
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([])
  const [generatedVideos, setGeneratedVideos] = useState<GeneratedVideo[]>([])
  const [folders, setFolders] = useState<Folder[]>([])
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null)
  const [newFolderName, setNewFolderName] = useState("")
  const [showNewFolderInput, setShowNewFolderInput] = useState(false)
  const [showIdeas, setShowIdeas] = useState(initialTab === "ideas")

  useEffect(() => {
    const checkPuter = setInterval(async () => {
      if (typeof window !== "undefined" && window.puter) {
        clearInterval(checkPuter)
        setIsPuterReady(true)
        
        try {
          const signedIn = await window.puter.auth.isSignedIn()
          setIsSignedIn(signedIn)
          
          if (signedIn) {
            loadSavedImages()
            loadSavedVideos()
            loadFolders()
          }
        } catch (error) {
          console.error("Auth check error:", error)
        }
      }
    }, 100)
    setTimeout(() => clearInterval(checkPuter), 10000)
  }, [])

  const handleSignIn = async () => {
    try {
      await window.puter.auth.signIn()
      setIsSignedIn(true)
      loadSavedImages()
      loadSavedVideos()
      loadFolders()
    } catch (error) {
      console.error("Sign in error:", error)
    }
  }

  const loadSavedImages = async () => {
    try {
      const data = await window.puter.kv.get("xmowg_gallery_images")
      if (data) {
        setGeneratedImages(JSON.parse(data))
      }
    } catch (error) {
      console.error("Error loading saved images:", error)
    }
  }

  const loadSavedVideos = async () => {
    try {
      const data = await window.puter.kv.get("xmowg_gallery_videos")
      if (data) {
        setGeneratedVideos(JSON.parse(data))
      }
    } catch (error) {
      console.error("Error loading saved videos:", error)
    }
  }

  const loadFolders = async () => {
    try {
      const data = await window.puter.kv.get("xmowg_gallery_folders")
      if (data) {
        setFolders(JSON.parse(data))
      }
    } catch (error) {
      console.error("Error loading folders:", error)
    }
  }

  const saveImages = async (images: GeneratedImage[]) => {
    try {
      await window.puter.kv.set("xmowg_gallery_images", JSON.stringify(images.slice(0, 100)))
    } catch (error) {
      console.error("Error saving images:", error)
    }
  }

  const saveVideos = async (videos: GeneratedVideo[]) => {
    try {
      await window.puter.kv.set("xmowg_gallery_videos", JSON.stringify(videos.slice(0, 50)))
    } catch (error) {
      console.error("Error saving videos:", error)
    }
  }

  const saveFolders = async (newFolders: Folder[]) => {
    try {
      await window.puter.kv.set("xmowg_gallery_folders", JSON.stringify(newFolders))
    } catch (error) {
      console.error("Error saving folders:", error)
    }
  }

  const deleteImage = async (id: string) => {
    const updatedImages = generatedImages.filter(img => img.id !== id)
    setGeneratedImages(updatedImages)
    await saveImages(updatedImages)
  }

  const deleteVideo = async (id: string) => {
    const updatedVideos = generatedVideos.filter(vid => vid.id !== id)
    setGeneratedVideos(updatedVideos)
    await saveVideos(updatedVideos)
  }

  const downloadFile = async (url: string, prompt: string, type: "image" | "video") => {
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      const link = document.createElement("a")
      link.href = URL.createObjectURL(blob)
      link.download = `xmowg-${type}-${prompt.slice(0, 20).replace(/[^a-z0-9]/gi, "_")}.${type === "video" ? "mp4" : "png"}`
      link.click()
      URL.revokeObjectURL(link.href)
    } catch (error) {
      console.error("Download error:", error)
    }
  }

  const createFolder = async () => {
    if (!newFolderName.trim()) return
    
    const newFolder: Folder = {
      id: `folder_${Date.now()}`,
      name: newFolderName.trim(),
      createdAt: Date.now(),
      type: activeTab === "video" ? "video" : "image",
    }
    
    const updatedFolders = [...folders, newFolder]
    setFolders(updatedFolders)
    await saveFolders(updatedFolders)
    setNewFolderName("")
    setShowNewFolderInput(false)
  }

  const deleteFolder = async (id: string) => {
    const updatedFolders = folders.filter(f => f.id !== id)
    setFolders(updatedFolders)
    await saveFolders(updatedFolders)
    
    const updatedImages = generatedImages.map(img => 
      img.folderId === id ? { ...img, folderId: undefined } : img
    )
    setGeneratedImages(updatedImages)
    await saveImages(updatedImages)
    
    const updatedVideos = generatedVideos.map(vid => 
      vid.folderId === id ? { ...vid, folderId: undefined } : vid
    )
    setGeneratedVideos(updatedVideos)
    await saveVideos(updatedVideos)
  }

  const moveToFolder = async (itemId: string, folderId: string | null, type: "image" | "video") => {
    if (type === "image") {
      const updated = generatedImages.map(img => 
        img.id === itemId ? { ...img, folderId: folderId || undefined } : img
      )
      setGeneratedImages(updated)
      await saveImages(updated)
    } else {
      const updated = generatedVideos.map(vid => 
        vid.id === itemId ? { ...vid, folderId: folderId || undefined } : vid
      )
      setGeneratedVideos(updated)
      await saveVideos(updated)
    }
  }

  const filteredImages = selectedFolder 
    ? generatedImages.filter(img => img.folderId === selectedFolder)
    : generatedImages.filter(img => !img.folderId)

  const filteredVideos = selectedFolder
    ? generatedVideos.filter(vid => vid.folderId === selectedFolder)
    : generatedVideos.filter(vid => !vid.folderId)

  if (!isSignedIn && isPuterReady) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center mx-auto mb-6">
            <User size={40} className="text-primary" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Sign in to View Gallery</h1>
          <p className="text-muted-foreground mb-6">
            Your generated images and videos are saved to your Puter account.
          </p>
          <button
            onClick={handleSignIn}
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors"
          >
            <LogIn size={18} />
            Sign in with Puter
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 hover:bg-secondary rounded-lg transition-colors">
              <ArrowLeft size={20} />
            </Link>
            <div className="flex items-center gap-2">
              <Sparkles size={20} className="text-primary animate-pulse" />
              <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-primary via-purple-500 to-primary bg-clip-text text-transparent">
                Xmowg Gallery
              </h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab("image")}
            className={cn("px-4 py-2 rounded-lg text-sm", activeTab === "image" ? "bg-primary text-primary-white" : "bg-secondary")}
          >
            Images
          </button>
          <button
            onClick={() => setActiveTab("video")}
            className={cn("px-4 py-2 rounded-lg text-sm", activeTab === "video" ? "bg-primary text-primary-white" : "bg-secondary")}
          >
            Videos
          </button>
        </div>

        {activeTab === "image" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredImages.map((image) => (
              <div key={image.id} className="group relative bg-card border rounded-xl overflow-hidden">
                <img src={image.url} alt={image.prompt} className="w-full aspect-square object-cover" />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity p-4 flex flex-col justify-end">
                  <p className="text-white text-xs line-clamp-2">{image.prompt}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "video" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredVideos.map((video) => (
              <div key={video.id} className="bg-card border rounded-xl overflow-hidden">
                <video src={video.url} className="w-full aspect-video object-cover" controls />
                <div className="p-4">
                  <p className="text-sm line-clamp-2">{video.prompt}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

// 2. THE MAIN EXPORT WITH SUSPENSE (THE FIX)
export default function GalleryPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-primary font-bold">Loading Gallery...</div>
      </div>
    }>
      <GalleryContent />
    </Suspense>
  )
}

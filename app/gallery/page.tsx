"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
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

// Prompt ideas
const IMAGE_IDEAS = [
  "A cyberpunk cityscape at night with neon lights reflecting on wet streets",
  "Majestic dragon perched on a crystal mountain peak at sunset",
  "Cozy coffee shop interior with warm lighting and rain outside",
  "Futuristic spaceship interior with holographic displays",
  "Enchanted forest with glowing mushrooms and fairy lights",
  "Abstract fluid art with metallic gold and deep blue colors",
  "Ancient temple ruins reclaimed by nature with vines and moss",
  "Underwater city of merfolk with bioluminescent architecture",
  "Steampunk airship flying through golden clouds at golden hour",
  "Samurai warrior standing in a field of cherry blossoms",
  "Northern lights dancing over a snowy mountain village",
  "Art deco robot butler serving tea in a 1920s mansion",
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
  "Majestic eagle soaring through mountain peaks at golden hour",
  "Butterfly emerging from a cocoon in slow motion",
  "Ocean waves crashing on rocks in cinematic slow motion",
  "Snow falling gently on a quiet winter forest path",
]

export default function GalleryPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
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
    
    // Remove folder reference from items
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

  const imageFolders = folders.filter(f => f.type === "image")
  const videoFolders = folders.filter(f => f.type === "video")

  // Not signed in view
  if (!isSignedIn && isPuterReady) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center mx-auto mb-6">
            <User size={40} className="text-primary" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Sign in to View Gallery</h1>
          <p className="text-muted-foreground mb-6">
            Your generated images and videos are saved to your Puter account. Sign in to access your gallery.
          </p>
          <button
            onClick={handleSignIn}
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors"
          >
            <LogIn size={18} />
            Sign in with Puter
          </button>
          <div className="mt-6">
            <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Back to Chat
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 hover:bg-secondary rounded-lg transition-colors">
              <ArrowLeft size={20} />
            </Link>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Sparkles size={20} className="text-primary animate-pulse" />
              </div>
              <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-primary via-purple-500 to-primary bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">
                Xmowg Gallery
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {activeTab === "image" ? generatedImages.length : generatedVideos.length} {activeTab === "image" ? "images" : "videos"}
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-7xl mx-auto px-4 pb-3">
          <div className="flex gap-2">
            <button
              onClick={() => { setActiveTab("image"); setSelectedFolder(null) }}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all",
                activeTab === "image"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              )}
            >
              <ImageIcon size={16} />
              Images
            </button>
            <button
              onClick={() => { setActiveTab("video"); setSelectedFolder(null) }}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all",
                activeTab === "video"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              )}
            >
              <Video size={16} />
              Videos
            </button>
            <button
              onClick={() => { setActiveTab("folders"); setSelectedFolder(null) }}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all",
                activeTab === "folders"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              )}
            >
              <FolderOpen size={16} />
              Folders
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Ideas Section */}
        <div className="mb-6">
          <button
            onClick={() => setShowIdeas(!showIdeas)}
            className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:text-foreground bg-secondary/50 hover:bg-secondary rounded-lg transition-colors"
          >
            <Lightbulb size={16} />
            {showIdeas ? "Hide Ideas" : "Need Inspiration?"}
          </button>
          {showIdeas && (
            <div className="mt-4 p-4 bg-card border border-border rounded-xl animate-in fade-in slide-in-from-top-2 duration-300">
              <h3 className="text-sm font-medium mb-3">
                {activeTab === "video" ? "Video" : "Image"} Generation Ideas
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {(activeTab === "video" ? VIDEO_IDEAS : IMAGE_IDEAS).map((idea, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      // Store the idea and mode in sessionStorage to auto-send
                      sessionStorage.setItem("autoGeneratePrompt", idea)
                      sessionStorage.setItem("autoGenerateMode", activeTab === "video" ? "video" : "image")
                      router.push("/")
                    }}
                    className="p-3 text-sm bg-secondary/50 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors text-left group"
                  >
                    <span>{idea}</span>
                    <span className="ml-2 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">Click to generate</span>
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Click any idea to automatically generate it!
              </p>
            </div>
          )}
        </div>

        {/* Breadcrumb for folder view */}
        {selectedFolder && (
          <div className="flex items-center gap-2 mb-4 text-sm">
            <button
              onClick={() => setSelectedFolder(null)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Gallery
            </button>
            <ChevronRight size={14} className="text-muted-foreground" />
            <span className="text-foreground">
              {folders.find(f => f.id === selectedFolder)?.name}
            </span>
          </div>
        )}

        {/* Folders Tab */}
        {activeTab === "folders" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Your Folders</h2>
              {!showNewFolderInput ? (
                <button
                  onClick={() => setShowNewFolderInput(true)}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm bg-secondary rounded-lg hover:bg-secondary/80 transition-colors"
                >
                  <FolderPlus size={16} />
                  New Folder
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="Folder name"
                    className="px-3 py-1.5 text-sm bg-input border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
                    onKeyDown={(e) => e.key === "Enter" && createFolder()}
                    autoFocus
                  />
                  <button
                    onClick={createFolder}
                    className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                  >
                    Create
                  </button>
                  <button
                    onClick={() => { setShowNewFolderInput(false); setNewFolderName("") }}
                    className="px-3 py-1.5 text-sm bg-secondary rounded-lg hover:bg-secondary/80"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            {folders.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <FolderOpen size={48} className="mx-auto mb-4 opacity-50" />
                <p>No folders yet. Create one to organize your media!</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {folders.map((folder) => (
                  <div
                    key={folder.id}
                    className="group relative p-4 bg-card border border-border rounded-xl hover:border-primary/50 transition-all cursor-pointer"
                    onClick={() => {
                      setSelectedFolder(folder.id)
                      setActiveTab(folder.type)
                    }}
                  >
                    <FolderOpen size={32} className="text-primary mb-2" />
                    <p className="text-sm font-medium truncate">{folder.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {folder.type === "image" 
                        ? `${generatedImages.filter(i => i.folderId === folder.id).length} images`
                        : `${generatedVideos.filter(v => v.folderId === folder.id).length} videos`
                      }
                    </p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteFolder(folder.id)
                      }}
                      className="absolute top-2 right-2 p-1.5 bg-destructive/10 hover:bg-destructive/20 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 size={14} className="text-destructive" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Images Tab */}
        {activeTab === "image" && (
          <div>
            {filteredImages.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <ImageIcon size={48} className="mx-auto mb-4 opacity-50" />
                <p>
                  {selectedFolder 
                    ? "No images in this folder yet" 
                    : "No generated images yet. Go to Image mode in chat to create some!"
                  }
                </p>
                <Link href="/" className="inline-block mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90">
                  Go to Chat
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredImages.map((image) => (
                  <div
                    key={image.id}
                    className="group relative bg-card border border-border rounded-xl overflow-hidden transition-all hover:border-primary/50 hover:shadow-xl"
                  >
                    <img
                      src={image.url}
                      alt={image.prompt}
                      className="w-full aspect-square object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="absolute bottom-0 left-0 right-0 p-4">
                        <p className="text-white text-sm line-clamp-2 mb-3">{image.prompt}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-white/70">{image.model}</span>
                          <div className="flex gap-2">
                            <button
                              onClick={() => downloadFile(image.url, image.prompt, "image")}
                              className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                              title="Download"
                            >
                              <Download size={16} className="text-white" />
                            </button>
                            <button
                              onClick={() => deleteImage(image.id)}
                              className="p-2 bg-red-500/20 hover:bg-red-500/40 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={16} className="text-white" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Videos Tab */}
        {activeTab === "video" && (
          <div>
            {filteredVideos.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Video size={48} className="mx-auto mb-4 opacity-50" />
                <p>
                  {selectedFolder 
                    ? "No videos in this folder yet" 
                    : "No generated videos yet. Go to Video mode in chat to create some!"
                  }
                </p>
                <Link href="/" className="inline-block mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90">
                  Go to Chat
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredVideos.map((video) => (
                  <div
                    key={video.id}
                    className="group relative bg-card border border-border rounded-xl overflow-hidden transition-all hover:border-primary/50 hover:shadow-xl"
                  >
                    <div className="relative aspect-video">
                      <video
                        src={video.url}
                        className="w-full h-full object-cover"
                        controls
                      />
                    </div>
                    <div className="p-4">
                      <p className="text-sm line-clamp-2 mb-2">{video.prompt}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">{video.model}</span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => downloadFile(video.url, video.prompt, "video")}
                            className="p-2 bg-secondary hover:bg-secondary/80 rounded-lg transition-colors"
                            title="Download"
                          >
                            <Download size={14} />
                          </button>
                          <button
                            onClick={() => deleteVideo(video.id)}
                            className="p-2 bg-destructive/10 hover:bg-destructive/20 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={14} className="text-destructive" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { 
  ArrowLeft, 
  Download, 
  Share2, 
  Sparkles, 
  Image as ImageIcon,
  Wand2,
  Palette,
  Camera,
  Mountain,
  User,
  Building,
  Zap,
  RefreshCw
} from "lucide-react"
import { cn } from "@/lib/utils"

// Image generation presets
const IMAGE_PRESETS = [
  {
    id: "portrait",
    name: "Portrait",
    icon: User,
    prompts: [
      "Professional headshot of a confident business executive, studio lighting, neutral background",
      "Artistic portrait with dramatic side lighting, moody atmosphere",
      "Fashion model portrait with vibrant colors and creative makeup",
      "Elderly person with wise eyes, black and white photography style",
      "Young artist in their studio, natural window lighting",
    ]
  },
  {
    id: "landscape",
    name: "Landscape",
    icon: Mountain,
    prompts: [
      "Breathtaking mountain vista at golden hour, dramatic clouds",
      "Serene Japanese garden with cherry blossoms and a koi pond",
      "Vast desert dunes under a starry night sky",
      "Lush tropical rainforest with a hidden waterfall",
      "Frozen tundra with northern lights dancing in the sky",
    ]
  },
  {
    id: "architecture",
    name: "Architecture",
    icon: Building,
    prompts: [
      "Futuristic skyscraper with organic curves and living walls",
      "Ancient temple ruins reclaimed by nature, vines and moss",
      "Minimalist modern home with floor-to-ceiling windows",
      "Gothic cathedral interior with stained glass light beams",
      "Cyberpunk cityscape with neon signs and flying vehicles",
    ]
  },
  {
    id: "art",
    name: "Digital Art",
    icon: Palette,
    prompts: [
      "Abstract fluid art with vibrant neon colors and metallic accents",
      "Surrealist landscape inspired by Salvador Dali, melting clocks",
      "Geometric patterns forming an impossible structure, Escher style",
      "Impressionist garden scene with visible brushstrokes",
      "Pop art portrait in the style of Andy Warhol, bold colors",
    ]
  },
  {
    id: "fantasy",
    name: "Fantasy",
    icon: Wand2,
    prompts: [
      "Majestic dragon perched on a crystal mountain peak",
      "Enchanted forest with glowing mushrooms and fairy lights",
      "Ancient wizard casting a powerful spell, magical energy swirling",
      "Underwater city of merfolk with bioluminescent architecture",
      "Floating islands connected by rainbow bridges in the clouds",
    ]
  },
  {
    id: "scifi",
    name: "Sci-Fi",
    icon: Zap,
    prompts: [
      "Massive space station orbiting a gas giant with rings",
      "Cybernetic humanoid in a neon-lit Tokyo alley",
      "Alien landscape with bizarre flora and multiple moons",
      "Interstellar spacecraft entering a wormhole",
      "Robot uprising in a dystopian factory setting",
    ]
  },
  {
    id: "photography",
    name: "Photography",
    icon: Camera,
    prompts: [
      "Street photography in Tokyo at night, rain reflections",
      "Wildlife close-up of a tiger in its natural habitat",
      "Food photography of gourmet dessert, macro detail",
      "Sports action shot, basketball player mid-dunk",
      "Documentary style photo of artisan at work",
    ]
  },
]

interface GeneratedImage {
  id: string
  prompt: string
  url: string
  timestamp: number
  model: string
}

export default function GalleryPage() {
  const [isPuterReady, setIsPuterReady] = useState(false)
  const [selectedPreset, setSelectedPreset] = useState(IMAGE_PRESETS[0])
  const [selectedPrompt, setSelectedPrompt] = useState("")
  const [customPrompt, setCustomPrompt] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([])
  const [selectedModel, setSelectedModel] = useState("grok-2-image")

  const IMAGE_MODELS = [
    { id: "grok-2-image", name: "Grok 2 Image", provider: "xAI" },
    { id: "openai/gpt-image-1.5", name: "GPT Image 1.5", provider: "OpenAI" },
    { id: "openai/gpt-image-1-mini", name: "GPT Image Mini", provider: "OpenAI" },
    { id: "google/imagen-4.0-ultra", name: "Imagen 4 Ultra", provider: "Google" },
    { id: "black-forest-labs/flux.2-klein-9b", name: "FLUX.2 Klein 9B", provider: "Black Forest" },
  ]

  useEffect(() => {
    const checkPuter = setInterval(() => {
      if (typeof window !== "undefined" && window.puter) {
        clearInterval(checkPuter)
        setIsPuterReady(true)
        loadSavedImages()
      }
    }, 100)
    setTimeout(() => clearInterval(checkPuter), 10000)
  }, [])

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

  const saveImages = async (images: GeneratedImage[]) => {
    try {
      await window.puter.kv.set("xmowg_gallery_images", JSON.stringify(images.slice(0, 50)))
    } catch (error) {
      console.error("Error saving images:", error)
    }
  }

  const generateImage = async () => {
    const prompt = customPrompt || selectedPrompt
    if (!prompt || !isPuterReady) return

    setIsGenerating(true)

    try {
      // For xAI Grok image, use provider/model format
      let imageElement: HTMLImageElement
      
      if (selectedModel === "grok-2-image") {
        imageElement = await window.puter.ai.txt2img(prompt, {
          model: "grok-2-image",
        })
      } else {
        imageElement = await window.puter.ai.txt2img(prompt, {
          model: selectedModel,
        })
      }

      if (imageElement?.src) {
        const newImage: GeneratedImage = {
          id: `img_${Date.now()}`,
          prompt,
          url: imageElement.src,
          timestamp: Date.now(),
          model: selectedModel,
        }

        const updatedImages = [newImage, ...generatedImages]
        setGeneratedImages(updatedImages)
        await saveImages(updatedImages)
      }
    } catch (error) {
      console.error("Image generation error:", error)
    } finally {
      setIsGenerating(false)
    }
  }

  const deleteImage = async (id: string) => {
    const updatedImages = generatedImages.filter(img => img.id !== id)
    setGeneratedImages(updatedImages)
    await saveImages(updatedImages)
  }

  const downloadImage = async (url: string, prompt: string) => {
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      const link = document.createElement("a")
      link.href = URL.createObjectURL(blob)
      link.download = `xmowg-${prompt.slice(0, 30).replace(/[^a-z0-9]/gi, "_")}.png`
      link.click()
      URL.revokeObjectURL(link.href)
    } catch (error) {
      console.error("Download error:", error)
    }
  }

  const shufflePrompt = () => {
    const prompts = selectedPreset.prompts
    const randomPrompt = prompts[Math.floor(Math.random() * prompts.length)]
    setSelectedPrompt(randomPrompt)
    setCustomPrompt("")
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 hover:bg-secondary rounded-md transition-colors">
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
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {generatedImages.length} images
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Preset Categories */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Choose a Style</h2>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {IMAGE_PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => {
                  setSelectedPreset(preset)
                  setSelectedPrompt("")
                }}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 rounded-lg border transition-all whitespace-nowrap",
                  selectedPreset.id === preset.id
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card border-border hover:border-primary/50"
                )}
              >
                <preset.icon size={18} />
                <span>{preset.name}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Prompt Selection */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Prompt Presets</h2>
            <button
              onClick={shufflePrompt}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-secondary rounded-md hover:bg-secondary/80 transition-colors"
            >
              <RefreshCw size={14} />
              Random
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {selectedPreset.prompts.map((prompt, index) => (
              <button
                key={index}
                onClick={() => {
                  setSelectedPrompt(prompt)
                  setCustomPrompt("")
                }}
                className={cn(
                  "p-4 rounded-lg border text-left transition-all text-sm leading-relaxed",
                  selectedPrompt === prompt
                    ? "bg-primary/10 border-primary"
                    : "bg-card border-border hover:border-primary/50"
                )}
              >
                {prompt}
              </button>
            ))}
          </div>
        </section>

        {/* Custom Prompt & Generate */}
        <section className="mb-8 p-6 bg-card border border-border rounded-lg">
          <h3 className="text-lg font-medium mb-4">Generate Image</h3>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Custom Prompt (or use preset above)</label>
              <textarea
                value={customPrompt || selectedPrompt}
                onChange={(e) => {
                  setCustomPrompt(e.target.value)
                  setSelectedPrompt("")
                }}
                placeholder="Describe the image you want to create..."
                className="w-full h-24 px-4 py-3 bg-input border border-border rounded-md resize-none focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Model</label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="px-3 py-2 bg-input border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  {IMAGE_MODELS.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={generateImage}
                disabled={isGenerating || !isPuterReady || (!customPrompt && !selectedPrompt)}
                className={cn(
                  "flex items-center gap-2 px-6 py-3 rounded-md font-medium transition-all mt-auto",
                  isGenerating
                    ? "bg-primary/50 text-primary-foreground cursor-wait"
                    : "bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-105"
                )}
              >
                {isGenerating ? (
                  <>
                    <RefreshCw size={18} className="animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <ImageIcon size={18} />
                    Generate Image
                  </>
                )}
              </button>
            </div>
          </div>
        </section>

        {/* Generated Images Gallery */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Your Gallery</h2>
          {generatedImages.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <ImageIcon size={48} className="mx-auto mb-4 opacity-50" />
              <p>No images yet. Generate your first image above!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {generatedImages.map((image) => (
                <div
                  key={image.id}
                  className="group relative bg-card border border-border rounded-lg overflow-hidden transition-all hover:border-primary/50 hover:shadow-lg"
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
                        <span className="text-xs text-white/70">{IMAGE_MODELS.find(m => m.id === image.model)?.name || image.model}</span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => downloadImage(image.url, image.prompt)}
                            className="p-2 bg-white/10 hover:bg-white/20 rounded-md transition-colors"
                            title="Download"
                          >
                            <Download size={16} className="text-white" />
                          </button>
                          <button
                            onClick={() => {
                              setCustomPrompt(image.prompt)
                              window.scrollTo({ top: 0, behavior: "smooth" })
                            }}
                            className="p-2 bg-white/10 hover:bg-white/20 rounded-md transition-colors"
                            title="Use this prompt"
                          >
                            <RefreshCw size={16} className="text-white" />
                          </button>
                          <button
                            onClick={() => deleteImage(image.id)}
                            className="p-2 bg-red-500/20 hover:bg-red-500/40 rounded-md transition-colors"
                            title="Delete"
                          >
                            <span className="text-white text-xs">X</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

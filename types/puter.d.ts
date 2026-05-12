interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
}

interface SpeechRecognitionResultList {
  readonly length: number
  item(index: number): SpeechRecognitionResult
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionResult {
  readonly length: number
  item(index: number): SpeechRecognitionAlternative
  [index: number]: SpeechRecognitionAlternative
  isFinal: boolean
}

interface SpeechRecognitionAlternative {
  transcript: string
  confidence: number
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
  abort(): void
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: Event) => void) | null
  onend: (() => void) | null
}

declare global {
  interface Window {
    puter: {
      auth: {
        signIn: () => Promise<void>
        signOut: () => Promise<void>
        isSignedIn: () => Promise<boolean>
        getUser: () => Promise<{ username: string } | null>
      }
      kv: {
        set: (key: string, value: string) => Promise<void>
        get: (key: string) => Promise<string | null>
        del: (key: string) => Promise<void>
        list: () => Promise<string[]>
      }
      ai: {
        chat: (
          prompt: string | Array<{ role: string; content: string }>,
          options?: {
            model?: string
            stream?: boolean
            temperature?: number
            max_tokens?: number
          }
        ) => Promise<
          | { message: { content: string } }
          | AsyncIterable<{ text?: string }>
        >
        txt2img: (
          prompt: string,
          options?: { model?: string; quality?: string; width?: number; height?: number; steps?: number; negative_prompt?: string }
        ) => Promise<HTMLImageElement>
        txt2speech: (text: string, options?: { voice?: string }) => Promise<HTMLAudioElement>
      }
      peer: {
        createInvite: () => Promise<string>
      }
    }
    SpeechRecognition: new () => SpeechRecognition
    webkitSpeechRecognition: new () => SpeechRecognition
  }
}

export {}

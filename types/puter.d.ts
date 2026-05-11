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
      }
      ai: {
        chat: (
          prompt: string | Array<{ role: string; content: string }>,
          options?: {
            model?: string
            stream?: boolean
          }
        ) => Promise<
          | { message: { content: string } }
          | AsyncIterable<{ text?: string }>
        >
      }
    }
  }
}

export {}

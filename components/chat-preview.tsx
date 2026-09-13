"use client"

import * as React from "react"
import { Loader2, RefreshCw, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

export interface ChatPreviewProps {
  gameId: string
  sandboxId?: string | null
  className?: string
}

export function ChatPreview({ gameId, sandboxId, className }: ChatPreviewProps) {
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [key, setKey] = React.useState(0)

  const fetchPreviewUrl = React.useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/games/${gameId}/preview`)
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`)
      }

      if (data.url) {
        setPreviewUrl(data.url)
      } else {
        throw new Error("No preview URL returned")
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load game preview")
    } finally {
      setIsLoading(false)
    }
  }, [gameId])

  React.useEffect(() => {
    fetchPreviewUrl()
  }, [fetchPreviewUrl])

  const handleRefresh = () => {
    setKey((prev) => prev + 1)
  }

  return (
    <div className={`relative flex flex-col h-full w-full min-h-0 overflow-hidden bg-background ${className ?? ""}`}>
      {/* Top toolbar */}
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-border/60 bg-muted/30 px-3 text-xs text-muted-foreground">
        <span className="font-medium tracking-wide">Game Preview</span>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={handleRefresh}
          title="Reload preview"
          disabled={isLoading || !previewUrl}
          className="size-7 text-muted-foreground hover:text-foreground"
        >
          <RefreshCw className="size-3.5" />
          <span className="sr-only">Reload preview</span>
        </Button>
      </div>

      {/* Preview content area */}
      <div className="relative flex flex-1 h-full w-full min-h-0 items-center justify-center overflow-hidden bg-muted/10">
        {isLoading ? (
          <div className="flex flex-col items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="size-5 animate-spin text-primary" />
            <span>Starting game server...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-2 p-4 text-center text-xs text-muted-foreground">
            <AlertCircle className="size-5 text-destructive" />
            <p className="max-w-xs">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchPreviewUrl}
              className="mt-1 h-7 text-xs"
            >
              Retry
            </Button>
          </div>
        ) : previewUrl ? (
          <iframe
            key={key}
            src={previewUrl}
            title="Game Preview"
            className="h-full w-full border-0 bg-white"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-pointer-lock"
          />
        ) : null}
      </div>
    </div>
  )
}

export default ChatPreview

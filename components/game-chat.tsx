"use client"

import * as React from "react"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import { ChatThread } from "@/components/chat-thread"
import { ChatPreview } from "@/components/chat-preview"
import { Button } from "@/components/ui/button"
import { Play } from "lucide-react"
import { cn } from "@/lib/utils"

export interface GameChatProps {
  gameId: string
  sandboxId?: string | null
  initialMessages?: any[]
  initialPrompt?: string
  className?: string
}

export function GameChat({
  gameId,
  sandboxId,
  initialMessages,
  initialPrompt,
  className,
}: GameChatProps) {
  const [revision, setRevision] = React.useState(0)

  // Open preview by default if the game already has generated assistant content
  const hasExistingAssistantResponse = React.useMemo(() => {
    return (initialMessages || []).some((m: any) => {
      if (m.role === "assistant") {
        if (typeof m.content === "string" && m.content.trim().length > 0) return true
        if (Array.isArray(m.parts) && m.parts.length > 0) return true
      }
      return false
    })
  }, [initialMessages])

  const [isPreviewOpen, setIsPreviewOpen] = React.useState<boolean>(hasExistingAssistantResponse)
  const [isSliding, setIsSliding] = React.useState<boolean>(false)

  // When AI finishes turn, bump revision and slide open the preview if not yet open
  const handleTurnComplete = React.useCallback(() => {
    setRevision((prev) => prev + 1)
    setIsPreviewOpen((wasOpen) => {
      if (!wasOpen) {
        setIsSliding(true)
        setTimeout(() => setIsSliding(false), 600)
        return true
      }
      return wasOpen
    })
  }, [])

  const handleOpenPreview = React.useCallback(() => {
    setIsSliding(true)
    setIsPreviewOpen(true)
    setTimeout(() => setIsSliding(false), 600)
  }, [])

  const handleClosePreview = React.useCallback(() => {
    setIsPreviewOpen(false)
  }, [])

  return (
    <div className={cn("relative flex h-full w-full min-h-0 flex-1 overflow-hidden", className)}>
      {!isPreviewOpen ? (
        <div className="relative flex flex-1 h-full w-full min-h-0 overflow-hidden">
          {/* Floating pill button to reopen preview manually */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenPreview}
            className="absolute top-3 right-4 z-20 flex items-center gap-1.5 shadow-sm backdrop-blur bg-background/80 hover:bg-muted text-xs h-8 px-3 rounded-full border border-border/80 transition-transform active:scale-95"
          >
            <Play className="size-3.5 fill-primary text-primary" />
            <span className="font-medium">Game Preview</span>
          </Button>

          <ChatThread
            gameId={gameId}
            initialMessages={initialMessages}
            initialPrompt={initialPrompt}
            onTurnComplete={handleTurnComplete}
          />
        </div>
      ) : (
        <ResizablePanelGroup
          orientation="horizontal"
          className="h-full w-full min-h-0 flex-1 overflow-hidden"
        >
          <ResizablePanel
            defaultSize={50}
            minSize={30}
            className={cn(
              "flex flex-col h-full min-h-0 overflow-hidden",
              isSliding && "transition-all duration-500 ease-out"
            )}
          >
            <ChatThread
              gameId={gameId}
              initialMessages={initialMessages}
              initialPrompt={initialPrompt}
              onTurnComplete={handleTurnComplete}
            />
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel
            defaultSize={50}
            minSize={25}
            className={cn(
              "flex flex-col h-full min-h-0 overflow-hidden",
              isSliding && "transition-all duration-500 ease-out"
            )}
          >
            <div
              className={cn(
                "h-full w-full min-h-0",
                isSliding && "animate-in slide-in-from-right-full fade-in duration-500 ease-out"
              )}
            >
              <ChatPreview
                gameId={gameId}
                sandboxId={sandboxId}
                revision={revision}
                onClose={handleClosePreview}
              />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      )}
    </div>
  )
}

export default GameChat

"use client"

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import { ChatThread } from "@/components/chat-thread"
import { ChatPreview } from "@/components/chat-preview"
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
  if (!sandboxId) {
    return (
      <div className={cn("h-full w-full min-h-0 flex-1 overflow-hidden", className)}>
        <ChatThread
          gameId={gameId}
          initialMessages={initialMessages}
          initialPrompt={initialPrompt}
        />
      </div>
    )
  }

  return (
    <ResizablePanelGroup
      orientation="horizontal"
      className={cn("h-full w-full min-h-0 flex-1 overflow-hidden", className)}
    >
      <ResizablePanel
        defaultSize={50}
        minSize={30}
        className="flex flex-col h-full min-h-0 overflow-hidden"
      >
        <ChatThread
          gameId={gameId}
          initialMessages={initialMessages}
          initialPrompt={initialPrompt}
        />
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel
        defaultSize={50}
        minSize={30}
        className="flex flex-col h-full min-h-0 overflow-hidden"
      >
        <ChatPreview gameId={gameId} sandboxId={sandboxId} />
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}

export default GameChat

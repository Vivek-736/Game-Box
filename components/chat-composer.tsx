"use client"

import * as React from "react"
import {
  ArrowUp,
  ChevronDown,
  Grip,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupTextarea,
} from "@/components/ui/input-group"
import { createGame } from "@/lib/games/actions"

export function ChatComposer() {
  const [title, setTitle] = React.useState("")
  const [isPending, startTransition] = React.useTransition()

  const handleCreateGame = (customTitle?: string) => {
    const titleToCreate = (customTitle ?? title).trim()
    
    if (!titleToCreate || isPending) return

    startTransition(async () => {
      try {
        await createGame(titleToCreate)
        setTitle("")
      } catch (error) {
        console.error("Failed to create game:", error)
      }
    })
  }

  return (
    <div className="w-full">
      <InputGroup className="h-auto flex-col items-stretch rounded-2xl border-input/80 bg-background/60 p-2 shadow-sm backdrop-blur-xs transition-all focus-within:ring-2 focus-within:ring-ring/20">
        <InputGroupTextarea
          placeholder="Describe the game you want to build..."
          className="h-12 min-h-12 max-h-12 w-full resize-none overflow-y-auto py-1 text-base placeholder:text-muted-foreground/70 md:text-sm"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={isPending}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              handleCreateGame()
            }
          }}
        />
        <InputGroupAddon
          align="block-end"
          className="flex w-full items-center justify-between pt-2"
        >
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1.5 px-2 text-xs font-normal text-muted-foreground hover:text-foreground"
                />
              }
            >
              <Grip className="size-3.5" />
              <span>Kimi K3</span>
              <ChevronDown className="size-3 opacity-60" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem>Kimi K3</DropdownMenuItem>
              <DropdownMenuItem>Claude 3.7 Sonnet</DropdownMenuItem>
              <DropdownMenuItem>GPT-4o</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            size="icon"
            className="size-8 rounded-full"
            disabled={isPending || !title.trim()}
            onClick={() => handleCreateGame()}
          >
            {isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ArrowUp className="size-4" />
            )}
            <span className="sr-only">Send message</span>
          </Button>
        </InputGroupAddon>
      </InputGroup>
    </div>
  )
}

export { ChatComposer as ChatCompose }

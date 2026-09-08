"use client"

import * as React from "react"
import {
  ArrowUp,
  Car,
  ChevronDown,
  Crosshair,
  Gamepad2,
  Grip,
  Loader2,
  Pickaxe,
  Plane,
  Swords,
  Zap,
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

const SUGGESTIONS = [
  { label: "Voxel survival", icon: Pickaxe },
  { label: "Ink samurai duel", icon: Swords },
  { label: "Comic-book firefight", icon: Zap },
  { label: "Realistic battlefield", icon: Plane },
  { label: "Fight-first shooter", icon: Crosshair },
  { label: "Jungle expedition drive", icon: Car },
  { label: "Sunny kingdom platformer", icon: Gamepad2 },
]

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
    <div className="flex w-full flex-col gap-4">
      <InputGroup className="h-auto flex-col items-stretch rounded-2xl border-input/80 bg-background/60 p-2 shadow-sm backdrop-blur-xs transition-all focus-within:ring-2 focus-within:ring-ring/20">
        <InputGroupTextarea
          placeholder="Describe the game you want to build..."
          className="min-h-24 w-full text-base placeholder:text-muted-foreground/70 md:text-sm"
          rows={3}
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

      <div className="flex flex-wrap items-center justify-center gap-2">
        {SUGGESTIONS.map((suggestion) => {
          const Icon = suggestion.icon
          return (
            <Button
              key={suggestion.label}
              variant="outline"
              size="sm"
              className="rounded-full gap-2 text-xs font-normal text-muted-foreground hover:text-foreground"
              disabled={isPending}
              onClick={() => handleCreateGame(suggestion.label)}
            >
              <Icon className="size-3.5" />
              <span>{suggestion.label}</span>
            </Button>
          )
        })}
      </div>
    </div>
  )
}

export { ChatComposer as ChatCompose }

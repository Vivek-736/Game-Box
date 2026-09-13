"use client"

import * as React from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { ChatComposer } from "@/components/chat-composer"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { SUGGESTIONS } from "@/lib/game/suggestion"
import { createGame } from "@/lib/games/actions"

export default function Page() {
  const router = useRouter()
  const [value, setValue] = React.useState("")
  const [isPending, startTransition] = React.useTransition()

  const handleCreateGame = (titleToCreate?: string) => {
    const title = (titleToCreate ?? value).trim()
    if (!title || isPending) return

    startTransition(async () => {
      try {
        const newGame = await createGame(title)
        router.push(`/games/${newGame.id}?prompt=${encodeURIComponent(title)}`)
      } catch (error) {
        console.error("Failed to create game:", error)
      }
    })
  }

  const handleSuggestionClick = (label: string) => {
    handleCreateGame(label)
  }

  return (
    <div className="flex flex-1 flex-col h-full min-h-0 -mt-10 overflow-y-auto">
      <Empty className="flex min-h-[calc(100svh-10rem)] my-auto">
        <EmptyHeader>
          <EmptyMedia>
            <Image src="/logo.svg" alt="GameBox" width={48} height={48} />
          </EmptyMedia>
          <EmptyTitle className="text-2xl">
            What should we build today?
          </EmptyTitle>
          <EmptyDescription className="text-muted-foreground">
            Build your own racers, shooters, puzzles and whole worlds using your
            own words. If you can describe it, you can play it.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent className="w-full max-w-2xl gap-6">
          <ChatComposer
            value={value}
            onValueChange={setValue}
            onSubmit={handleCreateGame}
            isPending={isPending}
          />
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
                  onClick={() => handleSuggestionClick(suggestion.label)}
                >
                  <Icon className="size-3.5" />
                  <span>{suggestion.label}</span>
                </Button>
              )
            })}
          </div>
        </EmptyContent>
      </Empty>
    </div>
  )
}
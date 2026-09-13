import { notFound } from "next/navigation"
import { ChatThread } from "@/components/chat-thread"
import { getGame } from "@/lib/games/queries"

interface GamePageProps {
  params: Promise<{
    id: string
  }>
  searchParams?: Promise<{
    prompt?: string | string[]
  }>
}

export default async function GamePage({ 
  params,
  searchParams,
}: GamePageProps) {
  const { id } = await params
  const sp = searchParams ? await searchParams : undefined
  
  const prompt =
    typeof sp?.prompt === "string"
      ? sp.prompt
      : Array.isArray(sp?.prompt)
      ? sp.prompt[0]
      : undefined

  const game = await getGame(id)

  if (!game) {
    notFound()
  }
  
  return (
    <div className="flex flex-1 flex-col h-full min-h-0 overflow-hidden">
      <ChatThread
        key={game.id}
        gameId={game.id}
        initialMessages={game.messages ?? []}
        initialPrompt={prompt}
      />
    </div>
  )
}
import { ChatThread } from "@/components/chat-thread"

interface GamePageProps {
  params: Promise<{
    id: string
  }>
}

export default async function GamePage({ 
  params 
}: GamePageProps) {
  await params
  
  return (
    <div className="flex flex-1 flex-col h-svh pt-14 overflow-hidden">
      <ChatThread />
    </div>
  )
}
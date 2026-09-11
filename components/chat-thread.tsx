"use client"

import * as React from "react"
import Image from "next/image"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { cn } from "@/lib/utils"
import {
  Message,
  MessageAvatar,
  MessageContent,
} from "@/components/ui/message"
import {
  Bubble,
  BubbleContent,
} from "@/components/ui/bubble"
import { ChatComposer } from "@/components/chat-composer"

export interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
}

export interface ChatThreadProps extends React.ComponentProps<"div"> {
  initialMessages?: ChatMessage[]
}

function getMessageText(message: any): string {
  if (Array.isArray(message.parts)) {
    return message.parts
      .filter((p: any) => p.type === "text")
      .map((p: any) => p.text)
      .join("")
  }
  return typeof message.content === "string" ? message.content : ""
}

export function ChatThread({
  className,
  ...props
}: ChatThreadProps) {
  const [input, setInput] = React.useState("")
  const viewportRef = React.useRef<HTMLDivElement>(null)
  const isAtBottomRef = React.useRef(true)

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
    }),
  })

  const isGenerating = status === "submitted" || status === "streaming"

  const handleScroll = () => {
    const el = viewportRef.current
    if (!el) return
    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    isAtBottomRef.current = distanceToBottom < 80
  }

  React.useEffect(() => {
    const el = viewportRef.current
    if (!el) return

    // Threshold check: only scroll if messages cross the viewport height threshold
    const isOverflowing = el.scrollHeight > el.clientHeight
    if (isOverflowing) {
      if (isAtBottomRef.current) {
        el.scrollTo({
          top: el.scrollHeight,
          behavior: "smooth",
        })
      }
    } else {
      // Keep scrollTop at 0 when content fits within viewport
      el.scrollTop = 0
    }
  }, [messages, status])

  const handleSendMessage = (value: string) => {
    const trimmed = value.trim()
    if (!trimmed || isGenerating) return

    isAtBottomRef.current = true
    sendMessage({ text: trimmed })
    setInput("")
  }

  return (
    <div
      className={cn(
        "flex flex-1 flex-col h-full w-full min-h-0 overflow-hidden",
        className
      )}
      {...props}
    >
      {/* Scrollable messages container - only scrolls once content exceeds viewport */}
      <div
        ref={viewportRef}
        onScroll={handleScroll}
        className="flex-1 min-h-0 w-full overflow-y-auto p-4 sm:p-6 scroll-smooth"
      >
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
          {messages.map((message) => {
            const text = getMessageText(message)
            if (!text && message.role === "assistant" && isGenerating) {
              return null
            }

            return (
              <Message
                key={message.id}
                align={message.role === "user" ? "end" : "start"}
              >
                {message.role === "assistant" && (
                  <MessageAvatar className="size-8 min-w-0">
                    <Image
                      src="/icon.svg"
                      alt="GameBox AI"
                      width={28}
                      height={28}
                      className="size-full object-cover"
                    />
                  </MessageAvatar>
                )}
                <MessageContent>
                  <Bubble
                    variant={message.role === "user" ? "secondary" : "ghost"}
                  >
                    <BubbleContent className="whitespace-pre-wrap">{text}</BubbleContent>
                  </Bubble>
                </MessageContent>
              </Message>
            )
          })}

          {status === "submitted" && (
            <Message align="start">
              <MessageAvatar className="size-8 min-w-0">
                <Image
                  src="/icon.svg"
                  alt="GameBox AI"
                  width={28}
                  height={28}
                  className="size-full object-cover"
                />
              </MessageAvatar>
              <MessageContent>
                <Bubble variant="ghost">
                  <BubbleContent className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="inline-block size-1.5 animate-pulse rounded-full bg-primary" />
                    <span>Generating response...</span>
                  </BubbleContent>
                </Bubble>
              </MessageContent>
            </Message>
          )}
        </div>
      </div>

      {/* Pinned composer */}
      <div className="mx-auto w-full max-w-2xl p-4 shrink-0">
        <ChatComposer
          value={input}
          onValueChange={setInput}
          onSubmit={handleSendMessage}
          isPending={isGenerating}
        />
      </div>
    </div>
  )
}

export default ChatThread

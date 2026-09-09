"use client"

import * as React from "react"
import Image from "next/image"
import { cn } from "@/lib/utils"
import {
  MessageScrollerProvider,
  MessageScroller,
  MessageScrollerViewport,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerButton,
} from "@/components/ui/message-scroller"
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

export const MOCK_MESSAGES: ChatMessage[] = [
  {
    id: "1",
    role: "assistant",
    content:
      "Welcome to GameBox! I'm your AI game development companion. Describe any game you want to build and I'll generate the mechanics, art style, and world rules for you.",
  },
  {
    id: "2",
    role: "user",
    content:
      "I want to build a neon cyberpunk hoverbike racer set in Neo-Tokyo with rain-slicked streets, drifting physics, and weapon pickups.",
  },
  {
    id: "3",
    role: "assistant",
    content:
      "That sounds incredible! I've scaffolded the hovercraft physics engine with high-speed air-braking and neon particle trails. For weapon pickups, how about EMP pulses that disrupt rival thrusters and nitro warp gates scattered along the highway?",
  },
  {
    id: "4",
    role: "user",
    content:
      "Yes! Add 3 AI rivals with aggressive rubberbanding and dynamic synthwave music that speeds up during lap 3.",
  },
  {
    id: "5",
    role: "assistant",
    content:
      "Done! 3 AI competitors are configured with adaptive overtaking behavior, and the procedural synthwave soundtrack now transitions dynamically on the final showdown lap. What should we work on next — hazard obstacles or customizable bike chassis?",
  },
]

export interface ChatThreadProps extends React.ComponentProps<"div"> {
  messages?: ChatMessage[]
}

export function ChatThread({
  className,
  messages = MOCK_MESSAGES,
  ...props
}: ChatThreadProps) {
  return (
    <div
      className={cn(
        "flex flex-1 flex-col h-full w-full min-h-0 overflow-hidden",
        className
      )}
      {...props}
    >
      <MessageScrollerProvider defaultScrollPosition="end">
        <MessageScroller className="flex-1 min-h-0">
          <MessageScrollerViewport className="p-4 sm:p-6">
            <MessageScrollerContent className="mx-auto flex w-full max-w-2xl flex-col gap-4">
              {messages.map((message) => (
                <MessageScrollerItem key={message.id} messageId={message.id}>
                  <Message align={message.role === "user" ? "end" : "start"}>
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
                        <BubbleContent>{message.content}</BubbleContent>
                      </Bubble>
                    </MessageContent>
                  </Message>
                </MessageScrollerItem>
              ))}
              <MessageScrollerItem scrollAnchor />
            </MessageScrollerContent>
          </MessageScrollerViewport>
          <MessageScrollerButton />
        </MessageScroller>
      </MessageScrollerProvider>

      <div className="mx-auto w-full max-w-2xl p-4 shrink-0">
        <ChatComposer />
      </div>
    </div>
  )
}

export default ChatThread

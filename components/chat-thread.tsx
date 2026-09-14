"use client"

import * as React from "react"
import Image from "next/image"
import { useChat } from "@ai-sdk/react"
import { useTriggerChatTransport } from "@trigger.dev/sdk/chat/react"
import type { gameChat } from "@/trigger/chat"
import { mintChatAccessToken, startChatSession } from "@/app/actions"
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
import {
  Marker,
  MarkerIcon,
  MarkerContent,
} from "@/components/ui/marker"
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react"
import { MarkdownContent } from "@/components/markdown-content"
import { ChatComposer } from "@/components/chat-composer"

export interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
}

export interface ChatThreadProps extends React.ComponentProps<"div"> {
  gameId: string
  initialMessages?: any[]
  initialPrompt?: string
  onTurnComplete?: () => void
}

export type ToolCallState = "active" | "done" | "failed"

export interface ToolCallInfo {
  toolName: string
  state: ToolCallState
  input?: any
  output?: any
  error?: string
}

function isToolPart(part: any): boolean {
  if (!part || typeof part !== "object") return false
  if (part.type === "tool-invocation" || Boolean(part.toolInvocation)) return true
  if (
    typeof part.type === "string" &&
    (part.type.startsWith("tool-") || part.type === "dynamic-tool")
  ) {
    return true
  }
  return false
}

function getToolCallInfo(part: any, isGenerating: boolean): ToolCallInfo {
  // Case 1: AI SDK 4 / legacy tool-invocation
  if (part.type === "tool-invocation" || part.toolInvocation) {
    const ti = part.toolInvocation || part
    const toolName = ti.toolName || "tool"
    const input = ti.args
    const isDone = ti.state === "result"

    if (isDone) {
      const isFailed =
        Boolean(part.isError) ||
        Boolean(ti.isError) ||
        ti.result?.success === false ||
        Boolean(ti.result?.error)
      return {
        toolName,
        state: isFailed ? "failed" : "done",
        input,
        output: ti.result,
        error:
          ti.result?.error ||
          (isFailed ? ti.result?.message || "Tool execution failed" : undefined),
      }
    }

    return {
      toolName,
      state: isGenerating ? "active" : "failed",
      input,
      error: isGenerating ? undefined : "Interrupted",
    }
  }

  // Case 2: AI SDK 5 tool-* or dynamic-tool
  const toolName =
    part.type === "dynamic-tool"
      ? part.toolName || "tool"
      : typeof part.type === "string" && part.type.startsWith("tool-")
      ? part.type.slice(5)
      : "tool"

  const input = part.input
  const state = part.state

  if (state === "output-error") {
    return {
      toolName,
      state: "failed",
      input,
      error: part.errorText || "Tool execution failed",
    }
  }

  if (state === "output-denied") {
    return {
      toolName,
      state: "failed",
      input,
      error: "Tool execution denied",
    }
  }

  if (state === "output-available") {
    const output = part.output
    const isFailed = output?.success === false || Boolean(output?.error)
    return {
      toolName,
      state: isFailed ? "failed" : "done",
      input,
      output,
      error:
        output?.error ||
        (isFailed ? output?.message || "Tool execution failed" : undefined),
    }
  }

  return {
    toolName,
    state: isGenerating ? "active" : "failed",
    input,
    error: isGenerating ? undefined : "Interrupted",
  }
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

function formatToolLabel(info: ToolCallInfo): { label: string; detail?: string } {
  const { toolName, state, input, error, output } = info
  const rawPath = input?.path ? String(input.path) : undefined
  const cleanPath = rawPath?.replace(/^\/home\/daytona\/game\/?/, "")

  let label = ""
  let detail: string | undefined

  switch (toolName) {
    case "write_file":
      if (state === "active") {
        label = cleanPath ? `Writing ${cleanPath}...` : "Writing file..."
      } else if (state === "done") {
        label = cleanPath ? `Wrote ${cleanPath}` : "Wrote file"
        if (output?.bytesWritten && typeof output.bytesWritten === "number") {
          detail = formatBytes(output.bytesWritten)
        }
      } else {
        label = cleanPath ? `Failed to write ${cleanPath}` : "Failed to write file"
      }
      break

    case "replace_text":
      if (state === "active") {
        label = cleanPath ? `Updating ${cleanPath}...` : "Updating file..."
      } else if (state === "done") {
        label = cleanPath ? `Updated ${cleanPath}` : "Updated file"
        if (output?.occurrencesReplaced) {
          detail = `${output.occurrencesReplaced} replaced`
        }
      } else {
        label = cleanPath ? `Failed to update ${cleanPath}` : "Failed to update file"
      }
      break

    case "read_file":
      if (state === "active") {
        label = cleanPath ? `Reading ${cleanPath}...` : "Reading file..."
      } else if (state === "done") {
        label = cleanPath ? `Read ${cleanPath}` : "Read file"
      } else {
        label = cleanPath ? `Failed to read ${cleanPath}` : "Failed to read file"
      }
      break

    case "list_files":
      if (state === "active") {
        label = cleanPath ? `Listing files in ${cleanPath}...` : "Listing files..."
      } else if (state === "done") {
        label = cleanPath ? `Listed files in ${cleanPath}` : "Listed files"
        if (Array.isArray(output?.files)) {
          detail = `${output.files.length} items`
        }
      } else {
        label = cleanPath ? `Failed to list files in ${cleanPath}` : "Failed to list files"
      }
      break

    case "delete_file":
      if (state === "active") {
        label = cleanPath ? `Deleting ${cleanPath}...` : "Deleting file..."
      } else if (state === "done") {
        label = cleanPath ? `Deleted ${cleanPath}` : "Deleted file"
      } else {
        label = cleanPath ? `Failed to delete ${cleanPath}` : "Failed to delete file"
      }
      break

    default: {
      const friendlyName = toolName
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase())
      if (state === "active") {
        label = `Running ${friendlyName}...`
      } else if (state === "done") {
        label = `Completed ${friendlyName}`
      } else {
        label = `Failed ${friendlyName}`
      }
      break
    }
  }

  if (state === "failed") {
    detail = error || detail || "Error"
  }

  return { label, detail }
}

function ToolCallMarker({
  part,
  isGenerating,
}: {
  part: any
  isGenerating: boolean
}) {
  const toolInfo = getToolCallInfo(part, isGenerating)
  const { label, detail } = formatToolLabel(toolInfo)

  return (
    <Marker
      variant="default"
      className={cn(
        "py-1 px-2.5 rounded-lg border text-xs transition-colors duration-200 w-fit max-w-full",
        toolInfo.state === "active" && "border-primary/30 bg-primary/5 text-foreground",
        toolInfo.state === "done" && "border-border/50 bg-muted/30 text-muted-foreground",
        toolInfo.state === "failed" && "border-destructive/30 bg-destructive/5 text-destructive"
      )}
    >
      <MarkerIcon className="flex items-center justify-center">
        {toolInfo.state === "active" && (
          <Loader2 className="size-3.5 animate-spin text-primary" />
        )}
        {toolInfo.state === "done" && (
          <CheckCircle2 className="size-3.5 text-emerald-500" />
        )}
        {toolInfo.state === "failed" && (
          <AlertCircle className="size-3.5 text-destructive" />
        )}
      </MarkerIcon>
      <MarkerContent className="flex items-center gap-1.5 min-w-0">
        <span
          className={cn(
            "font-medium truncate",
            toolInfo.state === "active" && "text-foreground",
            toolInfo.state === "done" && "text-muted-foreground",
            toolInfo.state === "failed" && "text-destructive"
          )}
        >
          {label}
        </span>
        {detail && (
          <span
            className={cn(
              "text-[11px] font-mono truncate max-w-xs",
              toolInfo.state === "failed" ? "text-destructive/80" : "text-muted-foreground/70"
            )}
            title={detail}
          >
            ({detail})
          </span>
        )}
      </MarkerContent>
    </Marker>
  )
}

type RenderableSection =
  | { type: "tool"; part: any; index: number }
  | { type: "text"; text: string; index: number }

function getMessageSections(message: any): RenderableSection[] {
  if (!Array.isArray(message.parts) || message.parts.length === 0) {
    const text = typeof message.content === "string" ? message.content : ""
    return text ? [{ type: "text", text, index: 0 }] : []
  }

  const sections: RenderableSection[] = []
  let currentText = ""
  let textIndex = 0

  for (let i = 0; i < message.parts.length; i++) {
    const part = message.parts[i]
    if (isToolPart(part)) {
      if (currentText) {
        sections.push({ type: "text", text: currentText, index: textIndex })
        currentText = ""
      }
      sections.push({ type: "tool", part, index: i })
    } else if (part.type === "text" && typeof part.text === "string") {
      if (!currentText) {
        textIndex = i
      }
      currentText += part.text
    }
  }

  if (currentText) {
    sections.push({ type: "text", text: currentText, index: textIndex })
  }

  return sections
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
  gameId,
  initialMessages = [],
  initialPrompt,
  onTurnComplete,
  className,
  ...props
}: ChatThreadProps) {
  const [input, setInput] = React.useState("")
  const viewportRef = React.useRef<HTMLDivElement>(null)
  const isAtBottomRef = React.useRef(true)
  const initialPromptSubmittedRef = React.useRef(false)

  const normalizedInitialMessages = React.useMemo(() => {
    return (initialMessages || []).map((m: any, idx: number) => {
      if (Array.isArray(m.parts)) return m
      return {
        id: m.id || `msg-${idx}`,
        role: m.role || "user",
        parts: [{ type: "text", text: typeof m.content === "string" ? m.content : "" }],
      }
    })
  }, [initialMessages])

  const transport = useTriggerChatTransport<typeof gameChat>({
    task: "game-chat",
    accessToken: ({ chatId }) => mintChatAccessToken(chatId),
    startSession: ({ chatId, clientData }) =>
      startChatSession({ chatId, clientData }),
  })

  const { messages, sendMessage, stop: aiStop, status } = useChat({
    id: gameId,
    messages: normalizedInitialMessages,
    transport,
    resume: normalizedInitialMessages.length > 0,
    onFinish: () => {
      onTurnComplete?.()
    },
  })

  const isGenerating = status === "submitted" || status === "streaming"

  const prevStatusRef = React.useRef(status)
  React.useEffect(() => {
    if (
      (prevStatusRef.current === "streaming" || prevStatusRef.current === "submitted") &&
      status === "ready"
    ) {
      onTurnComplete?.()
    }
    prevStatusRef.current = status
  }, [status, onTurnComplete])

  const displayMessages = React.useMemo(() => {
    const seenIds = new Map<string, number>()
    const deduped: typeof messages = []

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i]
      const id = msg.id || `msg-${i}`

      if (seenIds.has(id)) {
        const prevIndex = seenIds.get(id)!
        const prevMsg = deduped[prevIndex]
        const prevPartsLen = Array.isArray(prevMsg.parts) ? prevMsg.parts.length : 0
        const newPartsLen = Array.isArray(msg.parts) ? msg.parts.length : 0
        if (newPartsLen >= prevPartsLen) {
          deduped[prevIndex] = msg
        }
      } else {
        seenIds.set(id, deduped.length)
        deduped.push(msg)
      }
    }

    return deduped
  }, [messages])

  const handleStop = React.useCallback(() => {
    transport.stopGeneration(gameId)
    aiStop()
  }, [transport, gameId, aiStop])

  React.useEffect(() => {
    if (
      initialPrompt &&
      !initialPromptSubmittedRef.current &&
      normalizedInitialMessages.length === 0
    ) {
      initialPromptSubmittedRef.current = true

      if (typeof window !== "undefined") {
        const url = new URL(window.location.href)
        if (url.searchParams.has("prompt")) {
          url.searchParams.delete("prompt")
          const cleanUrl = url.pathname + (url.search ? url.search : "")
          window.history.replaceState(null, "", cleanUrl)
        }
      }

      isAtBottomRef.current = true
      sendMessage({ text: initialPrompt })
    }
  }, [initialPrompt, normalizedInitialMessages.length, sendMessage])

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
      el.scrollTop = 0
    }
  }, [displayMessages, status])

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
          {displayMessages.map((message, msgIndex) => {
            const messageKey = message.id
              ? `${message.id}-${msgIndex}`
              : `msg-${msgIndex}`

            if (message.role === "user") {
              const text = getMessageText(message)
              return (
                <Message key={messageKey} align="end">
                  <MessageContent>
                    <Bubble variant="secondary">
                      <BubbleContent className="whitespace-pre-wrap">
                        {text}
                      </BubbleContent>
                    </Bubble>
                  </MessageContent>
                </Message>
              )
            }

            // Assistant message
            const sections = getMessageSections(message)

            if (sections.length === 0) {
              if (isGenerating) {
                return (
                  <Message key={messageKey} align="start">
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
                          <span>Thinking...</span>
                        </BubbleContent>
                      </Bubble>
                    </MessageContent>
                  </Message>
                )
              }
              return null
            }

            return (
              <Message key={messageKey} align="start">
                <MessageAvatar className="size-8 min-w-0">
                  <Image
                    src="/icon.svg"
                    alt="GameBox AI"
                    width={28}
                    height={28}
                    className="size-full object-cover"
                  />
                </MessageAvatar>
                <MessageContent className="gap-2">
                  {sections.map((section) => {
                    if (section.type === "tool") {
                      return (
                        <ToolCallMarker
                          key={`tool-${section.index}`}
                          part={section.part}
                          isGenerating={isGenerating}
                        />
                      )
                    }

                    return (
                      <Bubble key={`text-${section.index}`} variant="ghost">
                        <BubbleContent className="text-sm">
                          <MarkdownContent content={section.text} />
                        </BubbleContent>
                      </Bubble>
                    )
                  })}
                </MessageContent>
              </Message>
            )
          })}

          {status === "submitted" &&
            displayMessages[displayMessages.length - 1]?.role !== "assistant" && (
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
          onStop={handleStop}
          isPending={isGenerating}
        />
      </div>
    </div>
  )
}

export default ChatThread;

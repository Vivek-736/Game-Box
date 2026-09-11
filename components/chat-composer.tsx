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

export interface ChatComposerProps {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  onSubmit?: (value: string) => void
  isPending?: boolean
  disabled?: boolean
  placeholder?: string
  className?: string
  autoFocus?: boolean
}

export function ChatComposer({
  value: controlledValue,
  defaultValue = "",
  onValueChange,
  onChange,
  onSubmit,
  isPending = false,
  disabled = false,
  placeholder = "Describe the game you want to build...",
  className,
  autoFocus,
}: ChatComposerProps) {
  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue)
  const isControlled = controlledValue !== undefined
  const value = isControlled ? controlledValue : uncontrolledValue

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange?.(e)
    onValueChange?.(e.target.value)
    if (!isControlled) {
      setUncontrolledValue(e.target.value)
    }
  }

  const handleSubmit = () => {
    const trimmed = value.trim()
    if (!trimmed || isPending || disabled) return

    onSubmit?.(trimmed)
    if (!isControlled) {
      setUncontrolledValue("")
    }
  }

  const isDisabled = disabled || isPending

  return (
    <div className={className ?? "w-full"}>
      <InputGroup className="h-auto flex-col items-stretch rounded-2xl border-input/80 bg-background/60 p-2 shadow-sm backdrop-blur-xs transition-all focus-within:ring-2 focus-within:ring-ring/20">
        <InputGroupTextarea
          placeholder={placeholder}
          className="h-12 min-h-12 max-h-12 w-full resize-none overflow-y-auto py-1 text-base placeholder:text-muted-foreground/70 md:text-sm"
          value={value}
          onChange={handleChange}
          disabled={isDisabled}
          autoFocus={autoFocus}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              handleSubmit()
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
            disabled={isDisabled || !value.trim()}
            onClick={handleSubmit}
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

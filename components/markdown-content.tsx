"use client"

import * as React from "react"
import Markdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { cn } from "@/lib/utils"

export interface MarkdownContentProps {
  content: string
  className?: string
}

export const MarkdownContent = React.memo(function MarkdownContent({
  content,
  className,
}: MarkdownContentProps) {
  return (
    <div className={cn("markdown-body text-sm leading-relaxed", className)}>
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1({ children, ...props }) {
            return (
              <h1
                className="mt-4 mb-2 text-base font-bold tracking-tight text-foreground"
                {...props}
              >
                {children}
              </h1>
            )
          },
          h2({ children, ...props }) {
            return (
              <h2
                className="mt-3.5 mb-1.5 text-base font-semibold tracking-tight text-foreground"
                {...props}
              >
                {children}
              </h2>
            )
          },
          h3({ children, ...props }) {
            return (
              <h3
                className="mt-3 mb-1 text-sm font-semibold tracking-tight text-foreground"
                {...props}
              >
                {children}
              </h3>
            )
          },
          p({ children, ...props }) {
            return (
              <p
                className="my-1.5 first:mt-0 last:mb-0 text-sm leading-relaxed text-foreground/90"
                {...props}
              >
                {children}
              </p>
            )
          },
          ul({ children, ...props }) {
            return (
              <ul
                className="my-2 ml-5 list-disc space-y-1 text-sm text-foreground/90 marker:text-muted-foreground"
                {...props}
              >
                {children}
              </ul>
            )
          },
          ol({ children, ...props }) {
            return (
              <ol
                className="my-2 ml-5 list-decimal space-y-1 text-sm text-foreground/90 marker:text-muted-foreground"
                {...props}
              >
                {children}
              </ol>
            )
          },
          li({ children, ...props }) {
            return (
              <li className="pl-1 leading-relaxed" {...props}>
                {children}
              </li>
            )
          },
          strong({ children, ...props }) {
            return (
              <strong className="font-semibold text-foreground" {...props}>
                {children}
              </strong>
            )
          },
          em({ children, ...props }) {
            return (
              <em className="italic text-foreground/90" {...props}>
                {children}
              </em>
            )
          },
          blockquote({ children, ...props }) {
            return (
              <blockquote
                className="my-2.5 border-l-2 border-primary/60 pl-3 italic text-muted-foreground text-sm"
                {...props}
              >
                {children}
              </blockquote>
            )
          },
          code({ className: codeClassName, children, ...props }) {
            const hasNewline = String(children).includes("\n")
            const isInline = !codeClassName && !hasNewline

            if (isInline) {
              return (
                <code
                  className={cn(
                    "rounded bg-muted/80 px-1.5 py-0.5 font-mono text-[12px] font-medium text-foreground border border-border/50",
                    codeClassName
                  )}
                  {...props}
                >
                  {children}
                </code>
              )
            }

            return (
              <code
                className={cn("font-mono text-xs text-foreground", codeClassName)}
                {...props}
              >
                {children}
              </code>
            )
          },
          pre({ children, ...props }) {
            return (
              <pre
                className="my-2.5 overflow-x-auto rounded-lg border border-border/60 bg-muted/60 p-3 text-xs font-mono text-foreground"
                {...props}
              >
                {children}
              </pre>
            )
          },
          table({ children, ...props }) {
            return (
              <div className="my-2.5 overflow-x-auto rounded-lg border border-border/60">
                <table className="w-full text-left text-xs border-collapse" {...props}>
                  {children}
                </table>
              </div>
            )
          },
          th({ children, ...props }) {
            return (
              <th
                className="border-b border-border/60 bg-muted/60 px-3 py-2 font-semibold text-foreground"
                {...props}
              >
                {children}
              </th>
            )
          },
          td({ children, ...props }) {
            return (
              <td
                className="border-b border-border/40 px-3 py-1.5 text-foreground/90 last:border-0"
                {...props}
              >
                {children}
              </td>
            )
          },
          a({ children, href, ...props }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary underline underline-offset-3 hover:text-primary/80 transition-colors"
                {...props}
              >
                {children}
              </a>
            )
          },
          hr(props) {
            return <hr className="my-3 border-border/60" {...props} />
          },
        }}
      >
        {content}
      </Markdown>
    </div>
  )
})
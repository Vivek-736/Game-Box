"use client"

import * as React from "react"
import { Sun, Moon, Home, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useTheme } from "next-themes"
import Image from "next/image"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div className="relative flex min-h-screen flex-col bg-background text-foreground transition-colors duration-300">
      {/* Top Header with Brand & Theme Toggle */}
      <header className="sticky top-0 z-50 flex h-14 w-full items-center justify-between border-b bg-background/95 px-4 backdrop-blur supports-backdrop-filter:bg-background/60 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5 font-bold tracking-tight">
          <Image
            src="/logo.svg"
            alt="GameBox Logo"
            width={24}
            height={24}
            priority
            className="size-6 shrink-0"
          />

          <span className="text-base font-semibold">GameBox</span>
        </Link>

        {/* Theme Toggle Button */}
        <Button
          variant="ghost"
          size="icon-sm"
          className="size-8 cursor-pointer text-muted-foreground hover:text-foreground"
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          aria-label="Toggle theme"
          title="Toggle theme"
        >
          {mounted && resolvedTheme === "dark" ? (
            <Moon className="size-4" />
          ) : (
            <Sun className="size-4" />
          )}
          <span className="sr-only">Toggle theme</span>
        </Button>
      </header>

      {/* Main 404 Hero */}
      <main className="flex flex-1 flex-col items-center justify-center p-6 text-center">
        <div className="relative flex max-w-md flex-col items-center gap-6">
          {/* Subtle Ambient Glow */}
          <div className="pointer-events-none absolute -top-12 size-48 rounded-full bg-[radial-gradient(circle,#7b57ff_0%,transparent_70%)] opacity-20 blur-3xl" />

          {/* 404 Graphic & Tag */}
          <div className="relative flex flex-col items-center">
            <span className="select-none font-black text-7xl tracking-tighter sm:text-8xl bg-linear-to-b from-[#8f71ff] via-[#7b57ff] to-[#6841ff] bg-clip-text text-transparent drop-shadow-sm">
              404
            </span>
            
            <div className="mt-2 flex items-center justify-center rounded-full border bg-muted/60 px-3 py-1 text-xs font-medium text-muted-foreground">
              Game Over • Level Not Found
            </div>
          </div>

          {/* Title and Message */}
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Lost in the GameBox?
            </h1>

            <p className="text-balance text-sm text-muted-foreground sm:text-base leading-relaxed">
              The game or universe you&apos;re looking for doesn&apos;t exist or was moved.
              Let&apos;s get you back into the action.
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.history.back()}
              className="gap-1.5"
            >
              <ArrowLeft className="size-4" />
              Go Back
            </Button>

            <Link href="/">
              <Button size="sm" className="gap-1.5">
                <Home className="size-4" />
                Return Home
              </Button>
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-muted-foreground/70">
        © {new Date().getFullYear()} GameBox. Build and play worlds with AI.
      </footer>
    </div>
  )
}
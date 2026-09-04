import type { Metadata } from "next"
import { Roboto_Condensed } from "next/font/google"
import { ClerkProvider } from "@clerk/nextjs"
import { shadcn } from "@clerk/ui/themes"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Header } from "@/components/header"
import { cn } from "@/lib/utils"

const robotoCondensed = Roboto_Condensed({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-roboto-condensed",
})

export const metadata: Metadata = {
  title: "GameBox - AI Game Generator",
  description: "Generate, play, and share AI-powered games instantly with GameBox.",
  icons: {
    icon: "/logo.svg",
    shortcut: "/logo.svg",
    apple: "/logo.svg",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("antialiased", robotoCondensed.className)}
    >
      <body>
        <ClerkProvider
          appearance={{
            layout: {
              unsafe_disableDevelopmentModeWarnings: true,
            },
            theme: shadcn
          }}
        >
          <ThemeProvider>
            <Header />
            {children}
          </ThemeProvider>
        </ClerkProvider>
      </body>
    </html>
  )
}
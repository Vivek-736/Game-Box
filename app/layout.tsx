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
            theme: shadcn,
            variables: {
              colorPrimary: "#7b57ff",
              colorTextOnPrimaryBackground: "#ffffff",
            },
            elements: {
              formButtonPrimary:
                "bg-[linear-gradient(180deg,#8f71ff_0%,#7b57ff_50%,#6841ff_100%)] text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.35),0_2px_8px_rgba(104,65,255,0.35)] hover:brightness-110 hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.45),0_4px_16px_rgba(124,87,255,0.45)] active:translate-y-px active:brightness-95 border-0 font-semibold transition-all",
              footerActionLink:
                "text-[#7b57ff] hover:text-[#8f71ff] font-medium transition-colors",
              formFieldAction:
                "text-[#7b57ff] hover:text-[#8f71ff] font-medium transition-colors",
              identityPreviewEditButton:
                "text-[#7b57ff] hover:text-[#8f71ff] font-medium transition-colors",
            },
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
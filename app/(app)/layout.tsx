import * as React from "react"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Header } from "@/components/header"
import { listGames } from "@/lib/games/queries"

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const games = await listGames()

  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar games={games} />
      <SidebarInset>
        <Header />
        <div className="flex flex-1 flex-col">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
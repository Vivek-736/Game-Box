"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import {
  SquarePen,
  MessageSquare,
  Coins,
} from "lucide-react"
import { OrganizationSwitcher, UserButton } from "@clerk/nextjs"
import { cn } from "@/lib/utils"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar"
import {
  Empty,
  EmptyDescription,
} from "@/components/ui/empty"
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover"
import type { Game } from "@/lib/db/schema"

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  games?: Game[]
}

export function AppSidebar({ games = [], ...props }: AppSidebarProps) {
  const pathname = usePathname()
  const { state } = useSidebar()
  const isCollapsed = state === "collapsed"

  return (
    <Sidebar collapsible="icon" className="border-r" {...props}>
      {/* Sidebar Header */}
      <SidebarHeader>
        {isCollapsed ? (
          <div className="flex h-10 items-center justify-center">
            <SidebarTrigger />
          </div>
        ) : (
          <div className="flex h-10 items-center justify-between px-2">
            <Link
              href="/"
              className="flex items-center gap-2 overflow-hidden"
            >
              <Image
                src="/logo.svg"
                alt="GameBox Logo"
                width={20}
                height={20}
                className="size-5 shrink-0"
                priority
              />
              <span className="text-base font-semibold tracking-tight">GameBox</span>
            </Link>
            <SidebarTrigger />
          </div>
        )}
      </SidebarHeader>

      {/* Sidebar Content */}
      <SidebarContent>
        {/* First Group: New game */}
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem className={isCollapsed ? "flex justify-center" : undefined}>
              <SidebarMenuButton
                render={<Link href="/" />}
                isActive={pathname === "/"}
                tooltip="New game"
                className={isCollapsed ? "justify-center" : undefined}
              >
                <SquarePen className="size-4" />
                {!isCollapsed && <span>New game</span>}
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        {/* Second Group: Recents */}
        <SidebarGroup>
          <SidebarGroupLabel className={isCollapsed ? "sr-only" : undefined}>
            Recents
          </SidebarGroupLabel>
          <SidebarGroupContent>
            {isCollapsed ? (
              <SidebarMenu>
                <SidebarMenuItem className="flex justify-center">
                  <Popover>
                    <PopoverTrigger
                      render={
                        <SidebarMenuButton
                          tooltip="Recents"
                          className="justify-center"
                        >
                          <MessageSquare className="size-4" />
                          <span className="sr-only">Recents</span>
                        </SidebarMenuButton>
                      }
                    />
                    <PopoverContent
                      side="right"
                      align="start"
                      sideOffset={8}
                      className="w-64 p-3"
                    >
                      <PopoverHeader className="px-1 pb-1">
                        <PopoverTitle className="text-xs font-semibold text-muted-foreground">
                          Recents
                        </PopoverTitle>
                      </PopoverHeader>
                      {games.length > 0 ? (
                        <SidebarMenu className="max-h-64 overflow-y-auto">
                          {games.map((game) => (
                            <SidebarMenuItem key={game.id}>
                              <SidebarMenuButton
                                render={<Link href={`/games/${game.id}`} />}
                                tooltip={game.title}
                                isActive={pathname === `/games/${game.id}`}
                              >
                                <MessageSquare className="size-4" />
                                <span className="truncate">{game.title}</span>
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                          ))}
                        </SidebarMenu>
                      ) : (
                        <Empty className="border border-dashed p-4 rounded-xl text-center">
                          <EmptyDescription className="text-xs text-muted-foreground">
                            Your games will live here.
                          </EmptyDescription>
                        </Empty>
                      )}
                    </PopoverContent>
                  </Popover>
                </SidebarMenuItem>
              </SidebarMenu>
            ) : games.length > 0 ? (
              <SidebarMenu>
                {games.map((game) => (
                  <SidebarMenuItem key={game.id}>
                    <SidebarMenuButton
                      render={<Link href={`/games/${game.id}`} />}
                      tooltip={game.title}
                      isActive={pathname === `/games/${game.id}`}
                    >
                      <MessageSquare className="size-4" />
                      <span className="truncate">{game.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            ) : (
              <div className="px-2">
                <Empty className="border border-dashed p-4 rounded-xl text-center">
                  <EmptyDescription className="text-xs text-muted-foreground">
                    Your games will live here.
                  </EmptyDescription>
                </Empty>
              </div>
            )}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Sidebar Footer */}
      <SidebarFooter className={cn("gap-3 p-2", isCollapsed && "items-center")}>
        <SidebarMenu>
          <SidebarMenuItem className={isCollapsed ? "flex justify-center" : undefined}>
            <SidebarMenuButton
              tooltip="Credits: $1.00"
              className={isCollapsed ? "justify-center" : undefined}
            >
              <Coins className="size-4" />
              {!isCollapsed && (
                <>
                  <span>Credits</span>
                  <SidebarMenuBadge>$1.00</SidebarMenuBadge>
                </>
              )}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        
        {isCollapsed ? (
          <div className="flex items-center justify-center">
            <UserButton
              appearance={{
                elements: {
                  userButtonAvatarBox: "size-8",
                },
              }}
            />
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2 overflow-hidden">
            <div className="flex-1 min-w-0 overflow-hidden">
              <OrganizationSwitcher
                hidePersonal={false}
                appearance={{
                  elements: {
                    rootBox: "w-full",
                    organizationSwitcherTrigger:
                      "w-full justify-between p-1.5 hover:bg-sidebar-accent rounded-md text-sidebar-foreground",
                  },
                }}
              />
            </div>
            <div className="shrink-0 flex items-center justify-center">
              <UserButton
                appearance={{
                  elements: {
                    userButtonAvatarBox: "size-8",
                  },
                }}
              />
            </div>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  )
}
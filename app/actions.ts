"use server";

import { auth as triggerAuth } from "@trigger.dev/sdk";
import { chat, type ChatStartSessionParams } from "@trigger.dev/sdk/ai";
import { auth as clerkAuth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { games } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import type { gameChat } from "@/trigger/chat";

const start = chat.createStartSessionAction<typeof gameChat>("game-chat");

export async function startChatSession(params: ChatStartSessionParams<typeof gameChat>) {
  const { orgId, userId } = await clerkAuth();
  const currentOrgId = orgId ?? userId;
  if (!currentOrgId) {
    throw new Error("Unauthorized");
  }

  const [game] = await db
    .select({ id: games.id })
    .from(games)
    .where(and(eq(games.id, params.chatId), eq(games.orgId, currentOrgId)))
    .limit(1);

  if (!game) {
    throw new Error("Game not found");
  }

  return start(params);
}

export async function mintChatAccessToken(chatId: string) {
  const { orgId, userId } = await clerkAuth();
  const currentOrgId = orgId ?? userId;
  if (!currentOrgId) {
    throw new Error("Unauthorized");
  }

  const [game] = await db
    .select({ id: games.id })
    .from(games)
    .where(and(eq(games.id, chatId), eq(games.orgId, currentOrgId)))
    .limit(1);

  if (!game) {
    throw new Error("Game not found");
  }

  return triggerAuth.createPublicToken({
    scopes: {
      read: { sessions: chatId },
      write: { sessions: chatId },
    },
    expirationTime: "1h",
  });
}
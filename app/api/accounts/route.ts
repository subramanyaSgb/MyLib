import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { encryptJSON } from "@/lib/crypto";
import { resolveSteamId, getSteamProfile } from "@/lib/connectors/steam";
import {
  exchangeCodeForTokens,
  extractGogCode,
  getGogUserData,
} from "@/lib/connectors/gog";
import {
  exchangeEpicCode,
  extractEpicCode,
} from "@/lib/connectors/epic";

export async function GET() {
  const accounts = await prisma.account.findMany({
    orderBy: [{ storeId: "asc" }, { label: "asc" }],
    select: {
      id: true,
      storeId: true,
      label: true,
      externalId: true,
      displayName: true,
      avatarUrl: true,
      lastSyncAt: true,
      lastSyncOk: true,
      lastError: true,
      _count: { select: { owned: true } },
    },
  });
  return Response.json({ accounts });
}

const CreateBody = z.object({
  storeId: z.enum(["steam", "epic", "gog", "stove", "play"]),
  label: z.string().min(1).max(60),
  steamIdentifier: z.string().optional(),
  gogCodeOrUrl: z.string().optional(),
  epicCodeOrJson: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const parsed = CreateBody.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: parsed.error.issues }, { status: 400 });

  const { storeId, label, steamIdentifier, gogCodeOrUrl, epicCodeOrJson } = parsed.data;

  try {
    if (storeId === "steam") {
      if (!steamIdentifier) return Response.json({ error: "steamIdentifier required" }, { status: 400 });
      const { steamId64 } = await resolveSteamId(steamIdentifier);
      const profile = await getSteamProfile(steamId64);
      const existing = await prisma.account.findUnique({
        where: { storeId_externalId: { storeId: "steam", externalId: steamId64 } },
      });
      if (existing) return Response.json({ error: `Already linked as "${existing.label}"` }, { status: 409 });

      const account = await prisma.account.create({
        data: {
          storeId: "steam",
          label,
          externalId: steamId64,
          displayName: profile.personaName,
          avatarUrl: profile.avatarUrl,
          credsEnc: encryptJSON({ steamId64 }),
        },
      });
      return Response.json({ account: { id: account.id } });
    }

    if (storeId === "gog") {
      if (!gogCodeOrUrl) return Response.json({ error: "gogCodeOrUrl required" }, { status: 400 });
      const code = extractGogCode(gogCodeOrUrl);
      const creds = await exchangeCodeForTokens(code);
      const user = await getGogUserData(creds);

      const existing = await prisma.account.findUnique({
        where: { storeId_externalId: { storeId: "gog", externalId: user.userId } },
      });
      if (existing) return Response.json({ error: `Already linked as "${existing.label}"` }, { status: 409 });

      const account = await prisma.account.create({
        data: {
          storeId: "gog",
          label,
          externalId: user.userId,
          displayName: user.username,
          avatarUrl: user.avatarUrl,
          credsEnc: encryptJSON(creds),
        },
      });
      return Response.json({ account: { id: account.id } });
    }

    if (storeId === "epic") {
      if (!epicCodeOrJson) return Response.json({ error: "epicCodeOrJson required" }, { status: 400 });
      const code = extractEpicCode(epicCodeOrJson);
      const creds = await exchangeEpicCode(code);

      const existing = await prisma.account.findUnique({
        where: { storeId_externalId: { storeId: "epic", externalId: creds.accountId } },
      });
      if (existing) return Response.json({ error: `Already linked as "${existing.label}"` }, { status: 409 });

      const account = await prisma.account.create({
        data: {
          storeId: "epic",
          label,
          externalId: creds.accountId,
          displayName: creds.displayName,
          avatarUrl: null,
          credsEnc: encryptJSON(creds),
        },
      });
      return Response.json({ account: { id: account.id } });
    }

    return Response.json({ error: `Store "${storeId}" not yet supported` }, { status: 501 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ error: msg }, { status: 400 });
  }
}

import "dotenv/config";
import { prisma } from "../lib/db";
import { decryptJSON } from "../lib/crypto";

async function main() {
  const acc = await prisma.account.findFirst({ where: { storeId: "steam" } });
  if (!acc) return console.log("no steam acc");
  const c = decryptJSON<{ steamId64: string }>(acc.credsEnc);
  const gog = await prisma.account.findFirst({ where: { storeId: "gog" } });
  if (!gog) return console.log("no gog acc");
  const gc = decryptJSON<{ accessToken: string }>(gog.credsEnc);
  const r3 = await fetch("https://embed.gog.com/user/wishlist.json", {
    headers: { Authorization: `Bearer ${gc.accessToken}` },
  });
  console.log("GOG wishlist:", r3.status);
  const t3 = await r3.text();
  console.log("len", t3.length, "first 1500:", t3.slice(0, 1500));
}

main().finally(() => prisma.$disconnect());

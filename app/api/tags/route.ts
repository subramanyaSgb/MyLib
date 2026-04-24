import { z } from "zod";
import { prisma } from "@/lib/db";

export async function GET() {
  const tags = await prisma.tag.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { games: true } } },
  });
  return Response.json({
    tags: tags.map((t) => ({
      id: t.id,
      name: t.name,
      color: t.color,
      gameCount: t._count.games,
    })),
  });
}

const Body = z.object({
  name: z.string().trim().min(1).max(40),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().nullable(),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: parsed.error.issues }, { status: 400 });
  try {
    const tag = await prisma.tag.create({
      data: { name: parsed.data.name, color: parsed.data.color ?? null },
    });
    return Response.json({ tag });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 400 });
  }
}

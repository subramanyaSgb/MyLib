import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "./generated/prisma/client";

const DATABASE_URL = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
// Strip "file:" prefix; better-sqlite3 wants a filesystem path.
const dbPath = DATABASE_URL.replace(/^file:/, "");

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaBetterSqlite3({ url: dbPath }),
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

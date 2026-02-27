import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrismaClient() {
  const connString = process.env.DATABASE_URL!;
  let finalConnString = connString;
  try {
    const url = new URL(connString);
    url.searchParams.set("sslmode", "verify-full");
    finalConnString = url.toString();
  } catch {
    // URL parsing can fail in test environments
  }
  const pool = new pg.Pool({ connectionString: finalConnString });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { seedDefaultBuckets } from "@/lib/buckets";
import { SignOutButton } from "./sign-out-button";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  await seedDefaultBuckets(session.user.id);

  const buckets = await prisma.bucket.findMany({
    where: { userId: session.user.id },
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { threads: true } } },
  });

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <header className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
        <h1 className="text-lg font-semibold">Tenex Triage</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-zinc-400">{session.user.email}</span>
          <SignOutButton />
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">
        <h2 className="mb-4 text-xl font-semibold">Your Buckets</h2>
        <div className="grid gap-3">
          {buckets.map((bucket) => (
            <div
              key={bucket.id}
              className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3"
            >
              <div>
                <span className="font-medium">{bucket.name}</span>
                <span className="ml-2 text-sm text-zinc-500">
                  {bucket._count.threads} threads
                </span>
              </div>
              <span className="text-xs text-zinc-600">{bucket.description}</span>
            </div>
          ))}
        </div>
        <p className="mt-8 text-sm text-zinc-600">
          Gmail sync and classification coming next.
        </p>
      </main>
    </div>
  );
}

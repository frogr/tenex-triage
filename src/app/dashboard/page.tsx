import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { seedDefaultBuckets } from "@/lib/buckets";
import { SignOutButton } from "./sign-out-button";
import { Dashboard } from "./dashboard";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  await seedDefaultBuckets(session.user.id);

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#0A0A0A] text-white">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-zinc-800 bg-[#0A0A0A]/95 px-4 py-3 backdrop-blur-sm sm:px-6 sm:py-4">
        <h1 className="text-base font-semibold sm:text-lg">Tenex Triage</h1>
        <div className="flex items-center gap-2 sm:gap-4">
          <Link
            href="/dashboard/history"
            className="rounded-lg p-2 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
            aria-label="Activity history"
            title="Activity history"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </Link>
          <span className="hidden text-sm text-zinc-400 sm:inline">
            {session.user.email}
          </span>
          <SignOutButton />
        </div>
      </header>
      <main className="mx-auto max-w-5xl overflow-x-hidden px-4 py-6 sm:px-6 sm:py-8">
        <Dashboard />
      </main>
    </div>
  );
}

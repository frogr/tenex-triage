import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { HistoryTimeline } from "./history-timeline";

export default async function HistoryPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#0A0A0A] text-white">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-zinc-800 bg-[#0A0A0A]/95 px-4 py-3 backdrop-blur-sm sm:px-6 sm:py-4">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="text-zinc-500 transition-colors hover:text-white"
            aria-label="Back to dashboard"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-base font-semibold sm:text-lg">Activity History</h1>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
        <HistoryTimeline />
      </main>
    </div>
  );
}

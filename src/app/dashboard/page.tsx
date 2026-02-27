import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { seedDefaultBuckets } from "@/lib/buckets";
import { SignOutButton } from "./sign-out-button";
import { Dashboard } from "./dashboard";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  await seedDefaultBuckets(session.user.id);

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
        <Dashboard />
      </main>
    </div>
  );
}

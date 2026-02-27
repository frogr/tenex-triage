import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SignInButton } from "./sign-in-button";

export default async function Home() {
  const session = await auth();
  if (session) redirect("/dashboard");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center overflow-x-hidden bg-[#0A0A0A] px-4 sm:px-6">
      <main className="flex max-w-2xl flex-col items-center gap-10 text-center">
        <div className="flex flex-col items-center gap-4">
          <span className="inline-block rounded-full border border-zinc-800 bg-zinc-900 px-4 py-1.5 text-xs font-medium tracking-wide text-zinc-400 uppercase">
            AI-powered email triage
          </span>
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl">
            Your inbox is chaos.
            <br />
            <span className="text-zinc-500">We fix that.</span>
          </h1>
        </div>
        <p className="max-w-md text-base text-zinc-400 sm:text-lg">
          200 emails. 5 seconds. Zero stress.
          <br className="hidden sm:block" />
          Triage that actually understands what matters.
        </p>
        <div className="flex flex-col items-center gap-3">
          <SignInButton />
          <p className="text-xs text-zinc-600">
            Read-only access — we never send or modify your emails
          </p>
        </div>
      </main>
      <footer className="absolute bottom-6 text-xs text-zinc-700 sm:bottom-8 sm:text-sm">
        Built for Tenex by Austin French
      </footer>
    </div>
  );
}

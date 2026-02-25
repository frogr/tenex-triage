export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0A0A0A] px-6">
      <main className="flex max-w-2xl flex-col items-center gap-8 text-center">
        <h1 className="text-5xl font-bold tracking-tight text-white sm:text-6xl">
          Your inbox is chaos.
          <br />
          <span className="text-zinc-500">We fix that.</span>
        </h1>
        <p className="max-w-md text-lg text-zinc-400">
          200 emails. 5 seconds. Zero stress. AI-powered triage that actually
          understands what matters.
        </p>
        <button className="rounded-full bg-white px-8 py-3 text-sm font-semibold text-black transition-colors hover:bg-zinc-200">
          Sign in with Google
        </button>
      </main>
      <footer className="absolute bottom-8 text-sm text-zinc-600">
        Built for Tenex by Austin French
      </footer>
    </div>
  );
}

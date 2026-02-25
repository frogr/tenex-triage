"use client";

import { signIn } from "next-auth/react";

export function SignInButton() {
  return (
    <button
      onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
      className="rounded-full bg-white px-8 py-3 text-sm font-semibold text-black transition-colors hover:bg-zinc-200"
    >
      Sign in with Google
    </button>
  );
}

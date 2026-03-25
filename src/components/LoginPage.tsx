import { useState } from "react";
import { signInWithGoogle } from "../lib/firebase";

export function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const handleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Sign-in failed";
      // User cancelled the popup — not an error worth showing
      if (!msg.includes("popup-closed")) setError("Sign-in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#fafafa] to-[#f0f0ff] dark:from-[#0A0A0F] dark:to-[#0E0E18]">
      <div className="w-full max-w-sm mx-4">
        {/* Card */}
        <div
          className="rounded-2xl bg-white dark:bg-[#12121C] border dark:border-primary/20 border-primary/10 p-8 space-y-8"
          style={{ boxShadow: "0 8px 32px rgba(110,118,255,0.12)" }}
        >
          {/* Logo + title */}
          <div className="flex flex-col items-center gap-3 text-center">
            <svg width="48" height="48" viewBox="0 0 38 38" xmlns="http://www.w3.org/2000/svg">
              <rect x="0" y="0" width="38" height="38" rx="12" fill="#6E76FF"/>
              <rect x="9" y="9" width="20" height="20" rx="8" fill="#ffffff"/>
              <rect x="12" y="12" width="14" height="3.6" rx="2" fill="#6E76FF"/>
              <rect x="12" y="17" width="14" height="3.6" rx="2" fill="#A78BFA"/>
              <rect x="12" y="22" width="14" height="3.6" rx="2" fill="#111827"/>
            </svg>
            <div>
              <h1 className="text-xl font-bold dark:text-white text-foreground tracking-tight">MJQ App</h1>
              <p className="text-sm dark:text-muted-foreground text-muted-foreground mt-1">Price Monitor · Sign in to continue</p>
            </div>
          </div>

          {/* Google sign-in button */}
          <button
            onClick={handleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border dark:border-white/10 border-border bg-white dark:bg-white/5 dark:hover:bg-white/10 hover:bg-muted/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <svg className="animate-spin h-5 w-5 text-primary" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 48 48">
                <path fill="#FFC107" d="M43.6 20H24v8h11.3C33.6 33.2 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.7 1.1 7.8 2.9l5.7-5.7C34.1 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 19.6-8 19.6-20 0-1.3-.1-2.7-.4-4z"/>
                <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 16 19 12 24 12c3 0 5.7 1.1 7.8 2.9l5.7-5.7C34.1 6.5 29.3 4 24 4 16.3 4 9.7 8.4 6.3 14.7z"/>
                <path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.9 13.5-5l-6.2-5.2C29.5 35.5 26.9 36 24 36c-5.2 0-9.6-2.8-11.3-7L6.1 33.8C9.5 39.5 16.3 44 24 44z"/>
                <path fill="#1976D2" d="M43.6 20H24v8h11.3c-.8 2.4-2.4 4.4-4.5 5.8l6.2 5.2C40.7 35.7 44 30.3 44 24c0-1.3-.1-2.7-.4-4z"/>
              </svg>
            )}
            <span className="text-sm font-medium dark:text-white text-foreground">
              {loading ? "Signing in…" : "Continue with Google"}
            </span>
          </button>

          {error && (
            <p className="text-xs text-center text-red-500">{error}</p>
          )}

          <p className="text-[11px] text-center dark:text-muted-foreground/60 text-muted-foreground/60">
            Access restricted to authorized accounts only
          </p>
        </div>
      </div>
    </div>
  );
}

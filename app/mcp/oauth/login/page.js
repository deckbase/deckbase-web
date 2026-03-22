"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

function McpOAuthLoginInner() {
  const searchParams = useSearchParams();
  const { user, loading, signIn, signInWithGoogle } = useAuth();

  const clientId = searchParams.get("client_id") || "";
  const redirectUri = searchParams.get("redirect_uri") || "";
  const codeChallenge = searchParams.get("code_challenge") || "";
  const codeChallengeMethod = searchParams.get("code_challenge_method") || "";
  const state = searchParams.get("state") || "";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const oauthStartedRef = useRef(false);

  const paramsOk =
    clientId && redirectUri && codeChallenge && codeChallengeMethod;

  useEffect(() => {
    if (loading || !user || !paramsOk || oauthStartedRef.current) return;
    oauthStartedRef.current = true;
    setBusy(true);
    setError("");
    (async () => {
      try {
        const idToken = await user.getIdToken(true);
        const res = await fetch("/api/mcp/oauth/authorize/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            idToken,
            client_id: clientId,
            redirect_uri: redirectUri,
            code_challenge: codeChallenge,
            code_challenge_method: codeChallengeMethod,
            state,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error || data.error_description || "Authorization failed");
        }
        if (data.redirect_url) {
          window.location.href = data.redirect_url;
          return;
        }
        throw new Error("No redirect URL returned");
      } catch (e) {
        oauthStartedRef.current = false;
        setError(e.message || "Something went wrong");
      } finally {
        setBusy(false);
      }
    })();
  }, [loading, user, paramsOk, clientId, redirectUri, codeChallenge, codeChallengeMethod, state]);

  const handleEmailSignIn = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await signIn(email, password);
    } catch (err) {
      setError(err.code === "auth/invalid-credential" ? "Invalid email or password" : "Sign in failed");
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    setError("");
    setBusy(true);
    try {
      await signInWithGoogle();
    } catch {
      setError("Google sign-in failed");
    } finally {
      setBusy(false);
    }
  };

  if (!paramsOk) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="max-w-md text-center text-white/80">
          <p className="mb-4">Missing OAuth parameters. Start from your MCP client (authorization request).</p>
          <Link href="/mcp" className="text-accent hover:underline">
            MCP setup
          </Link>
        </div>
      </div>
    );
  }

  if (loading || (user && busy)) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 text-accent animate-spin" />
        <p className="text-white/70 text-sm">
          {user ? "Completing connection…" : "Loading…"}
        </p>
      </div>
    );
  }

  if (user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-accent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <Link href="/" className="inline-flex items-center gap-2 justify-center mb-6">
            <Image
              src="/app_logo.webp"
              alt="Deckbase"
              width={48}
              height={48}
              className="rounded-xl"
              priority
            />
          </Link>
          <h1 className="text-xl font-semibold text-white mb-2">Connect Deckbase MCP</h1>
          <p className="text-white/60 text-sm">
            Sign in to authorize this connection. Your MCP client will receive tokens after this step.
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-200 text-sm">
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleGoogle}
          disabled={busy}
          className="w-full flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-white py-3 px-4 transition-colors disabled:opacity-50"
        >
          {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
          Continue with Google
        </button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10" />
          </div>
          <div className="relative flex justify-center text-xs uppercase tracking-wide">
            <span className="bg-black px-2 text-white/40">or email</span>
          </div>
        </div>

        <form onSubmit={handleEmailSignIn} className="space-y-4">
          <div>
            <label className="block text-sm text-white/60 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-white/60 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white"
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-accent hover:bg-accent/90 text-white font-medium py-3 disabled:opacity-50"
          >
            {busy ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Sign in"}
          </button>
        </form>

        <p className="text-center text-white/40 text-sm">
          <Link href="/register" className="text-accent hover:underline">
            Create account
          </Link>
          {" · "}
          <Link href="/mcp" className="hover:text-white/60">
            MCP docs
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function McpOAuthLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black flex items-center justify-center">
          <Loader2 className="w-10 h-10 text-accent animate-spin" />
        </div>
      }
    >
      <McpOAuthLoginInner />
    </Suspense>
  );
}

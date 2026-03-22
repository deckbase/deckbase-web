"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

/**
 * Optional HTTPS redirect_uri target after OAuth (some clients use custom schemes instead).
 */
function Inner() {
  const searchParams = useSearchParams();
  const code = searchParams.get("code");
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6 text-center">
      <div className="max-w-md text-white/85 space-y-4">
        {code ? (
          <>
            <p className="text-white font-medium">Authorization complete</p>
            <p className="text-white/60 text-sm">
              You can close this tab and return to your MCP client. It should pick up the connection automatically.
            </p>
          </>
        ) : (
          <p className="text-white/60 text-sm">No authorization code in this URL.</p>
        )}
        <Link href="/mcp" className="inline-block text-accent hover:underline text-sm">
          MCP documentation
        </Link>
      </div>
    </div>
  );
}

export default function McpOAuthCallbackPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <Inner />
    </Suspense>
  );
}

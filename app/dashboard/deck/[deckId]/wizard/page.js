"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Wizard mode is a separate world; it no longer runs per-deck.
 * Redirect to the global Wizard page. Import cards from decks there.
 */
export default function DeckWizardRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dashboard/wizard");
  }, [router]);
  return (
    <div className="flex items-center justify-center py-20">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-accent" />
    </div>
  );
}

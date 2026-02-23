"use client";

import { useState, useEffect } from "react";
import { useRevenueCat, DEFAULT_ENTITLEMENT_ID } from "@/contexts/RevenueCatContext";
import { Crown, Loader2, ExternalLink } from "lucide-react";
import Link from "next/link";

export default function SubscriptionPage() {
  const {
    isConfigured,
    customerInfo,
    loading,
    isEntitledTo,
    presentPaywall,
    refreshCustomerInfo,
    error,
  } = useRevenueCat();
  const [entitled, setEntitled] = useState(false);
  const [showPaywallLoading, setShowPaywallLoading] = useState(false);

  useEffect(() => {
    if (!isConfigured) return;
    let mounted = true;
    isEntitledTo(DEFAULT_ENTITLEMENT_ID).then((v) => {
      if (mounted) setEntitled(!!v);
    });
    return () => { mounted = false; };
  }, [isConfigured, isEntitledTo, customerInfo]);

  const handleOpenPaywall = async () => {
    setShowPaywallLoading(true);
    try {
      await presentPaywall();
    } catch (e) {
      console.error("Paywall error:", e);
    } finally {
      setShowPaywallLoading(false);
    }
  };

  if (!isConfigured) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-6 text-center">
          <p className="text-amber-200/90 mb-2">Subscriptions are not configured.</p>
          <p className="text-white/60 text-sm mb-3">
            Add <code className="bg-white/10 px-1 rounded">NEXT_PUBLIC_REVENUECAT_WEB_API_KEY</code> to your
            <code className="bg-white/10 px-1 rounded">.env</code> and set up a Web Billing app in the{" "}
            <a
              href="https://app.revenuecat.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-400 hover:underline"
            >
              RevenueCat dashboard
            </a>
            .
          </p>
          <p className="text-white/40 text-xs">
            After changing <code className="bg-white/10 px-1 rounded">.env</code>, restart the dev server (Ctrl+C then <code className="bg-white/10 px-1 rounded">npm run dev</code>).
          </p>
        </div>
      </div>
    );
  }

  if (loading && !customerInfo) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 flex justify-center">
        <Loader2 className="w-8 h-8 text-white/50 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="flex items-center gap-2 mb-8">
        <Crown className="w-8 h-8 text-amber-400" />
        <h1 className="text-2xl font-bold text-white">Subscription</h1>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-red-200 text-sm mb-6">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-white/10 bg-white/5 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-white/70">Status</span>
          <span className={entitled ? "text-emerald-400 font-medium" : "text-white/50"}>
            {entitled ? "Active" : "Free plan"}
          </span>
        </div>
        {customerInfo?.managementURL && (
          <a
            href={customerInfo.managementURL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-amber-400 hover:text-amber-300 text-sm"
          >
            <ExternalLink className="w-4 h-4" />
            Manage subscription
          </a>
        )}
      </div>

      {!entitled && (
        <div className="mt-8">
          <button
            onClick={handleOpenPaywall}
            disabled={showPaywallLoading}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-medium disabled:opacity-50"
          >
            {showPaywallLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Crown className="w-5 h-5" />
                View plans
              </>
            )}
          </button>
        </div>
      )}

      <p className="mt-6 text-white/40 text-sm text-center">
        <Link href="/dashboard" className="hover:text-white/60">Back to dashboard</Link>
      </p>
    </div>
  );
}

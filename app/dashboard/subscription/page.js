"use client";

import { useState, useEffect } from "react";
import { useRevenueCat, DEFAULT_ENTITLEMENT_ID } from "@/contexts/RevenueCatContext";
import { Crown, Loader2, ExternalLink, Check } from "lucide-react";
import Link from "next/link";

/** Human-readable label for package identifier (e.g. $rc_monthly -> Monthly) */
function packageLabel(identifier) {
  const id = (identifier || "").toLowerCase();
  if (id.includes("annual") || id.includes("yearly") || id === "$rc_annual") return "Annual";
  if (id.includes("monthly") || id === "$rc_monthly") return "Monthly";
  if (id.includes("weekly") || id === "$rc_weekly") return "Weekly";
  return identifier || "Plan";
}

export default function SubscriptionPage() {
  const {
    isConfigured,
    customerInfo,
    loading,
    isPro,
    isVip,
    getOfferings,
    purchase,
    error,
  } = useRevenueCat();
  const [offerings, setOfferings] = useState(null);
  const [offeringsLoading, setOfferingsLoading] = useState(false);
  const [purchasingPackageId, setPurchasingPackageId] = useState(null);
  const [purchaseError, setPurchaseError] = useState(null);

  useEffect(() => {
    if (!isConfigured) return;
    let mounted = true;
    setOfferingsLoading(true);
    getOfferings()
      .then((off) => {
        if (mounted) setOfferings(off);
      })
      .catch(() => {
        if (mounted) setOfferings(null);
      })
      .finally(() => {
        if (mounted) setOfferingsLoading(false);
      });
    return () => { mounted = false; };
  }, [isConfigured, getOfferings]);

  const handlePurchase = async (rcPackage) => {
    setPurchaseError(null);
    setPurchasingPackageId(rcPackage?.identifier ?? null);
    try {
      await purchase({
        rcPackage,
        skipSuccessPage: true,
      });
    } catch (e) {
      const msg = e?.message || "";
      if (/cancelled|canceled|user cancelled/i.test(msg)) {
        setPurchaseError(null);
      } else {
        setPurchaseError(msg || "Purchase failed.");
      }
    } finally {
      setPurchasingPackageId(null);
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

      {purchaseError && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-red-200 text-sm mb-6">
          {purchaseError}
        </div>
      )}

      <div className="rounded-xl border border-white/10 bg-white/5 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-white/70">Status</span>
          <span className={isPro ? "text-emerald-400 font-medium" : "text-white/50"}>
            {isPro ? (isVip ? "Pro (VIP)" : "Active") : "Free plan"}
          </span>
        </div>
        {!isVip && customerInfo?.managementURL && (
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

      {!isPro && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-white mb-4">Choose a plan</h2>
          {offeringsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 text-white/50 animate-spin" />
            </div>
          ) : offerings?.current?.availablePackages?.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {offerings.current.availablePackages.map((pkg) => {
                const product = pkg.webBillingProduct || pkg.rcBillingProduct;
                const priceStr = product?.price?.formattedPrice ?? product?.currentPrice?.formattedPrice ?? "—";
                const title = product?.title || packageLabel(pkg.identifier);
                const isPurchasing = purchasingPackageId === pkg.identifier;
                return (
                  <button
                    key={pkg.identifier}
                    type="button"
                    onClick={() => handlePurchase(pkg)}
                    disabled={isPurchasing}
                    className="flex flex-col items-start gap-2 rounded-xl border border-white/20 bg-white/5 p-5 text-left hover:border-amber-500/50 hover:bg-white/10 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <div className="flex w-full items-center justify-between">
                      <span className="font-semibold text-white">{title}</span>
                      <span className="text-amber-400 font-medium">{priceStr}</span>
                    </div>
                    {product?.description && (
                      <p className="text-sm text-white/60">{product.description}</p>
                    )}
                    <span className="mt-2 flex items-center gap-2 text-amber-400 text-sm font-medium">
                      {isPurchasing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                      {isPurchasing ? "Opening checkout…" : "Subscribe"}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-white/60 text-sm py-4">
              No plans available right now. Make sure you have an offering with packages in the{" "}
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
          )}
        </div>
      )}

      <p className="mt-6 text-white/40 text-sm text-center">
        <Link href="/dashboard" className="hover:text-white/60">Back to dashboard</Link>
      </p>
    </div>
  );
}

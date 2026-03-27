"use client";

import { useState, useEffect } from "react";
import { useRevenueCat } from "@/contexts/RevenueCatContext";
import { Crown, Loader2, ExternalLink, ArrowLeft, Check, Minus, Sparkles } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import PlanCard from "@/components/pricing/PlanCard";

const MONTHLY = "monthly";
const YEARLY = "yearly";

const cardVariants = {
  hidden: { opacity: 0, y: 28 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.1, ease: [0.25, 0.1, 0.25, 1] },
  }),
};

/** Human-readable label for package identifier (e.g. $rc_monthly -> Monthly) */
function packageLabel(identifier) {
  const id = (identifier || "").toLowerCase();
  if (id.includes("annual") || id.includes("yearly") || id === "$rc_annual") return "Annual";
  if (id.includes("monthly") || id === "$rc_monthly") return "Monthly";
  if (id.includes("weekly") || id === "$rc_weekly") return "Weekly";
  return identifier || "Plan";
}

function getPlanLevel(customerInfo, isVip) {
  if (isVip) return "vip";
  const all = customerInfo?.entitlements?.all || {};
  const hasPro = !!all.pro;
  const hasBasic = !!all.basic;
  if (hasPro) return "pro";
  if (hasBasic) return "basic";
  return "free";
}

function collectAvailablePackages(offerings) {
  const byKey = new Map();
  const allOfferings = Object.values(offerings?.all || {});

  const orderedOfferings = offerings?.current
    ? [offerings.current, ...allOfferings.filter((off) => off?.identifier !== offerings.current.identifier)]
    : allOfferings;

  for (const off of orderedOfferings) {
    for (const pkg of off?.availablePackages || []) {
      const product = pkg?.webBillingProduct || pkg?.rcBillingProduct;
      const key = `${pkg?.identifier || "unknown"}:${product?.identifier || ""}`;
      if (!byKey.has(key)) byKey.set(key, pkg);
    }
  }
  return Array.from(byKey.values());
}

function inferPackageTier(pkg) {
  const product = pkg?.webBillingProduct || pkg?.rcBillingProduct;
  const pid = String(product?.identifier || "").toLowerCase();

  if (/\bpro\b/.test(pid) || /(^|_)pro($|_)/.test(pid) || /pro[_-]/.test(pid) || pid.endsWith("_pro")) {
    return "pro";
  }
  if (/\bbasic\b/.test(pid) || /(^|_)basic($|_)/.test(pid) || /basic[_-]/.test(pid) || pid.endsWith("_basic")) {
    return "basic";
  }

  const text = [pkg?.identifier, product?.identifier, product?.title, product?.description]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (/\bpro\b/.test(text) || /\bpremium\b/.test(text)) return "pro";
  if (/\bbasic\b/.test(text)) return "basic";
  return "unknown";
}

function inferPackageCadence(identifier = "") {
  const id = String(identifier).toLowerCase();
  if (id.includes("annual") || id.includes("yearly") || id === "$rc_annual") return "annual";
  if (id.includes("monthly") || id === "$rc_monthly") return "monthly";
  if (id.includes("weekly") || id === "$rc_weekly") return "weekly";
  return "other";
}

function getPriceData(product) {
  const priceObj = product?.price || product?.currentPrice || null;
  if (!priceObj) return null;

  const parseFormattedPriceNumber = (formatted) => {
    if (!formatted) return null;
    const raw = String(formatted).replace(/\s/g, "").replace(/[^\d.,-]/g, "");
    if (!raw) return null;

    const hasComma = raw.includes(",");
    const hasDot = raw.includes(".");
    let normalized = raw;

    if (hasComma && hasDot) {
      const lastComma = raw.lastIndexOf(",");
      const lastDot = raw.lastIndexOf(".");
      const decimalSep = lastComma > lastDot ? "," : ".";
      const groupingSep = decimalSep === "," ? "." : ",";
      normalized = raw.replace(new RegExp(`\\${groupingSep}`, "g"), "");
      if (decimalSep === ",") normalized = normalized.replace(",", ".");
    } else if (hasComma || hasDot) {
      const sep = hasComma ? "," : ".";
      const idx = raw.lastIndexOf(sep);
      const decimals = raw.length - idx - 1;
      if (decimals === 0 || decimals === 3) {
        normalized = raw.replace(new RegExp(`\\${sep}`, "g"), "");
      } else if (sep === ",") {
        normalized = raw.replace(",", ".");
      }
    }

    const n = Number.parseFloat(normalized);
    return Number.isFinite(n) ? n : null;
  };

  const formattedPrice = priceObj.formattedPrice || null;
  const formattedAmount = parseFormattedPriceNumber(formattedPrice);

  const rawCandidates = [priceObj.amount, priceObj.value, priceObj.amountMicros]
    .filter((v) => Number.isFinite(v))
    .flatMap((v) => [v, v / 100, v / 1_000, v / 1_000_000])
    .filter((v) => Number.isFinite(v) && v > 0);

  let amount = null;
  if (Number.isFinite(formattedAmount)) {
    amount = rawCandidates.length
      ? rawCandidates.reduce((best, candidate) => {
          const bestDelta = Math.abs(best - formattedAmount);
          const candidateDelta = Math.abs(candidate - formattedAmount);
          return candidateDelta < bestDelta ? candidate : best;
        }, rawCandidates[0])
      : formattedAmount;
  } else if (rawCandidates.length) {
    amount = rawCandidates.find((v) => v < 100_000) ?? rawCandidates[0];
  }

  return {
    amount,
    currencyCode: priceObj.currencyCode || priceObj.currency || null,
    formattedPrice,
  };
}

function formatMonthlyEquivalent(product) {
  const priceData = getPriceData(product);
  if (!priceData || !Number.isFinite(priceData.amount) || priceData.amount <= 0) return null;

  const monthly = priceData.amount / 12;
  const roundedUpMonthly = Math.ceil(monthly);

  if (priceData.currencyCode) {
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: priceData.currencyCode,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(roundedUpMonthly);
    } catch {
      // fall through to symbol-based formatting
    }
  }

  const fallbackNumber = roundedUpMonthly.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  if (!priceData.formattedPrice) return fallbackNumber;

  const tokens = String(priceData.formattedPrice).match(/^(\D*)[\d.,\s]+(\D*)$/);
  const prefix = tokens?.[1]?.trim() || "";
  const suffix = tokens?.[2]?.trim() || "";
  if (prefix && suffix) return `${prefix}${fallbackNumber} ${suffix}`;
  if (prefix) return `${prefix}${fallbackNumber}`;
  if (suffix) return `${fallbackNumber} ${suffix}`;
  return fallbackNumber;
}

const BENEFITS_BY_TIER = {
  basic: [
    { label: "250 AI generations / month", included: true },
    { label: "Premium voices · 30K chars/mo", included: true },
    { label: "CSV, Excel, Anki import & export", included: true },
    { label: "PDF, DOCX, PNG, JPEG import", included: true },
    { label: "2 GB cloud backup", included: true },
  ],
  pro: [
    { label: "600 AI generations / month", included: true },
    { label: "Premium voices · 50K chars/mo", included: true },
    { label: "CSV, Excel, Anki import & export", included: true },
    { label: "PDF, DOCX, PNG, JPEG import", included: true },
    { label: "20 GB cloud backup", included: true },
  ],
};

const PLAN_META = {
  free: {
    label: "Free",
    color: "text-white/50",
    bg: "bg-white/[0.04]",
    border: "border-white/[0.07]",
    dot: "bg-white/20",
  },
  basic: {
    label: "Basic",
    color: "text-sky-300",
    bg: "bg-sky-500/[0.06]",
    border: "border-sky-500/20",
    dot: "bg-sky-400",
  },
  pro: {
    label: "Pro",
    color: "text-accent",
    bg: "bg-accent/[0.06]",
    border: "border-accent/20",
    dot: "bg-accent",
  },
  vip: {
    label: "Pro (VIP)",
    color: "text-accent",
    bg: "bg-accent/[0.06]",
    border: "border-accent/20",
    dot: "bg-accent",
  },
};

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
  const [billingPeriod, setBillingPeriod] = useState(MONTHLY);

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
    return () => {
      mounted = false;
    };
  }, [isConfigured, getOfferings]);

  const handlePurchase = async (rcPackage, packageKey) => {
    setPurchaseError(null);
    setPurchasingPackageId(packageKey ?? null);
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
        setPurchaseError(null);
      }
    } finally {
      setPurchasingPackageId(null);
    }
  };

  if (!isConfigured) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.05] p-6 text-center">
          <p className="text-amber-200/90 mb-2 font-medium">Subscriptions are not configured.</p>
          <p className="text-white/50 text-sm mb-3">
            Add{" "}
            <code className="bg-white/[0.08] px-1.5 py-0.5 rounded text-white/70">NEXT_PUBLIC_REVENUECAT_WEB_API_KEY</code>
            {" "}to your{" "}
            <code className="bg-white/[0.08] px-1.5 py-0.5 rounded text-white/70">.env</code>
            {" "}and set up a Web Billing app in the{" "}
            <a
              href="https://app.revenuecat.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-400 hover:text-amber-300 underline underline-offset-2 transition-colors"
            >
              RevenueCat dashboard
            </a>
            .
          </p>
          <p className="text-white/30 text-xs">
            After changing{" "}
            <code className="bg-white/[0.08] px-1 rounded">.env</code>
            , restart the dev server.
          </p>
        </div>
      </div>
    );
  }

  if (loading && !customerInfo) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 flex flex-col items-center gap-3">
        <Loader2 className="w-6 h-6 text-white/30 animate-spin" />
        <p className="text-sm text-white/30">Loading subscription…</p>
      </div>
    );
  }

  const planLevel = getPlanLevel(customerInfo, isVip);
  const planMeta = PLAN_META[planLevel] || PLAN_META.free;
  const showManage = customerInfo?.managementURL && !isVip;
  const showPlans = planLevel !== "pro" && planLevel !== "vip";
  const availablePackages = collectAvailablePackages(offerings);
  const filteredPackages =
    planLevel === "basic"
      ? availablePackages.filter((pkg) => inferPackageTier(pkg) !== "basic")
      : availablePackages;
  const displayPackages = (() => {
    const byKey = new Map();
    for (const pkg of filteredPackages) {
      const tier = inferPackageTier(pkg);
      const cadence = inferPackageCadence(pkg?.identifier);
      const product = pkg?.webBillingProduct || pkg?.rcBillingProduct;
      const productId = String(product?.identifier || pkg?.identifier || "");
      const key =
        tier === "unknown"
          ? `unknown:${cadence}:${productId}`
          : `${tier}:${cadence}`;
      if (!byKey.has(key)) byKey.set(key, pkg);
    }
    return Array.from(byKey.values());
  })();
  const periodPackages = displayPackages.filter((pkg) => {
    const cadence = inferPackageCadence(pkg?.identifier);
    if (billingPeriod === YEARLY) return cadence === "annual";
    return cadence === "monthly";
  });
  const packagesToRender = periodPackages.length > 0 ? periodPackages : displayPackages;

  return (
    <div className="relative min-h-[calc(100vh-3.5rem)] max-w-5xl mx-auto px-4 py-10 sm:py-14">
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-96 w-[56rem] rounded-full bg-accent/[0.04] blur-[120px]" />
        <div className="absolute top-32 right-0 h-64 w-64 rounded-full bg-accent/[0.04] blur-[90px]" />
      </div>

      {/* Back link */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-white/30 hover:text-white/60 text-[13px] mb-10 transition-colors group"
      >
        <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
        Dashboard
      </Link>

      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-10"
      >
        <p className="text-[11px] font-bold tracking-[0.2em] uppercase text-accent/60 mb-3">
          Subscription
        </p>
        <h1 className="font-tiempos text-[2rem] sm:text-[2.4rem] font-semibold leading-[1.1] text-white mb-3">
          Unlock your full potential
        </h1>
        <p className="text-white/35 text-[15px] max-w-md leading-relaxed">
          More AI generations, premium voices, and expanded cloud storage — upgrade when you&apos;re ready.
        </p>
      </motion.div>

      {(error || purchaseError) && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-red-500/20 bg-red-500/[0.06] p-4 text-red-300 text-sm mb-6"
        >
          {error || purchaseError}
        </motion.div>
      )}

      {/* Current plan card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.06 }}
        className={`relative overflow-hidden rounded-2xl border p-5 mb-8 ${planMeta.border} ${planMeta.bg}`}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
              planLevel !== "free" ? "bg-accent/10" : "bg-white/[0.04]"
            }`}>
              <Crown className={`w-4 h-4 ${planLevel !== "free" ? "text-accent" : "text-white/20"}`} />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-white/30 font-bold mb-0.5">Current plan</p>
              <p className={`font-semibold text-base leading-none ${planMeta.color}`}>
                {loading ? "Checking…" : planMeta.label}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
              planLevel !== "free"
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/15"
                : "bg-white/[0.05] text-white/30 border border-white/[0.07]"
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${planLevel !== "free" ? "bg-emerald-400 animate-pulse" : "bg-white/20"}`} />
              {planLevel !== "free" ? "Active" : "Free tier"}
            </span>
          </div>
        </div>

        {showManage && (
          <div className="mt-4 pt-4 border-t border-white/[0.05]">
            <a
              href={customerInfo.managementURL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[13px] text-white/35 hover:text-white/60 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Manage billing & subscription
            </a>
          </div>
        )}
      </motion.div>

      {/* Plans section */}
      {showPlans && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.12 }}
        >
          {/* Section label + billing toggle */}
          <p className="text-[11px] font-bold tracking-[0.18em] uppercase text-white/30 mb-5">
            Available plans
          </p>

          <div className="flex justify-center mb-7">
            <div className="inline-flex p-0.5 rounded-full bg-white/[0.04] border border-white/[0.07] overflow-visible">
              <button
                type="button"
                onClick={() => setBillingPeriod(MONTHLY)}
                className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition-all duration-200 ${
                  billingPeriod === MONTHLY
                    ? "bg-white text-black shadow-sm"
                    : "text-white/40 hover:text-white/70"
                }`}
              >
                Monthly
              </button>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setBillingPeriod(YEARLY)}
                  className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition-all duration-200 ${
                    billingPeriod === YEARLY
                      ? "bg-white text-black shadow-sm"
                      : "text-white/40 hover:text-white/70"
                  }`}
                >
                  Yearly
                </button>
                <span className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-emerald-500 text-white text-[9px] font-bold leading-none whitespace-nowrap z-10">
                  -20%
                </span>
              </div>
            </div>
          </div>

          {offeringsLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="w-5 h-5 text-white/20 animate-spin" />
              <p className="text-[13px] text-white/25">Loading plans…</p>
            </div>
          ) : packagesToRender.length > 0 ? (
            <div className="flex flex-wrap justify-center gap-4 lg:gap-6 items-stretch pt-5">
              {packagesToRender.map((pkg, i) => {
                const product = pkg.webBillingProduct || pkg.rcBillingProduct;
                const priceStr = product?.price?.formattedPrice ?? product?.currentPrice?.formattedPrice ?? "—";
                const title = product?.title || packageLabel(pkg.identifier);
                const packageKey = `${pkg.identifier || "pkg"}:${product?.identifier || "product"}`;
                const isPurchasing = purchasingPackageId === packageKey;
                const tierTag = inferPackageTier(pkg);
                const isAnnual =
                  pkg.identifier.toLowerCase().includes("annual") ||
                  pkg.identifier.toLowerCase().includes("yearly") ||
                  pkg.identifier === "$rc_annual";
                const monthlyEquivalent = isAnnual ? formatMonthlyEquivalent(product) : null;
                const displayPrice = isAnnual && monthlyEquivalent ? monthlyEquivalent : priceStr;
                const displayPriceSuffix =
                  billingPeriod === MONTHLY || (isAnnual && monthlyEquivalent) ? "/mo" : null;
                const isFeatured = isAnnual && tierTag === "pro";
                const benefits = BENEFITS_BY_TIER[tierTag] || BENEFITS_BY_TIER.pro;

                return (
                  <motion.div
                    key={packageKey}
                    custom={i}
                    variants={cardVariants}
                    initial="hidden"
                    animate="visible"
                    className="flex h-full w-full md:w-[300px]"
                  >
                    <PlanCard
                      onClick={() => handlePurchase(pkg, packageKey)}
                      disabled={isPurchasing}
                      loading={isPurchasing}
                      title={title}
                      description={product?.description}
                      price={displayPrice}
                      priceSuffix={displayPriceSuffix}
                      billingText={
                        isAnnual
                          ? monthlyEquivalent
                            ? `Billed annually at ${priceStr}`
                            : "Billed yearly"
                          : "per month"
                      }
                      badge={isFeatured ? "Most popular" : null}
                      tone={isFeatured ? "featured" : "default"}
                      liftFeatured={false}
                      ctaLabel="Get started"
                    >
                      <ul className="flex flex-col gap-2.5">
                        {benefits.map((feature) => (
                          <li key={feature.label} className="flex items-start gap-2.5">
                            <span
                              className={`mt-[1px] flex-shrink-0 w-[18px] h-[18px] rounded-full flex items-center justify-center ${
                                feature.included
                                  ? isFeatured
                                    ? "bg-accent/15 text-accent"
                                    : "bg-white/[0.06] text-white/50"
                                  : "bg-white/[0.03] text-white/15"
                              }`}
                            >
                              {feature.included ? (
                                <Check className="w-2.5 h-2.5" strokeWidth={3} />
                              ) : (
                                <Minus className="w-2.5 h-2.5" strokeWidth={2.5} />
                              )}
                            </span>
                            <span
                              className={`text-[13px] leading-snug ${
                                feature.included
                                  ? isFeatured
                                    ? "text-white/70"
                                    : "text-white/55"
                                  : "text-white/20 line-through"
                              }`}
                            >
                              {feature.label}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </PlanCard>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.015] p-10 text-center">
              <Sparkles className="w-6 h-6 text-white/15 mx-auto mb-3" />
              <p className="text-white/35 text-sm">
                No plans available right now.{" "}
                <a
                  href="https://app.revenuecat.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:text-accent/70 underline underline-offset-2 transition-colors"
                >
                  Check RevenueCat dashboard
                </a>
              </p>
            </div>
          )}

          {/* Trust line */}
          <p className="text-center text-[12px] text-white/20 mt-8">
            Cancel anytime · Secure billing via RevenueCat · Prices in USD
          </p>
        </motion.div>
      )}

      {/* Footer nav */}
      <p className="mt-12 text-white/15 text-[12px] text-center">
        <Link href="/dashboard" className="hover:text-white/40 transition-colors">
          Dashboard
        </Link>
        {" · "}
        <Link href="/dashboard/profile" className="hover:text-white/40 transition-colors">
          Profile
        </Link>
      </p>
    </div>
  );
}

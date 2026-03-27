"use client";

import Link from "next/link";
import { Check, Loader2, Sparkles } from "lucide-react";

export default function PlanCard({
  title,
  description,
  price,
  badge,
  tone = "default",
  ctaLabel = "Choose plan",
  priceSuffix,
  billingText,
  liftFeatured = true,
  href,
  onClick,
  disabled = false,
  loading = false,
  children,
}) {
  const isFeatured = tone === "featured";

  return (
    <div
      className={`relative flex h-full w-full flex-col rounded-2xl transition-all duration-300 ${
        isFeatured
          ? `bg-gradient-to-b from-[#091620] to-[#060d14] border border-accent/30 shadow-[0_0_80px_rgba(35,131,226,0.1),0_0_1px_rgba(35,131,226,0.25)] ${liftFeatured ? "md:-translate-y-3" : ""}`
          : "border border-white/[0.07] bg-white/[0.025] hover:bg-white/[0.04] hover:border-white/[0.12]"
      }`}
    >
      {/* Featured inner glow */}
      {isFeatured && (
        <div className="pointer-events-none absolute inset-0 rounded-2xl overflow-hidden">
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-40 h-24 bg-accent/[0.15] blur-2xl" />
        </div>
      )}

      {badge && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold tracking-widest uppercase ${
              isFeatured
                ? "text-white bg-accent shadow-[0_0_20px_rgba(35,131,226,0.5)]"
                : "text-white/60 bg-white/[0.07] border border-white/[0.1]"
            }`}
          >
            {isFeatured ? <Sparkles className="w-3 h-3" /> : null}
            {badge}
          </span>
        </div>
      )}

      <div className="p-6 lg:p-7 pb-0 flex-1 flex flex-col">
        {/* Title & description */}
        <div className="mb-5">
          <p
            className={`text-[10px] font-black tracking-[0.18em] uppercase mb-2 ${
              isFeatured ? "text-accent/70" : "text-white/30"
            }`}
          >
            {title}
          </p>

          {/* Price */}
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-[2.6rem] font-bold tabular-nums leading-none text-white">
              {price}
            </span>
            {priceSuffix ? (
              <span className={`text-sm ${isFeatured ? "text-accent/50" : "text-white/35"}`}>
                {priceSuffix}
              </span>
            ) : null}
          </div>
          {billingText ? (
            <p className={`text-[12px] mt-1 ${isFeatured ? "text-accent/40" : "text-white/30"}`}>
              {billingText}
            </p>
          ) : null}

          {description ? (
            <p className="text-[12px] mt-2.5 leading-relaxed text-white/30">
              {description}
            </p>
          ) : null}
        </div>

        {/* CTA */}
        <div className="mb-5">
          {href ? (
            <Link
              href={href}
              className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-semibold transition-all duration-200 ${
                isFeatured
                  ? "bg-accent hover:bg-accent/90 text-white shadow-[0_0_28px_rgba(35,131,226,0.3)] hover:shadow-[0_0_36px_rgba(35,131,226,0.45)]"
                  : "bg-white/[0.07] hover:bg-white/[0.13] text-white border border-white/[0.09]"
              }`}
            >
              <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
              {ctaLabel}
            </Link>
          ) : (
            <button
              type="button"
              onClick={onClick}
              disabled={disabled || loading}
              className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                isFeatured
                  ? "bg-accent hover:bg-accent/90 text-white shadow-[0_0_28px_rgba(35,131,226,0.3)] hover:shadow-[0_0_36px_rgba(35,131,226,0.45)]"
                  : "bg-white/[0.07] hover:bg-white/[0.13] text-white border border-white/[0.09]"
              }`}
            >
              {loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
              )}
              {loading ? "Opening…" : ctaLabel}
            </button>
          )}
        </div>

        {/* Features */}
        {children ? (
          <div className={`border-t pt-5 pb-6 lg:pb-7 ${isFeatured ? "border-accent/10" : "border-white/[0.05]"}`}>
            {children}
          </div>
        ) : null}
      </div>
    </div>
  );
}

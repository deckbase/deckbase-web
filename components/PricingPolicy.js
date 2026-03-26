"use client";
import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Check, Minus, Zap } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const MONTHLY = "monthly";
const YEARLY = "yearly";

const SUBSCRIPTION_REDIRECT = "/dashboard/subscription";
const LOGIN_REDIRECT = `/login?redirect=${encodeURIComponent(SUBSCRIPTION_REDIRECT)}`;

const plans = [
  {
    id: "free",
    title: "Free",
    price: { monthly: 0, yearly: 0 },
    billing: { monthly: "Free forever", yearly: "Free forever" },
    saveLabel: null,
    bestFor: "Manual card testing",
    popular: false,
    cta: "Get started",
    features: [
      { label: "AI card generation", included: false },
      { label: "Unlimited OCR", included: true },
      { label: "Unlimited decks & cards", included: true },
      { label: "Spaced repetition", included: true },
      { label: "Unlimited quizzes", included: true },
      { label: "Image & Audio media", included: true },
      { label: "Text-to-speech", included: false },
      { label: "MCP integration", included: false },
      { label: "CSV import & export", included: true },
      { label: "PDF, DOCX, PNG import", included: false },
      { label: "Cloud backup", included: false },
    ],
  },
  {
    id: "basic",
    title: "Basic",
    price: { monthly: 5.99, yearly: 59 },
    billing: {
      monthly: "per month",
      yearly: "per year",
    },
    saveLabel: "Save 18%",
    yearlyMonthly: (59 / 12).toFixed(2),
    bestFor: "Regular students",
    popular: true,
    cta: "Get Basic",
    features: [
      { label: "250 AI generations / month", included: true },
      { label: "Unlimited OCR", included: true },
      { label: "Unlimited decks & cards", included: true },
      { label: "Spaced repetition", included: true },
      { label: "Unlimited quizzes", included: true },
      { label: "Image & Audio media", included: true },
      { label: "Premium voices · 30K chars/mo", included: true },
      { label: "MCP integration", included: true },
      { label: "CSV, Excel, Anki import & export", included: true },
      { label: "PDF, DOCX, PNG, JPEG import", included: true },
      { label: "2 GB cloud backup", included: true },
    ],
  },
  {
    id: "pro",
    title: "Pro",
    price: { monthly: 11.99, yearly: 119 },
    billing: {
      monthly: "per month",
      yearly: "per year",
    },
    saveLabel: "Save 17%",
    yearlyMonthly: (119 / 12).toFixed(2),
    bestFor: "Exam prep & heavy users",
    popular: false,
    cta: "Get Pro",
    features: [
      { label: "600 AI generations / month", included: true },
      { label: "Unlimited OCR", included: true },
      { label: "Unlimited decks & cards", included: true },
      { label: "Spaced repetition", included: true },
      { label: "Unlimited quizzes", included: true },
      { label: "Image & Audio media", included: true },
      { label: "Premium voices · 50K chars/mo", included: true },
      { label: "MCP integration", included: true },
      { label: "CSV, Excel, Anki import & export", included: true },
      { label: "PDF, DOCX, PNG, JPEG import", included: true },
      { label: "20 GB cloud backup", included: true },
    ],
  },
];

const cardVariants = {
  hidden: { opacity: 0, y: 28 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.1, ease: [0.25, 0.1, 0.25, 1] },
  }),
};

const PricingPlans = () => {
  const [billingPeriod, setBillingPeriod] = useState(MONTHLY);
  const { user } = useAuth();
  const subscribeHref = user ? SUBSCRIPTION_REDIRECT : LOGIN_REDIRECT;

  const getPrice = (plan) => {
    if (plan.price.monthly === 0) return "$0";
    if (billingPeriod === YEARLY) return `$${plan.yearlyMonthly}`;
    return `$${plan.price.monthly.toFixed(2)}`;
  };

  const getBilling = (plan) => {
    if (plan.price.monthly === 0) return "Free forever";
    if (billingPeriod === YEARLY) {
      return `Billed $${plan.price.yearly}/year`;
    }
    return "per month";
  };

  return (
    <section className="relative w-full text-white overflow-hidden pt-24 md:pt-32 pb-24">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] rounded-full bg-accent/[0.06] blur-[140px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[300px] rounded-full bg-violet-600/[0.04] blur-[120px]" />
      </div>

      <div className="mx-auto px-5 md:px-[5%] max-w-[1200px]">
        {/* Header */}
        <motion.div
          className="text-center mb-14"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
        >
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold tracking-widest uppercase text-accent border border-accent/25 bg-accent/[0.07] mb-5">
            <Zap className="w-3 h-3" />
            Pricing
          </span>
          <h1 className="text-h2 lg:text-h3 font-bold tracking-tight leading-tight">
            Simple, transparent pricing
          </h1>
          <p className="mt-4 text-white/50 text-base md:text-lg max-w-[480px] mx-auto leading-relaxed">
            Start free. Upgrade when you&apos;re ready to unlock AI and advanced features.
          </p>

          {/* Billing toggle */}
          <div className="mt-8 inline-flex p-1 rounded-full bg-white/[0.05] border border-white/[0.08]">
            <button
              type="button"
              onClick={() => setBillingPeriod(MONTHLY)}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                billingPeriod === MONTHLY
                  ? "bg-white text-black shadow-sm"
                  : "text-white/50 hover:text-white"
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setBillingPeriod(YEARLY)}
              className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                billingPeriod === YEARLY
                  ? "bg-white text-black shadow-sm"
                  : "text-white/50 hover:text-white"
              }`}
            >
              Yearly
              <span className="text-[10px] font-bold tracking-wide text-accent bg-accent/10 px-1.5 py-0.5 rounded-md">
                −18%
              </span>
            </button>
          </div>
        </motion.div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-5 items-start">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.id}
              custom={i}
              variants={cardVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-40px" }}
              className={`relative flex flex-col rounded-2xl p-6 lg:p-7 transition-all duration-300 ${
                plan.popular
                  ? "bg-white/[0.06] border border-accent/40 shadow-[0_0_60px_rgba(35,131,226,0.14)] md:-translate-y-3"
                  : "bg-white/[0.02] border border-white/[0.07] hover:bg-white/[0.04] hover:border-white/[0.12]"
              }`}
            >
              {/* Popular badge */}
              {plan.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold tracking-wide text-white bg-accent shadow-[0_0_20px_rgba(35,131,226,0.5)]">
                    <span className="w-1.5 h-1.5 rounded-full bg-white/80 animate-pulse" />
                    Most popular
                  </span>
                </div>
              )}

              {/* Plan header */}
              <div className="mb-6">
                <p className="text-xs font-bold tracking-widest uppercase text-white/40 mb-3">
                  {plan.title}
                </p>

                <div className="flex items-baseline gap-1.5 mb-1.5">
                  <span className="text-4xl font-bold tabular-nums text-white">
                    {getPrice(plan)}
                  </span>
                  {plan.price.monthly !== 0 && (
                    <span className="text-white/40 text-sm">/mo</span>
                  )}
                </div>

                <div className="flex items-center gap-2 min-h-[1.5rem]">
                  <p className="text-white/40 text-sm">{getBilling(plan)}</p>
                  {billingPeriod === YEARLY && plan.saveLabel && (
                    <motion.span
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="text-[10px] font-bold tracking-wide text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-1.5 py-0.5 rounded-md"
                    >
                      {plan.saveLabel}
                    </motion.span>
                  )}
                </div>

                <p className="mt-3 text-[13px] text-white/35">
                  Best for{" "}
                  <span className="text-white/60">{plan.bestFor}</span>
                </p>
              </div>

              {/* CTA button */}
              <Link
                href={plan.price.monthly === 0 ? "/login" : subscribeHref}
                className={`block w-full text-center py-2.5 px-4 rounded-xl text-sm font-semibold transition-all duration-200 mb-6 ${
                  plan.popular
                    ? "bg-accent hover:bg-accent/90 text-white shadow-[0_0_24px_rgba(35,131,226,0.3)] hover:shadow-[0_0_32px_rgba(35,131,226,0.45)]"
                    : plan.id === "pro"
                    ? "bg-white/[0.08] hover:bg-white/[0.14] text-white border border-white/[0.1]"
                    : "bg-white/[0.05] hover:bg-white/[0.09] text-white/70 hover:text-white border border-white/[0.07]"
                }`}
              >
                {plan.price.monthly === 0
                  ? "Get started free"
                  : user
                  ? plan.cta
                  : "Sign in to subscribe"}
              </Link>

              {/* Divider */}
              <div className="border-t border-white/[0.06] mb-5" />

              {/* Feature list */}
              <ul className="flex flex-col gap-3">
                {plan.features.map((feature, fi) => (
                  <li key={fi} className="flex items-start gap-3">
                    <span
                      className={`mt-[1px] flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center ${
                        feature.included
                          ? plan.popular
                            ? "bg-accent/15 text-accent"
                            : "bg-white/[0.07] text-white/60"
                          : "bg-white/[0.03] text-white/20"
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
                        feature.included ? "text-white/70" : "text-white/25 line-through"
                      }`}
                    >
                      {feature.label}
                    </span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        {/* Bottom note */}
        <motion.p
          className="text-center text-white/25 text-xs mt-10"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
        >
          All plans include access on iOS. Cancel or change your plan anytime.
        </motion.p>
      </div>
    </section>
  );
};

export default PricingPlans;

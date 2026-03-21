"use client";
import { useState, Fragment } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";

const MONTHLY = "monthly";
const YEARLY = "yearly";

const plans = [
  {
    id: "01",
    title: "Free",
    price: "$0",
    priceYearly: null,
    billing: "Free forever",
    billingYearly: null,
    benefits: [
      "No AI card generation",
      "Unlimited OCR",
      "Unlimited decks",
      "Unlimited cards",
      "Unlimited spaced repetition",
      "Unlimited quizzes",
      "Supported media: Image, Audio",
      "No text-to-speech",
      "No MCP",
      "Import: CSV only",
      "Export: CSV only",
      "Import from file: —",
      "No cloud backup",
    ],
    bestFor: "Manual card testing",
  },
  {
    id: "02",
    title: "Basic",
    popular: true,
    price: "$5.99",
    priceYearly: "$59",
    billing: "Per month",
    billingYearly: "Save 18%",
    benefits: [
      "250 AI card generations/month",
      "Unlimited OCR",
      "Unlimited decks",
      "Unlimited cards",
      "Unlimited spaced repetition",
      "Unlimited quizzes",
      "Supported media: Image, Audio",
      "Premium voices + speed (up to 30K chars/mo)",
      "MCP",
      "Import: CSV, Excel, Anki",
      "Export: CSV, Excel, Anki",
      "Import from file: PDF, DOCX, PNG, JPEG",
      "2GB cloud backup",
    ],
    bestFor: "Regular students",
  },
  {
    id: "03",
    title: "Pro",
    price: "$11.99",
    priceYearly: "$119",
    billing: "Per month",
    billingYearly: "Save 17%",
    benefits: [
      "600 AI card generations/month",
      "Unlimited OCR",
      "Unlimited decks",
      "Unlimited cards",
      "Unlimited spaced repetition",
      "Unlimited quizzes",
      "Supported media: Image, Audio",
      "Premium voices (up to 50K chars/mo)",
      "MCP",
      "Import: CSV, Excel, Anki",
      "Export: CSV, Excel, Anki",
      "Import from file: PDF, DOCX, PNG, JPEG",
      "20GB cloud backup",
    ],
    bestFor: "Exam prep, heavy users",
  },
];

const SUBSCRIPTION_REDIRECT = "/dashboard/subscription";
const LOGIN_REDIRECT = `/login?redirect=${encodeURIComponent(SUBSCRIPTION_REDIRECT)}`;

const FREE_CHECKMARKS = [
  "Unlimited OCR",
  "Unlimited decks",
  "Unlimited cards",
  "Unlimited spaced repetition",
  "Unlimited quizzes",
  "Supported media: Image, Audio",
  "Import: CSV only",
  "Export: CSV only",
  "Import from file: —",
];

function BenefitCell({ benefit, isFree, planTitle }) {
  const showCheck = !isFree || FREE_CHECKMARKS.includes(benefit);
  return (
    <div className="flex items-start gap-3 py-3 px-4 md:px-6 min-h-[3rem]">
      <span className="w-5 h-5 mt-0.5 flex-shrink-0 flex items-center justify-center rounded-full bg-slate-100">
        {showCheck ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-3.5 h-3.5 text-violet-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <span className="w-1.5 h-1.5 rounded-full bg-slate-300" aria-hidden />
        )}
      </span>
      <span className="text-slate-600 text-sm leading-snug">
        {planTitle ? (
          <>
            <span className="md:hidden font-medium text-slate-500 mr-1.5">{planTitle}:</span>
            {benefit}
          </>
        ) : (
          benefit
        )}
      </span>
    </div>
  );
}

const PricingPlans = () => {
  const [billingPeriod, setBillingPeriod] = useState(MONTHLY);
  const { user } = useAuth();
  const subscribeHref = user ? SUBSCRIPTION_REDIRECT : LOGIN_REDIRECT;
  const benefitCount = plans[0].benefits.length;

  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { duration: 0.8 } }}
      className="relative z-10 w-full bg-black pt-24 md:pt-32 pb-20"
    >
      <article className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
            Simple, transparent pricing
          </h2>
          <p className="mt-4 text-slate-400 text-lg max-w-xl mx-auto">
            Compare Free, Basic, and Pro. Pick the plan that fits your learning.
          </p>

          <div className="mt-8 inline-flex p-1 rounded-full bg-slate-800 border border-slate-700">
            <button
              type="button"
              onClick={() => setBillingPeriod(MONTHLY)}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                billingPeriod === MONTHLY ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-white"
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setBillingPeriod(YEARLY)}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                billingPeriod === YEARLY ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-white"
              }`}
            >
              Yearly
              <span className="ml-1.5 text-xs font-semibold text-violet-400">Save up to 18%</span>
            </button>
          </div>
        </div>

        {/* Plan cards + comparison table in one grid so columns align */}
        <div className="mt-14 w-full min-w-0 overflow-x-auto">
          <div
            className="grid grid-cols-3 gap-0 min-w-[320px] w-full rounded-2xl overflow-hidden bg-white shadow-xl shadow-slate-200/50 border border-slate-200/80"
            style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}
          >
            {/* Row 0: Plan cards */}
            {plans.map((plan, colIndex) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0, transition: { duration: 0.35, delay: colIndex * 0.05 } }}
                viewport={{ once: true }}
                className={`flex flex-col p-6 md:p-8 relative bg-white ${colIndex === 0 ? "rounded-tl-2xl" : ""} ${colIndex === 2 ? "rounded-tr-2xl" : ""}`}
              >
                <div className="min-h-[2.5rem] flex items-center justify-center mb-4">
                  {plan.popular && (
                    <span className="inline-flex px-3 py-1 bg-violet-600 text-white text-xs font-semibold rounded-full shadow-lg shadow-violet-500/25">
                      Most popular
                    </span>
                  )}
                </div>
                <div className={`flex flex-col ${billingPeriod === YEARLY ? "min-h-[10rem]" : "min-h-[7.5rem]"}`}>
                  <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">
                    {plan.title}
                  </p>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-3xl md:text-4xl font-bold text-slate-900 tabular-nums">
                      {billingPeriod === YEARLY && plan.priceYearly
                        ? (() => {
                            const annualNum = parseFloat(plan.priceYearly.replace(/[$,]/g, ""));
                            return `$${(annualNum / 12).toFixed(2)}`;
                          })()
                        : plan.price.replace("$", "")}
                    </span>
                    {plan.price !== "$0" && (
                      <span className="text-slate-500 text-base font-medium">/mo</span>
                    )}
                  </div>
                  <p className="mt-1 text-slate-600 text-sm">
                    {billingPeriod === YEARLY && plan.priceYearly ? (
                      <>
                        Billed ${parseFloat(plan.priceYearly.replace(/[$,]/g, "")).toFixed(0)}/year
                        <span className="ml-1.5 inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-violet-100 text-violet-700">
                          {plan.billingYearly}
                        </span>
                      </>
                    ) : (
                      plan.billing
                    )}
                  </p>
                  {billingPeriod === YEARLY && plan.priceYearly && plan.price !== "$0" && (() => {
                    const monthlyNum = parseFloat(plan.price.replace(/[$,]/g, ""));
                    const annualNum = parseFloat(plan.priceYearly.replace(/[$,]/g, ""));
                    const savePerYear = ((monthlyNum * 12) - annualNum).toFixed(0);
                    return (
                      <p className="text-xs text-slate-500 mt-0.5">
                        Save ${savePerYear}/yr
                      </p>
                    );
                  })()}
                </div>
                <p className="text-slate-500 text-sm mt-4 pt-4 border-t border-slate-100">
                  Best for: <span className="text-slate-700 font-medium">{plan.bestFor}</span>
                </p>
              </motion.div>
            ))}

            {/* Benefit rows */}
            {Array.from({ length: benefitCount }, (_, i) => (
              <Fragment key={i}>
                <div
                  role="cell"
                  className={`border-l border-slate-200/80 ${i % 2 === 0 ? "bg-white" : "bg-slate-50/40"}`}
                >
                  <BenefitCell benefit={plans[0].benefits[i]} isFree={true} planTitle="Free" />
                </div>
                <div
                  role="cell"
                  className={`border-l border-slate-200/80 ${i % 2 === 0 ? "bg-white" : "bg-slate-50/40"}`}
                >
                  <BenefitCell benefit={plans[1].benefits[i]} isFree={false} planTitle="Basic" />
                </div>
                <div
                  role="cell"
                  className={`border-l border-slate-200/80 ${i % 2 === 0 ? "bg-white" : "bg-slate-50/40"}`}
                >
                  <BenefitCell benefit={plans[2].benefits[i]} isFree={false} planTitle="Pro" />
                </div>
              </Fragment>
            ))}

            {/* Subscribe row */}
            <div className="bg-slate-50/90 border-l border-b border-slate-200/80 rounded-bl-2xl py-6 px-4 md:px-6">
              <span className="text-slate-400 text-sm">—</span>
            </div>
            <div className="bg-slate-50/90 border-l border-b border-slate-200/80 py-6 px-4 md:px-6">
              <Link
                href={subscribeHref}
                className="block w-full py-3 px-4 rounded-xl text-center text-sm font-semibold text-white bg-violet-600 hover:bg-violet-500 transition-colors shadow-sm"
              >
                {user ? "Get Basic" : "Sign in to subscribe"}
              </Link>
            </div>
            <div className="bg-slate-50/90 border-l border-b border-slate-200/80 rounded-br-2xl py-6 px-4 md:px-6">
              <Link
                href={subscribeHref}
                className="block w-full py-3 px-4 rounded-xl text-center text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors shadow-sm"
              >
                {user ? "Get Pro" : "Sign in to subscribe"}
              </Link>
            </div>
          </div>
        </div>
      </article>
    </motion.section>
  );
};

export default PricingPlans;

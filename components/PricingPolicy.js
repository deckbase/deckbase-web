"use client";
import { useState } from "react";
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
    <div className="flex items-start gap-2 py-2.5 px-3 md:px-6 border-b border-gray-100 min-h-[2.75rem]">
      <span className="w-5 h-5 mt-0.5 flex-shrink-0 flex items-center justify-center">
        {showCheck ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-5 h-5 text-green-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <span className="text-gray-400">—</span>
        )}
      </span>
      <span className="text-gray-700 text-sm">
        {planTitle ? (
          <>
            <span className="md:hidden font-medium text-gray-500 mr-1.5">{planTitle}:</span>
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
      className="relative z-10 w-full bg-white pt-24 md:pt-28"
    >
      <article className="container mx-auto py-14 p-4 px-5 md:px-[5%] 2xl:px-0 max-w-[1200px] flex flex-col items-center justify-center gap-4">
        <div className="flex flex-col items-center justify-center">
          <h2 className="text-h2 lg:text-h3 font-bold text-center tracking-tight max-w-[80%]">
            Affordable
            <span className="relative whitespace-nowrap text-[#505050]">
              <svg
                aria-hidden="true"
                viewBox="0 0 418 42"
                className="absolute top-2/3 left-0 h-[0.58em] w-full fill-black/50 dark:fill-black/30"
                preserveAspectRatio="none"
              >
                <path d="M203.371.916c-26.013-2.078-76.686 1.963-124.73 9.946L67.3 12.749C35.421 18.062 18.2 21.766 6.004 25.934 1.244 27.561.828 27.778.874 28.61c.07 1.214.828 1.121 9.595-1.176 9.072-2.377 17.15-3.92 39.246-7.496C123.565 7.986 157.869 4.492 195.942 5.046c7.461.108 19.25 1.696 19.17 2.582-.107 1.183-7.874 4.31-25.75 10.366-21.992 7.45-35.43 12.534-36.701 13.884-2.173 2.308-.202 4.407 4.442 4.734 2.654.187 3.263.157 15.593-.780 35.401-2.686 57.944-3.488 88.365-3.143 46.327.526 75.721 2.23 130.788 7.584 19.787 1.924 20.814 1.98 24.557 1.332l.066-.011c1.201-.203 1.53-1.825.399-2.335-2.911-1.31-4.893-1.604-22.048-3.261-57.509-5.556-87.871-7.36-132.059-7.842-23.239-.254-33.617-.116-50.627.674-11.629.540-42.371 2.494-46.696 2.967-2.359.259 8.133-3.625 26.504-9.810 23.239-7.825 27.934-10.149 28.304-14.005 .417-4.348-3.529-6-16.878-7.066Z"></path>
              </svg>
              <span className="relative text-[#505050]"> Plans & Pricing</span>
            </span>
          </h2>

          <article className="flex flex-col items-center justify-center mt-16">
            <p className="text-justify md:max-w-[60%] md:text-center">
              Compare Free, Basic, and Pro plans to find the right fit for your
              learning goals. Start learning smarter today.
            </p>
          </article>

          <div className="flex items-center justify-center gap-2 mt-8">
            <button
              type="button"
              onClick={() => setBillingPeriod(MONTHLY)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                billingPeriod === MONTHLY
                  ? "bg-gradient-to-r from-accent to-purple-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setBillingPeriod(YEARLY)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                billingPeriod === YEARLY
                  ? "bg-gradient-to-r from-accent to-purple-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Yearly
            </button>
          </div>
        </div>

        {/* Plan headers: Free | Basic | Pro */}
        <div className="mt-16 w-full grid grid-cols-1 md:grid-cols-3 gap-0">
          {plans.map((plan, colIndex) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0, transition: { duration: 0.4, delay: colIndex * 0.05 } }}
              viewport={{ once: true }}
              className={`flex flex-col rounded-xl shadow-lg p-6 md:p-8 relative ${
                plan.popular ? "ring-2 ring-violet-500/30 md:ring-0 md:shadow-[0_0_30px_-8px_rgba(139,92,246,0.3)]" : ""
              } ${colIndex === 0 ? "md:rounded-r-none" : colIndex === 2 ? "md:rounded-l-none" : ""}`}
            >
              {plan.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-accent to-purple-600 text-white text-xs font-semibold rounded-full shadow">
                  Popular
                </span>
              )}
              <div className={`flex flex-col gap-0 ${billingPeriod === YEARLY ? "min-h-[11rem]" : "min-h-[8rem]"}`}>
                <h3 className="text-h2 font-bold flex flex-wrap items-baseline gap-x-1.5">
                  {billingPeriod === YEARLY && plan.priceYearly
                    ? (() => {
                        const annualNum = parseFloat(plan.priceYearly.replace(/[$,]/g, ""));
                        const perMonth = (annualNum / 12).toFixed(2);
                        return (
                          <>
                            <span>${perMonth}</span>
                            <span className="text-sm font-normal text-[#505050]">per month</span>
                          </>
                        );
                      })()
                    : plan.price}
                  {plan.price !== "$0" && billingPeriod === MONTHLY && (
                    <span className="text-h5 font-inter">/mo</span>
                  )}
                </h3>
                <h4 className="text-h4 font-bold font-inter mt-2">
                  {plan.title}
                </h4>
                <p className="text-[#505050] text-sm flex flex-wrap items-center gap-2">
                  {billingPeriod === YEARLY && plan.priceYearly ? (
                    <>
                      <span>Billed annually at ${parseFloat(plan.priceYearly.replace(/[$,]/g, "")).toFixed(2)}</span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-gradient-to-r from-accent to-purple-600 text-white">
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
                  const savePerMonth = (monthlyNum - annualNum / 12).toFixed(2);
                  const savePerYear = ((monthlyNum * 12) - annualNum).toFixed(2);
                  return (
                    <p className="text-sm text-[#505050] mt-0.5">
                      Save ${savePerMonth}/mo · ${savePerYear}/yr vs monthly
                    </p>
                  );
                })()}
              </div>
              <p className="text-[#505050] text-sm pt-2 border-t border-gray-200 mt-2">
                Best for: {plan.bestFor}
              </p>
              {plan.price !== "$0" && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <Link
                    href={subscribeHref}
                    className="block w-full py-3 px-4 rounded-lg text-center text-sm font-semibold text-white bg-gradient-to-r from-accent to-purple-600 hover:opacity-90 transition-opacity"
                  >
                    {user ? "Subscribe" : "Sign in to subscribe"}
                  </Link>
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {/* Aligned comparison table: one row per benefit, columns match plan headers */}
        <div className="mt-0 w-full rounded-b-xl overflow-hidden border border-t-0 border-gray-200 shadow-lg bg-white">
          <div className="grid grid-cols-1 md:grid-cols-3" role="table" aria-label="Plan comparison">
            {Array.from({ length: benefitCount }, (_, i) => (
              <div key={i} className="contents" role="row">
                <div role="cell" className="bg-white">
                  <BenefitCell benefit={plans[0].benefits[i]} isFree={true} planTitle="Free" />
                </div>
                <div role="cell" className="bg-white">
                  <BenefitCell benefit={plans[1].benefits[i]} isFree={false} planTitle="Basic" />
                </div>
                <div role="cell" className="bg-white">
                  <BenefitCell benefit={plans[2].benefits[i]} isFree={false} planTitle="Pro" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </article>
    </motion.section>
  );
};

export default PricingPlans;

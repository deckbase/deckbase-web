"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import faqs from "./data/faqs.js";

const Faqs = () => {
  const [activeIndex, setActiveIndex] = useState(null);

  const toggle = (index) => {
    setActiveIndex(activeIndex === index ? null : index);
  };

  return (
    <section className="relative w-full bg-white overflow-hidden">
      {/* Subtle top rule */}
      <div className="w-full h-px bg-border" />

      <div className="container mx-auto max-w-[1200px] px-5 md:px-[5%] 2xl:px-0 py-24">

        {/* Two-column layout: sticky label left, accordion right */}
        <div className="flex flex-col lg:flex-row gap-16 lg:gap-24">

          {/* Left: section identity */}
          <div className="lg:w-[36%] lg:shrink-0">
            <div className="lg:sticky lg:top-28">
              <motion.p
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="text-xs uppercase tracking-[0.18em] text-secondary font-medium mb-4"
              >
                FAQ
              </motion.p>

              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, delay: 0.08 }}
                className="text-4xl md:text-5xl font-bold text-primary leading-[1.1] mb-6"
              >
                Questions,
                <br />
                <span className="bg-gradient-to-r from-accent to-purple-500 bg-clip-text text-transparent">
                  answered.
                </span>
              </motion.h2>

              <motion.p
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.18 }}
                className="text-secondary text-[15px] leading-relaxed max-w-xs"
              >
                Everything you need to know about Deckbase — AI flashcards, spaced repetition, and MCP workflows.
              </motion.p>

              {/* Decorative accent line */}
              <motion.div
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.3 }}
                style={{ originX: 0 }}
                className="mt-8 w-10 h-0.5 bg-gradient-to-r from-accent to-purple-500 rounded-full"
              />
            </div>
          </div>

          {/* Right: accordion */}
          <div className="flex-1 min-w-0">
            <ul>
              {faqs.map((faq, index) => {
                const isOpen = activeIndex === index;
                return (
                  <motion.li
                    key={index}
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.45, delay: index * 0.055 }}
                    className="border-b border-border last:border-b-0"
                  >
                    <button
                      onClick={() => toggle(index)}
                      className="group w-full flex items-start justify-between gap-6 py-6 text-left cursor-pointer"
                      aria-expanded={isOpen}
                    >
                      {/* Number + question */}
                      <div className="flex items-start gap-4 flex-1 min-w-0">
                        <span className="text-xs font-medium text-secondary/60 tabular-nums pt-0.5 shrink-0 w-6">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <span
                          className={`text-[15px] sm:text-base font-semibold leading-snug transition-colors duration-200 ${
                            isOpen ? "text-accent" : "text-primary group-hover:text-accent"
                          }`}
                        >
                          {faq.question}
                        </span>
                      </div>

                      {/* Toggle icon */}
                      <span
                        className={`shrink-0 mt-0.5 flex items-center justify-center w-6 h-6 rounded-full border transition-all duration-300 ${
                          isOpen
                            ? "border-accent bg-accent text-white rotate-45"
                            : "border-border bg-transparent text-secondary group-hover:border-accent group-hover:text-accent"
                        }`}
                        aria-hidden
                      >
                        <svg
                          width="10"
                          height="10"
                          viewBox="0 0 10 10"
                          fill="none"
                          className="transition-transform duration-300"
                        >
                          <path
                            d="M5 1v8M1 5h8"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                          />
                        </svg>
                      </span>
                    </button>

                    {/* Answer */}
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          key="answer"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                          className="overflow-hidden"
                        >
                          <div className="pl-10 pb-6 pr-10">
                            <p className="text-secondary text-sm leading-relaxed">
                              {faq.answer}
                            </p>
                            {faq.list && (
                              <ul className="mt-3 space-y-1.5 list-none">
                                {faq.list.map((item, idx) => (
                                  <li key={idx} className="flex items-start gap-2 text-secondary text-sm">
                                    <span className="mt-1.5 w-1 h-1 rounded-full bg-accent shrink-0" />
                                    {item}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>

      {/* Subtle bottom rule */}
      <div className="w-full h-px bg-border" />
    </section>
  );
};

export default Faqs;

"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { MdKeyboardArrowDown, MdKeyboardArrowUp } from "react-icons/md";
import { downloadFaqItems } from "@/lib/download-faq";

export default function DownloadFaq() {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <motion.section
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-white/10"
    >
      <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-2">
        Download FAQ
      </h2>
      <p className="text-white/50 text-center text-sm mb-10">
        Common questions about apps, platforms, and getting started.
      </p>
      <ul className="space-y-3">
        {downloadFaqItems.map((item, index) => {
          const open = openIndex === index;
          return (
            <li
              key={item.question}
              className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden"
            >
              <button
                type="button"
                onClick={() => setOpenIndex(open ? -1 : index)}
                className="w-full flex items-start justify-between gap-4 text-left p-4 md:p-5 text-white hover:bg-white/[0.04] transition-colors"
              >
                <span className="font-medium">{item.question}</span>
                {open ? (
                  <MdKeyboardArrowUp className="w-6 h-6 flex-shrink-0 text-white/60" />
                ) : (
                  <MdKeyboardArrowDown className="w-6 h-6 flex-shrink-0 text-white/60" />
                )}
              </button>
              {open && (
                <div className="px-4 md:px-5 pb-4 md:pb-5 text-white/70 text-sm leading-relaxed border-t border-white/5 pt-3">
                  {item.answer}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </motion.section>
  );
}

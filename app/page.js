"use client";

import "./globals.css";
import { useEffect } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Brain, Clock, Zap } from "lucide-react";
import AppStoreDownloadButton from "@/components/AppStoreDownloadButton";
import GooglePlayDownloadButton from "@/components/GooglePlayDownloadButton";
import HowItWorks from "@/components/HowItWorks";
import AppFeatures from "@/components/AppFeatures";
import UserTestimonials from "@/components/UserTestimonials";
import ProductHuntReviews from "@/components/ProductHuntReviews";
import Start from "@/components/Start";
import Faqs from "@/components/Faqs";
import faqs from "@/components/data/faqs";

const homeFaqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((faq) => ({
    "@type": "Question",
    name: faq.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: faq.answer,
    },
  })),
};

export default function Home() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homeFaqJsonLd) }}
      />
      {/* Hero Section */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
        className="relative min-h-screen bg-black pt-[calc(5rem+env(safe-area-inset-top,0px))] pb-6 overflow-x-hidden overflow-hidden"
      >
        {/* Dot grid texture */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.045) 1px, transparent 0)",
            backgroundSize: "48px 48px",
          }}
        />
        {/* Ambient background glows */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-[560px] h-[560px] bg-accent/30 rounded-full blur-[150px] opacity-75" />
          <div className="absolute top-1/3 right-1/4 w-[420px] h-[420px] bg-purple-600/25 rounded-full blur-[130px] opacity-65" />
          <div className="absolute bottom-1/4 left-[55%] w-80 h-80 bg-cyan-500/15 rounded-full blur-[100px]" />
          <div className="absolute -top-20 right-0 w-72 h-72 bg-purple-500/15 rounded-full blur-[90px]" />
        </div>

        <div className="relative z-20 max-w-6xl mx-auto px-3.5 sm:px-4 py-10 sm:py-16 lg:py-24">
          {/* 2-column layout on desktop */}
          <div className="flex flex-col lg:flex-row gap-8 lg:gap-20 items-center mb-16">

            {/* Left: Text content */}
            <div className="flex w-full flex-col items-center text-center lg:items-start lg:text-left">
              {/* Badge */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3, duration: 0.8 }}
                className="inline-flex items-center gap-2 mb-8 px-4 py-2 rounded-full bg-gradient-to-r from-accent/10 to-purple-600/10 backdrop-blur-md border border-accent/30 shadow-lg"
              >
                <span className="bg-gradient-to-r from-accent to-purple-600 bg-clip-text text-transparent font-medium text-sm">
                  AI-powered MCP + Anki-ready workflows
                </span>
              </motion.div>

              {/* Title */}
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 1 }}
                className="mb-6"
              >
                <h1 className="relative text-3xl xs:text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.12] tracking-tight break-words text-center lg:text-left lg:pl-[0.95em]">
                  <span
                    className="absolute left-0 top-[0.1em] hidden text-[0.68em] leading-none lg:block"
                    role="img"
                    aria-label="lightning"
                  >
                    ⚡
                  </span>
                  <span className="block text-white lg:pl-0">
                    <span className="mr-1 text-[0.68em] leading-none lg:hidden" aria-hidden>
                      ⚡
                    </span>
                    AI-powered MCP workflows,
                  </span>
                  <span className="block bg-gradient-to-r from-cyan-300 via-accent to-purple-400 bg-clip-text text-transparent">
                    Anki-ready flashcards.
                  </span>
                </h1>
              </motion.div>

              {/* Description */}
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7, duration: 0.8 }}
                className="text-base sm:text-lg text-white/60 leading-relaxed mb-8 sm:mb-10 max-w-2xl mx-auto lg:mx-0"
              >
                Create AI flashcards in bulk from notes, PDFs, and articles,
                then customize them in a beautiful, flexible interface with
                image and audio support. Automate your workflow with MCP and
                sync with Anki using APKG import/export.
              </motion.p>

              {/* Download buttons */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9, duration: 0.8 }}
                className="flex flex-col sm:flex-row gap-4 items-center justify-center lg:justify-start"
              >
                <GooglePlayDownloadButton />
                <AppStoreDownloadButton />
              </motion.div>

              {/* Trust strip */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.1, duration: 0.8 }}
                className="flex flex-wrap items-center justify-center lg:justify-start gap-x-4 gap-y-2 mt-5"
              >
                {["Free to download", "iOS & Android", "FSRS algorithm", "Anki APKG"].map((label, i) => (
                  <span key={i} className="flex items-center gap-1.5 text-xs text-white/35">
                    <span className="w-1 h-1 rounded-full bg-accent/60 inline-block" />
                    {label}
                  </span>
                ))}
              </motion.div>
            </div>

            {/* Right: App mockup */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6, duration: 1.2, ease: "easeOut" }}
              className="flex justify-center lg:justify-start flex-shrink-0"
            >
              <div className="relative">
                {/* Glow behind mockup */}
                <div className="absolute inset-0 bg-gradient-to-br from-accent/30 to-purple-600/30 rounded-3xl blur-3xl scale-110 opacity-60" />
                <Image
                  src="/mock/mock1.webp"
                  alt="Deckbase App Screenshot"
                  width={1500}
                  height={1125}
                  quality={100}
                  priority
                  className="relative rounded-3xl shadow-2xl w-full max-w-[240px] md:max-w-[300px] lg:max-w-[360px]"
                />
              </div>
            </motion.div>
          </div>

          {/* Key principles — horizontal cards */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1, duration: 0.8 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-4"
          >
            <div className="flex flex-col items-center text-center sm:flex-row sm:items-start sm:text-left gap-4 p-5 rounded-xl bg-white/[0.07] border border-white/[0.12] hover:bg-white/[0.10] hover:border-accent/40 transition-all duration-300 group">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-accent/25 flex items-center justify-center group-hover:bg-accent/35 transition-colors">
                <Brain className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h3 className="font-semibold text-white text-sm mb-1">AI-Powered Generation</h3>
                <p className="text-white/50 text-xs leading-relaxed">Turn source material into bulk AI flashcards in seconds with cleaner first drafts.</p>
              </div>
            </div>
            <div className="flex flex-col items-center text-center sm:flex-row sm:items-start sm:text-left gap-4 p-5 rounded-xl bg-white/[0.07] border border-white/[0.12] hover:bg-white/[0.10] hover:border-notion-yellow/40 transition-all duration-300 group">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-notion-yellow/15 flex items-center justify-center group-hover:bg-notion-yellow/25 transition-colors">
                <Clock className="w-5 h-5 text-notion-yellow" />
              </div>
              <div>
                <h3 className="font-semibold text-white text-sm mb-1">Spaced Repetition</h3>
                <p className="text-white/50 text-xs leading-relaxed">Review at the optimal time for efficient, consistent learning.</p>
              </div>
            </div>
            <div className="flex flex-col items-center text-center sm:flex-row sm:items-start sm:text-left gap-4 p-5 rounded-xl bg-white/[0.07] border border-white/[0.12] hover:bg-white/[0.10] hover:border-notion-purple/40 transition-all duration-300 group">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-notion-purple/15 flex items-center justify-center group-hover:bg-notion-purple/25 transition-colors">
                <Zap className="w-5 h-5 text-notion-purple" />
              </div>
              <div>
                <h3 className="font-semibold text-white text-sm mb-1">Beautiful Flexible Card UI</h3>
                <p className="text-white/50 text-xs leading-relaxed">Study in a clean, customizable interface with support for text, image, and audio-rich cards.</p>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* Philosophy Section */}
      <motion.section
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
        className="relative py-24 bg-black overflow-hidden"
      >
        {/* Section ambient glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-accent/10 rounded-full blur-[160px]" />
        </div>
        {/* Divider line */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

        <div className="relative z-20 max-w-4xl mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="inline-block mb-5 px-3 py-1 rounded-full border border-white/10 text-white/30 text-xs uppercase tracking-widest"
          >
            The Philosophy
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight"
          >
            <span className="text-white">Study with structure,</span>
            <br />
            <span className="bg-gradient-to-r from-accent to-purple-500 bg-clip-text text-transparent">
              automate with MCP.
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="text-lg text-white/55 leading-relaxed mb-16 max-w-2xl mx-auto"
          >
            Deckbase combines AI card generation, template-based editing, MCP automation, and Anki APKG import/export so your study workflow stays fast, flexible, and consistent.
          </motion.p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-center md:text-left">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4, duration: 0.8 }}
              className="p-8 rounded-2xl bg-white/[0.06] border border-white/[0.14]"
            >
              <div className="text-xs uppercase tracking-widest text-white/40 mb-3 font-medium">Before</div>
              <h3 className="text-xl font-semibold mb-3 text-white/75">Fragmented Study Workflow</h3>
              <p className="text-white/50 leading-relaxed text-sm">
                Your notes, files, and flashcards live in separate tools, so creating and organizing cards takes extra time and breaks focus.
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.6, duration: 0.8 }}
              className="p-8 rounded-2xl bg-gradient-to-br from-accent/10 to-purple-600/10 border border-accent/20"
            >
              <div className="text-xs uppercase tracking-widest text-accent/70 mb-3 font-medium">After</div>
              <h3 className="text-xl font-semibold mb-3 text-white">Connected Learning Workflow</h3>
              <p className="text-white/60 leading-relaxed text-sm">
                Deckbase unifies AI generation, template-based editing, MCP automation, and Anki APKG import/export in one streamlined study flow.
              </p>
            </motion.div>
          </div>
        </div>
      </motion.section>

      <HowItWorks />
      <AppFeatures />
      <UserTestimonials />
      <ProductHuntReviews />
      <Start />
      <Faqs />
    </>
  );
}

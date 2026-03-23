"use client";

import "./globals.css";
import { useEffect } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Sparkles, Brain, Clock, Zap } from "lucide-react";
import AppStoreDownloadButton from "@/components/AppStoreDownloadButton";
import GooglePlayDownloadButton from "@/components/GooglePlayDownloadButton";
import HowItWorks from "@/components/HowItWorks";
import AppFeatures from "@/components/AppFeatures";
import UserTestimonials from "@/components/UserTestimonials";
import Start from "@/components/Start";
import Faqs from "@/components/Faqs";

export default function Home() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <>
      {/* Hero Section */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
        className="relative min-h-screen bg-black pt-20 overflow-hidden"
      >
        {/* Ambient background glows */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent/20 rounded-full blur-[120px] opacity-60" />
          <div className="absolute top-1/3 right-1/3 w-80 h-80 bg-purple-600/15 rounded-full blur-[100px] opacity-50" />
          <div className="absolute bottom-1/3 left-1/2 w-64 h-64 bg-accent/10 rounded-full blur-[80px]" />
        </div>

        <div className="relative z-20 max-w-6xl mx-auto px-4 py-16 lg:py-24">
          {/* 2-column layout on desktop */}
          <div className="flex flex-col lg:flex-row gap-8 lg:gap-20 items-center mb-16">

            {/* Left: Text content */}
            <div>
              {/* Badge */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3, duration: 0.8 }}
                className="inline-flex items-center gap-2 mb-8 px-4 py-2 rounded-full bg-gradient-to-r from-accent/10 to-purple-600/10 backdrop-blur-md border border-accent/30 shadow-lg"
              >
                <Sparkles className="w-4 h-4 text-accent" />
                <span className="bg-gradient-to-r from-accent to-purple-600 bg-clip-text text-transparent font-medium text-sm">
                  AI-Powered Learning, Effortlessly
                </span>
              </motion.div>

              {/* Title */}
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 1 }}
                className="mb-6"
              >
                <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-tight">
                  <span className="block text-white">Scan. Build.</span>
                  <span className="bg-gradient-to-r from-accent via-blue-400 to-purple-500 bg-clip-text text-transparent">
                    Remember.
                  </span>
                </h1>
              </motion.div>

              {/* Description */}
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7, duration: 0.8 }}
                className="text-lg text-white/60 leading-relaxed mb-10 max-w-lg"
              >
                Transform anything you read into lasting knowledge. Deckbase uses AI to instantly convert articles, PDFs, and notes into smart flashcards—optimized for how your brain actually learns.
              </motion.p>

              {/* Download buttons */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9, duration: 0.8 }}
                className="flex flex-col sm:flex-row gap-4 items-start"
              >
                <GooglePlayDownloadButton />
                <AppStoreDownloadButton />
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
                  className="relative rounded-3xl shadow-2xl w-full max-w-[220px] md:max-w-[260px] lg:max-w-[300px]"
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
            <div className="flex items-start gap-4 p-5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/[0.08] hover:border-accent/30 transition-all duration-300 group">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center group-hover:bg-accent/30 transition-colors">
                <Brain className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h3 className="font-semibold text-white text-sm mb-1">AI-Powered Generation</h3>
                <p className="text-white/40 text-xs leading-relaxed">Extracts key ideas and formats cards for long-term memory retention.</p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/[0.08] hover:border-notion-yellow/30 transition-all duration-300 group">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-notion-yellow/10 flex items-center justify-center group-hover:bg-notion-yellow/20 transition-colors">
                <Clock className="w-5 h-5 text-notion-yellow" />
              </div>
              <div>
                <h3 className="font-semibold text-white text-sm mb-1">Spaced Repetition</h3>
                <p className="text-white/40 text-xs leading-relaxed">Review at the optimal time for efficient, consistent learning.</p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/[0.08] hover:border-notion-purple/30 transition-all duration-300 group">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-notion-purple/10 flex items-center justify-center group-hover:bg-notion-purple/20 transition-colors">
                <Zap className="w-5 h-5 text-notion-purple" />
              </div>
              <div>
                <h3 className="font-semibold text-white text-sm mb-1">Instant Capture</h3>
                <p className="text-white/40 text-xs leading-relaxed">From articles, PDFs, books, or notes—convert instantly to flashcards.</p>
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
        {/* Subtle divider glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-16 bg-gradient-to-b from-transparent to-white/10" />

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
            <span className="text-white">Read once,</span>
            <br />
            <span className="bg-gradient-to-r from-accent to-purple-500 bg-clip-text text-transparent">
              remember forever.
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="text-lg text-white/40 leading-relaxed mb-16 max-w-2xl mx-auto"
          >
            Most of what we read is forgotten within days. Deckbase changes that by turning passive reading into active learning. Instead of manually creating flashcards, our AI does the heavy lifting.
          </motion.p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-left">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4, duration: 0.8 }}
              className="p-8 rounded-2xl bg-white/[0.03] border border-white/10"
            >
              <div className="text-xs uppercase tracking-widest text-white/25 mb-3 font-medium">Before</div>
              <h3 className="text-xl font-semibold mb-3 text-white/60">Passive Reading</h3>
              <p className="text-white/35 leading-relaxed text-sm">
                You read articles, books, and PDFs but forget most of the content within a week. Information is consumed but never retained.
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
              <h3 className="text-xl font-semibold mb-3 text-white">Active Learning</h3>
              <p className="text-white/60 leading-relaxed text-sm">
                Deckbase captures key ideas, generates smart flashcards, and uses spaced repetition to ensure you actually remember what you learn.
              </p>
            </motion.div>
          </div>
        </div>
      </motion.section>

      <HowItWorks />
      <AppFeatures />
      <UserTestimonials />
      <Start />
      <Faqs />
    </>
  );
}

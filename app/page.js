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
        <div className="relative z-20 max-w-6xl mx-auto px-4 py-20">
          <div className="text-center mb-16">
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
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 1 }}
              className="relative mb-8"
            >
              <h1 className="relative text-5xl md:text-7xl lg:text-8xl font-bold mb-4 leading-tight">
                <span className="block mb-2 text-white">Scan. Build.</span>
                <span className="relative inline-block bg-gradient-to-r from-accent to-purple-600 bg-clip-text text-transparent">
                  Remember.
                </span>
              </h1>
            </motion.div>

            {/* Description card */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.8 }}
              className="relative max-w-4xl mx-auto mb-12"
            >
              <div className="relative bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-8 shadow-2xl">
                <p className="text-lg md:text-xl text-white/90 leading-relaxed">
                  Deckbase is an{" "}
                  <span className="text-accent font-semibold">
                    AI-powered flashcard platform
                  </span>{" "}
                  that helps you turn what you read into learning material
                  instantly. Capture text from articles, PDFs, books, or notes
                  and automatically convert it into well-structured flashcards
                  optimized for long-term memory.
                </p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9, duration: 0.8 }}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16"
            >
              <GooglePlayDownloadButton />
              <AppStoreDownloadButton />
            </motion.div>
          </div>

          {/* Key principles */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1, duration: 0.8 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20"
          >
            <div className="text-center p-6 rounded-lg bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/15 transition-all">
              <Brain className="w-10 h-10 text-accent mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">
                AI-Powered Generation
              </h3>
              <p className="text-white/80 text-sm">
                Our AI extracts key ideas, generates examples, and formats cards
                in a way that&apos;s optimized for long-term memory retention.
              </p>
            </div>
            <div className="text-center p-6 rounded-lg bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/15 transition-all">
              <Clock className="w-10 h-10 text-notion-red mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">
                Spaced Repetition
              </h3>
              <p className="text-white/80 text-sm">
                Cards are reviewed at the right time based on learning science,
                making studying more efficient and consistent.
              </p>
            </div>
            <div className="text-center p-6 rounded-lg bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/15 transition-all">
              <Zap className="w-10 h-10 text-notion-purple mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">
                Instant Capture
              </h3>
              <p className="text-white/80 text-sm">
                Capture text from anywhere—articles, PDFs, books, or notes—and
                instantly convert it into well-structured flashcards.
              </p>
            </div>
          </motion.div>

          {/* App visualization */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1.3, duration: 1 }}
            className="text-center max-w-sm mx-auto"
          >
            <div className="">
              <Image
                src="/mock/mock1.png"
                alt="Deckbase App Screenshot"
                width={1500}
                height={1125}
                quality={100}
                priority
                className="rounded-3xl shadow-2xl w-full"
              />
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
        className="relative py-20 bg-transparent"
      >
        <div className="relative z-20 max-w-4xl mx-auto px-4 text-center">
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-4xl md:text-5xl font-bold mb-8 text-white"
          >
            &quot;Read once, remember forever&quot;
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="text-xl text-gray-400 leading-relaxed mb-12"
          >
            Most of what we read is forgotten within days. Deckbase changes that
            by turning passive reading into active learning. Instead of manually
            creating flashcards, our AI does the heavy lifting—extracting key
            concepts and generating study material that sticks.
          </motion.p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4, duration: 0.8 }}
              className="p-6 bg-white/5 rounded-lg border border-white/10"
            >
              <h3 className="text-xl font-semibold mb-3 text-white">
                Before: Passive Reading
              </h3>
              <p className="text-gray-400">
                You read articles, books, and PDFs but forget most of the
                content within a week. Information is consumed but never
                retained.
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.6, duration: 0.8 }}
              className="p-6 bg-gradient-to-r from-accent/20 to-purple-600/20 rounded-lg border border-accent/30"
            >
              <h3 className="text-xl font-semibold mb-3 bg-gradient-to-r from-accent to-purple-600 bg-clip-text text-transparent">
                After: Active Learning
              </h3>
              <p className="text-white">
                Deckbase captures key ideas, generates smart flashcards, and
                uses spaced repetition to ensure you actually remember what you
                learn.
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

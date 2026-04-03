"use client";

import "../globals.css";
import { useEffect } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import AppStoreDownloadButton from "@/components/AppStoreDownloadButton";
import GooglePlayDownloadButton from "@/components/GooglePlayDownloadButton";

export default function DownloadPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
      className="relative min-h-screen bg-black pt-32 pb-20 overflow-hidden"
    >
      <div className="relative z-20 max-w-5xl mx-auto px-6 w-full">
        <div className="flex flex-col md:flex-row items-center gap-20 mb-16">
          <div className="flex-1">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.8 }}
              className="flex items-center gap-4 mb-4"
            >
              <Image
                src="/app_logo.webp"
                alt="Deckbase Logo"
                width={56}
                height={56}
                className="rounded-2xl"
              />
              <h1 className="text-4xl md:text-5xl font-bold text-white">
                Download Deckbase
              </h1>
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.8 }}
              className="text-lg text-gray-400 max-w-md mb-10"
            >
              Start turning what you read into lasting knowledge today.
              Available on iOS and Android.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.8 }}
              className="flex flex-row gap-6"
            >
              <div className="flex flex-col items-center gap-3">
                <Image
                  src="/qrcodes/qr-code-ios.svg"
                  alt="iOS App QR Code"
                  width={100}
                  height={100}
                  className="hidden sm:block rounded-xl"
                />
                <AppStoreDownloadButton />
              </div>

              <div className="flex flex-col items-center gap-3">
                <Image
                  src="/qrcodes/qr-code-android.svg"
                  alt="Android App QR Code"
                  width={100}
                  height={100}
                  className="hidden sm:block rounded-xl"
                />
                <GooglePlayDownloadButton />
              </div>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="hidden md:block"
          >
            <Image
              src="/mock/mock1.webp"
              alt="Deckbase App"
              width={280}
              height={560}
              className="w-auto h-auto max-w-[280px] rounded-3xl"
            />
          </motion.div>
        </div>

        <div className="max-w-3xl space-y-10">
          <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 sm:p-7">
            <h2 className="text-xl sm:text-2xl font-semibold text-white mb-3">
              Why learners download Deckbase
            </h2>
            <p className="text-sm sm:text-base text-gray-300 leading-relaxed mb-4">
              Deckbase is built for learners who want to turn reading into durable recall. Instead of
              manually typing every card, you can generate cards from notes, PDFs, and scans, then
              review with spaced repetition logic designed for long-term memory.
            </p>
            <p className="text-sm sm:text-base text-gray-300 leading-relaxed">
              The mobile workflow matters: most learners study in short windows throughout the day, so
              iOS and Android consistency is a core requirement. The app is designed so capture,
              cleanup, and daily review stay in one repeatable loop.
            </p>
          </section>

          <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              {
                title: "Capture",
                body: "Import study material from books, notes, and PDFs without rebuilding your workflow from scratch.",
              },
              {
                title: "Generate",
                body: "Create draft cards quickly, then refine prompts so each card supports one clear recall event.",
              },
              {
                title: "Retain",
                body: "Use spaced repetition to keep recall stable over weeks and months, not only for short cramming cycles.",
              },
            ].map((item) => (
              <article key={item.title} className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
                <h3 className="text-sm font-semibold text-white/85 mb-1.5">{item.title}</h3>
                <p className="text-[13px] text-gray-300/85 leading-relaxed">{item.body}</p>
              </article>
            ))}
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 sm:p-7">
            <h2 className="text-xl sm:text-2xl font-semibold text-white mb-4">Download FAQ</h2>
            <div className="space-y-4">
              {[
                {
                  q: "Is Deckbase free to start?",
                  a: "Yes. You can start with the free tier and upgrade later if you need advanced workflows and higher-volume automation.",
                },
                {
                  q: "Can I use Deckbase on both iOS and Android?",
                  a: "Yes. Deckbase supports both platforms so your review workflow stays consistent across devices.",
                },
                {
                  q: "Who is Deckbase best for?",
                  a: "Deckbase fits learners who rely on repeatable recall over time: exam prep, language learning, and professional certification tracks.",
                },
              ].map((item) => (
                <div key={item.q} className="rounded-lg border border-white/[0.08] bg-black/30 p-4">
                  <h3 className="text-sm font-semibold text-white/90 mb-1.5">{item.q}</h3>
                  <p className="text-[13px] text-gray-300 leading-relaxed">{item.a}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 sm:p-7">
            <h2 className="text-xl sm:text-2xl font-semibold text-white mb-3">
              Before you download: setup tips that save time
            </h2>
            <p className="text-sm sm:text-base text-gray-300 leading-relaxed mb-3">
              The fastest way to get value is starting with one active study topic instead of importing
              everything at once. Create a small initial deck, run daily reviews for one week, then
              expand gradually once your workflow feels stable.
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-[13px] sm:text-sm text-gray-300/90 leading-relaxed">
              <li>Pick one current subject and keep your first deck under 150 cards.</li>
              <li>Prioritize clear prompts over large card volume in week one.</li>
              <li>Use short daily sessions so review consistency becomes automatic.</li>
            </ul>
            <p className="text-[13px] sm:text-sm text-gray-300/85 leading-relaxed mt-3">
              Once your first week is stable, add one new topic at a time and keep monitoring review
              completion. This staged approach usually produces better long-term retention than trying
              to migrate every study source on day one.
            </p>
            <p className="text-[13px] sm:text-sm text-gray-300/85 leading-relaxed mt-2">
              If you are moving from another flashcard app, keep your previous deck export until your
              new daily review loop is stable for at least two weeks.
            </p>
          </section>
        </div>
      </div>
    </motion.section>
  );
}

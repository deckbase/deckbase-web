"use client";

import "../globals.css";
import { useEffect } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { RiSecurePaymentFill } from "react-icons/ri";
import { MdOutlineWifiFind } from "react-icons/md";
import { TbClockRecord } from "react-icons/tb";
import OurStory from "@/components/OurStory";
import Legacy from "@/components/Legacy";
import Testimonial from "@/components/Testimonial";
import FaqsWhite from "@/components/FaqsWhite";
import CoreValues from "@/components/CoreValue";
import AppStoreDownloadButton from "@/components/AppStoreDownloadButton";
import GooglePlayDownloadButton from "@/components/GooglePlayDownloadButton";

const values = [
  {
    id: 1,
    title: "Learning Made Effortless",
    desc: "We believe learning should work with your brain, not against it. Deckbase uses AI to eliminate the friction of creating study materials, so you can focus on what matters—actually learning.",
    icon: <RiSecurePaymentFill className="w-6 h-6 text-white" />,
  },
  {
    id: 2,
    title: "Science-Backed Methods",
    desc: "Spaced repetition is proven to dramatically improve retention. Our algorithms schedule reviews at optimal intervals based on your performance, ensuring you remember what you learn.",
    icon: <MdOutlineWifiFind className="w-6 h-6 text-white" />,
  },
  {
    id: 3,
    title: "Privacy-First Approach",
    desc: "Your learning data and personal information are yours alone. Deckbase keeps your study materials secure and private, with optional cloud sync for convenience.",
    icon: <TbClockRecord className="w-6 h-6 text-white" />,
  },
];
export default function About() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <>
      <motion.article
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0, transition: { duration: 0.8 } }}
        viewport={{ once: true }}
        className="relative z-10 pt-24 flex bg-transparent min-h-[100vh] flex-col items-center justify-items-center overflow-x-hidden"
      >
        <section className="w-full px-5 md:px-[5%] 2xl:px-0 max-w-5xl mx-auto flex flex-col items-center justify-center gap-8">
          <article className="relative w-full py-4 mx-auto flex flex-col items-center justify-center">
            <motion.h1
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="text-white text-h2 md:max-w-[70%] lg:mt-12 font-bold text-center"
            >
              Helping You Remember Everything You Learn
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, scale: 1.25 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.8, duration: 0.5 }}
              className="my-4 mb-6 text-white w-[80%] md:w-[60%] md:leading-8 text-center"
            >
              We believe that reading without retention is wasted time. Deckbase
              uses AI and spaced repetition to turn what you read into lasting
              knowledge that stays with you forever.
            </motion.p>

            <div className="mt-8 flex space-x-4">
              <div className="flex flex-col md:flex-row gap-4">
                <GooglePlayDownloadButton />
                <AppStoreDownloadButton />
              </div>
            </div>

            {/* App visualization */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1, duration: 1 }}
              className="mt-16 text-center max-w-sm mx-auto"
            >
              <Image
                src="/mock/mock1.png"
                alt="Deckbase App Screenshot"
                width={1500}
                height={1125}
                quality={100}
                priority
                className="rounded-3xl shadow-2xl w-full"
              />
            </motion.div>
          </article>
        </section>
      </motion.article>

      <motion.article className="relative z-10 bg-white overflow-hidden">
        <article className="container mx-auto py-20 pb-32 p-4 px-5 md:px-[5%] 2xl:px-0 max-w-[1200px] flex flex-col items-center justify-center gap-12">
          <div className="flex flex-col items-center pt-8">
            <h2 className="text-h2 lg:text-h3 font-bold text-center">
              Our Mission: Help People Learn Smarter, Not Harder
            </h2>
            <span className="w-16 h-1 mt-3 bg-gradient-to-r from-accent to-purple-600 rounded-full" />
          </div>
          <div className=" text-left w-full max-w-3xl mt-8 space-y-10">
            <div>
              <h3 className="text-xl font-bold">🧠 AI-Powered Learning</h3>
              <p>
                Stop spending hours creating flashcards manually. Our AI
                understands context, extracts key concepts, and generates
                well-structured cards that focus on what matters most.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-bold">
                ⏰ Spaced Repetition Science
              </h3>
              <p>
                Our algorithm schedules reviews at the optimal moment—right
                before you&apos;re about to forget. This scientifically proven
                method dramatically improves long-term retention.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-bold">📚 Learn From Anything</h3>
              <p>
                Whether it&apos;s articles, textbooks, PDFs, or your own notes,
                Deckbase turns any text into study material. Capture knowledge
                from everywhere and consolidate it in one place.
              </p>
              <p className="mt-2 font-semibold">
                Because knowledge that isn&apos;t remembered is knowledge lost.
              </p>
            </div>
          </div>

          <article className="grid grid-cols-1 items-start justify-center lg:grid-cols-3 gap-4 mt-10 lg:pb-0 px-6 pb-10 lg:rounded-2xl text-black lg:shadow-xl lg:w-full">
            {values.map((hook) => (
              <motion.div
                initial={{ opacity: 0, y: 100 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.2 }}
                viewport={{ once: true }}
                key={hook.id}
                className="rounded-3xl border min-h-[290px] lg:rounded-none lg:border-none flex flex-col items-center gap-5 w-full max-w-[480px] mx-auto lg:max-w-none p-4 pb-8"
              >
                <div className="rounded-full bg-gradient-to-r from-accent to-purple-600 w-14 h-14 flex justify-center items-center flex-shrink-0">
                  {hook.icon}
                </div>
                <h4 className="font-bold text-center bg-gradient-to-r from-accent to-purple-600 bg-clip-text text-transparent">
                  {hook.title}
                </h4>
                <p className="text-center lg:text-base text-black lg:max-w-80">
                  {hook.desc}
                </p>
              </motion.div>
            ))}
          </article>
        </article>
      </motion.article>
      <OurStory />
      <CoreValues />
      <Legacy />
      <Testimonial />
      <FaqsWhite />
    </>
  );
}

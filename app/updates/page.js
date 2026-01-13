"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import Button from "@/components/Button";

const Updates = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <motion.section
      initial={{ opacity: 0, x: "-100%" }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: "100%" }}
      transition={{ delay: 0.5 }}
      className="min-h-screen ex-col justify-center"
    >
      <h2 className="text-h2 bg-bg pt-36 pb-20 lg:text-h3 text-white w-full text-center mb-14">
        What&apos;s New
      </h2>
      <div className="mx-auto px-5 md:px-[5%] 2xl:px-0 pb-20 container max-w-[1200px]">
        <article className="flex items-center justify-center flex-col gap-12">
          <h3 className="font-extrabold text-h3 text-white text-center">
            Coming Soon: AI-Powered Flashcards
          </h3>
          <p className="text-white/80 text-center max-w-2xl">
            We&apos;re building the future of learning. Sign up to be notified
            when Deckbase launches with AI-powered flashcard generation and
            spaced repetition.
          </p>
          <Button text="Join the Waitlist" />
        </article>
      </div>
    </motion.section>
  );
};

export default Updates;

"use client";
import { motion } from "framer-motion";

import GooglePlayDownloadButton from "./GooglePlayDownloadButton";
import AppStoreDownloadButton from "./AppStoreDownloadButton";

const Start = () => {
  return (
    <motion.section
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8 }}
      className="relative w-full bg-black text-white overflow-hidden"
    >
      {/* Background glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-accent/20 rounded-full blur-[100px] opacity-60" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[200px] bg-purple-600/15 rounded-full blur-[80px]" />
      </div>

      <article className="relative z-20 container mx-auto py-20 px-5 md:px-[5%] 2xl:px-0 max-w-[1200px] flex flex-col md:flex-row items-center justify-between gap-12">
        <div className="flex flex-col gap-6 items-center md:items-start justify-center max-w-xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="inline-block px-3 py-1 rounded-full border border-white/10 text-white/30 text-xs uppercase tracking-widest"
          >
            Get started
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="text-h3 lg:text-h4 font-bold text-center md:text-left leading-tight"
          >
            <span className="bg-gradient-to-r from-accent to-purple-500 bg-clip-text text-transparent">
              Automate with MCP and move seamlessly with Anki APKG import/export.
            </span>
          </motion.h2>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4"
          >
            <GooglePlayDownloadButton />
            <AppStoreDownloadButton />
          </motion.div>
        </div>

        <motion.img
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1, delay: 0.2 }}
          src="/mock/mock5.webp"
          alt="Deckbase App"
          className="w-auto h-auto max-w-[240px] md:max-w-[300px] drop-shadow-2xl"
        />
      </article>
    </motion.section>
  );
};

export default Start;

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
      className="relative min-h-screen bg-black pt-32 pb-20 overflow-hidden flex items-center"
    >
      <div className="relative z-20 max-w-5xl mx-auto px-6 w-full">
        <div className="flex flex-col md:flex-row items-center gap-20">
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
      </div>
    </motion.section>
  );
}

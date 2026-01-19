"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import {
  Smartphone,
  Tablet,
  Monitor,
  Sparkles,
  Zap,
  Shield,
  Cloud,
} from "lucide-react";
import AppStoreDownloadButton from "@/components/AppStoreDownloadButton";
import GooglePlayDownloadButton from "@/components/GooglePlayDownloadButton";

export default function DownloadPage() {
  const features = [
    {
      icon: <Sparkles className="w-6 h-6" />,
      title: "AI-Powered Scanning",
      description:
        "Scan any book or document and instantly create flashcards with AI",
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: "Spaced Repetition",
      description:
        "Our smart algorithm helps you remember more with less effort",
    },
    {
      icon: <Cloud className="w-6 h-6" />,
      title: "Sync Everywhere",
      description: "Access your decks on any device, anytime, anywhere",
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: "Offline Mode",
      description: "Study without internet connection when you need it most",
    },
  ];

  const platforms = [
    {
      icon: <Smartphone className="w-8 h-8" />,
      name: "iPhone",
      description: "iOS 15.0 or later",
    },
    {
      icon: <Smartphone className="w-8 h-8" />,
      name: "Android",
      description: "Android 8.0 or later",
    },
    {
      icon: <Tablet className="w-8 h-8" />,
      name: "iPad",
      description: "iPadOS 15.0 or later",
    },
    {
      icon: <Monitor className="w-8 h-8" />,
      name: "Web App",
      description: "Any modern browser",
    },
  ];

  return (
    <div className="min-h-screen bg-black pt-24 pb-16">
      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 text-accent mb-6">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-medium">Available Now</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6">
            Download Deckbase
          </h1>

          <p className="text-xl text-white/60 max-w-2xl mx-auto mb-10">
            Start turning what you read into lasting knowledge. Available on
            iOS, Android, and web.
          </p>

          {/* Download Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <AppStoreDownloadButton />
            <GooglePlayDownloadButton />
          </div>
        </motion.div>
      </section>

      {/* Features Grid */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl font-bold text-white text-center mb-4">
            Why Deckbase?
          </h2>
          <p className="text-white/60 text-center max-w-xl mx-auto mb-12">
            Everything you need to transform your learning experience
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="p-6 bg-white/5 border border-white/10 rounded-2xl hover:border-accent/30 transition-colors"
              >
                <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center text-accent mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-white/60 text-sm">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Platform Support */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl font-bold text-white text-center mb-4">
            Available on All Platforms
          </h2>
          <p className="text-white/60 text-center max-w-xl mx-auto mb-12">
            Study seamlessly across all your devices
          </p>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {platforms.map((platform, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="p-6 bg-white/5 border border-white/10 rounded-2xl text-center hover:border-white/20 transition-colors"
              >
                <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center text-white mx-auto mb-4">
                  {platform.icon}
                </div>
                <h3 className="text-lg font-semibold text-white mb-1">
                  {platform.name}
                </h3>
                <p className="text-white/40 text-sm">{platform.description}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* QR Code Section */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="bg-gradient-to-br from-accent/20 to-purple-500/10 border border-accent/20 rounded-3xl p-8 md:p-12 text-center"
        >
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
            Scan to Download
          </h2>
          <p className="text-white/60 max-w-md mx-auto mb-8">
            Point your phone camera at the QR code to download Deckbase
            instantly
          </p>

          <div className="inline-block p-4 bg-white rounded-2xl">
            <div className="w-40 h-40 bg-gray-100 flex items-center justify-center">
              {/* QR Code placeholder - replace with actual QR code image */}
              <div className="text-gray-400 text-xs text-center">
                QR Code
                <br />
                Coming Soon
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
            <AppStoreDownloadButton />
            <GooglePlayDownloadButton />
          </div>
        </motion.div>
      </section>

      {/* CTA Section */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Start Learning?
          </h2>
          <p className="text-white/60 max-w-md mx-auto mb-8">
            Join thousands of learners already using Deckbase to remember more
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/dashboard"
              className="px-8 py-3 bg-accent hover:bg-accent/90 text-white font-medium rounded-lg transition-colors"
            >
              Try Web App
            </Link>
            <Link
              href="/features"
              className="px-8 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium rounded-lg transition-colors"
            >
              Learn More
            </Link>
          </div>
        </motion.div>
      </section>
    </div>
  );
}

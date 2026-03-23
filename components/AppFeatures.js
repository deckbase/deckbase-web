"use client";
import { motion } from "framer-motion";
import {
  Sparkles,
  Clock,
  BookOpen,
  BarChart3,
  Share2,
  Brain,
} from "lucide-react";
import AppStoreDownloadButton from "./AppStoreDownloadButton";
import GooglePlayDownloadButton from "./GooglePlayDownloadButton";

const features = [
  {
    icon: <Sparkles className="w-6 h-6" />,
    title: "AI-Powered Generation",
    description:
      "Our AI analyzes your content, extracts key concepts, and creates well-structured flashcards automatically—no manual work needed.",
    iconBg: "bg-accent/15",
    iconColor: "text-accent",
    borderHover: "hover:border-accent/30",
  },
  {
    icon: <Clock className="w-6 h-6" />,
    title: "Spaced Repetition",
    description:
      "Cards are reviewed at scientifically optimal intervals, ensuring you review right before you forget for maximum retention.",
    iconBg: "bg-notion-yellow/10",
    iconColor: "text-notion-yellow",
    borderHover: "hover:border-notion-yellow/30",
  },
  {
    icon: <BookOpen className="w-6 h-6" />,
    title: "Multi-Source Capture",
    description:
      "Import content from articles, PDFs, books, web pages, or your own notes. Deckbase works with any text source.",
    iconBg: "bg-notion-green/10",
    iconColor: "text-notion-green",
    borderHover: "hover:border-notion-green/30",
  },
  {
    icon: <Brain className="w-6 h-6" />,
    title: "Smart Formatting",
    description:
      "AI generates examples, context, and explanations—creating cards optimized for how your brain actually learns.",
    iconBg: "bg-notion-purple/10",
    iconColor: "text-notion-purple",
    borderHover: "hover:border-notion-purple/30",
  },
  {
    icon: <BarChart3 className="w-6 h-6" />,
    title: "Learning Analytics",
    description:
      "Track your progress with detailed insights. See mastery levels, review streaks, and areas that need more attention.",
    iconBg: "bg-notion-red/10",
    iconColor: "text-notion-red",
    borderHover: "hover:border-notion-red/30",
  },
  {
    icon: <Share2 className="w-6 h-6" />,
    title: "Deck Sharing",
    description:
      "Share your decks with friends, classmates, or the community. Learn together and benefit from crowd-sourced knowledge.",
    iconBg: "bg-notion-pink/10",
    iconColor: "text-notion-pink",
    borderHover: "hover:border-notion-pink/30",
  },
];

const AppFeatures = () => {
  return (
    <section className="relative w-full bg-black py-24 overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px]" />
        <div className="absolute top-1/3 left-1/4 w-64 h-64 bg-accent/10 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-20 container mx-auto px-5 md:px-[5%] 2xl:px-0 max-w-[1200px]">
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="inline-block mb-5 px-3 py-1 rounded-full border border-white/10 text-white/30 text-xs uppercase tracking-widest"
          >
            What you get
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-h2 lg:text-h1 font-bold mb-4 text-white"
          >
            Features That Make<br />Learning Effortless
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="text-lg text-white/40 max-w-2xl mx-auto"
          >
            Discover how Deckbase transforms passive reading into active
            learning with AI-powered flashcards and scientifically proven study methods.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.08 }}
              className={`group bg-white/[0.04] p-6 rounded-2xl border border-white/10 ${feature.borderHover} hover:bg-white/[0.07] transition-all duration-300`}
            >
              <div className={`mb-4 w-11 h-11 rounded-xl ${feature.iconBg} flex items-center justify-center ${feature.iconColor} transition-transform group-hover:scale-110 duration-300`}>
                {feature.icon}
              </div>
              <h3 className="text-base font-semibold text-white mb-2">
                {feature.title}
              </h3>
              <p className="text-white/40 text-sm leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-center mt-16"
        >
          <div className="bg-gradient-to-br from-accent/10 to-purple-600/10 border border-white/10 p-10 rounded-2xl">
            <h3 className="text-2xl font-bold mb-3 text-white">
              Ready to Remember Everything You Read?
            </h3>
            <p className="text-white/40 mb-8 max-w-xl mx-auto text-sm leading-relaxed">
              Join thousands who are using Deckbase to turn their reading into
              lasting knowledge with AI-powered flashcards and spaced repetition.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <AppStoreDownloadButton />
              <GooglePlayDownloadButton />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default AppFeatures;

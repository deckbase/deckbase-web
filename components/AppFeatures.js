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
    icon: <Sparkles className="w-8 h-8" />,
    title: "AI-Powered Generation",
    description:
      "Our AI analyzes your content, extracts key concepts, and creates well-structured flashcards automatically—no manual work needed.",
  },
  {
    icon: <Clock className="w-8 h-8" />,
    title: "Spaced Repetition",
    description:
      "Cards are reviewed at scientifically optimal intervals, ensuring you review right before you forget for maximum retention.",
  },
  {
    icon: <BookOpen className="w-8 h-8" />,
    title: "Multi-Source Capture",
    description:
      "Import content from articles, PDFs, books, web pages, or your own notes. Deckbase works with any text source.",
  },
  {
    icon: <Brain className="w-8 h-8" />,
    title: "Smart Formatting",
    description:
      "AI generates examples, context, and explanations—creating cards optimized for how your brain actually learns.",
  },
  {
    icon: <BarChart3 className="w-8 h-8" />,
    title: "Learning Analytics",
    description:
      "Track your progress with detailed insights. See mastery levels, review streaks, and areas that need more attention.",
  },
  {
    icon: <Share2 className="w-8 h-8" />,
    title: "Deck Sharing",
    description:
      "Share your decks with friends, classmates, or the community. Learn together and benefit from crowd-sourced knowledge.",
  },
];

const AppFeatures = () => {
  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { duration: 0.8 } }}
      className="relative w-full bg-transparent py-16 overflow-hidden"
    >
      <div className="relative z-20 container mx-auto p-4 px-5 md:px-[5%] 2xl:px-0 max-w-[1200px]">
        <div className="text-center mb-12">
          <motion.h2
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0, transition: { duration: 0.8 } }}
            viewport={{ once: true }}
            className="text-h2 lg:text-h1 font-bold mb-4 text-white"
          >
            Features That Make Learning Effortless
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            whileInView={{
              opacity: 1,
              y: 0,
              transition: { duration: 0.8, delay: 0.2 },
            }}
            viewport={{ once: true }}
            className="text-lg text-gray-400 max-w-2xl mx-auto"
          >
            Discover how Deckbase transforms passive reading into active
            learning with AI-powered flashcards and scientifically proven study
            methods.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{
                opacity: 1,
                y: 0,
                transition: { duration: 0.6, delay: index * 0.1 },
              }}
              viewport={{ once: true }}
              className="bg-white p-6 rounded-lg shadow-sm border border-border hover:shadow-md transition-shadow duration-300"
            >
              <div className="mb-4 w-12 h-12 rounded-lg bg-gradient-to-r from-accent to-purple-600 flex items-center justify-center text-white">
                {feature.icon}
              </div>
              <h3 className="text-lg font-semibold text-primary mb-2">
                {feature.title}
              </h3>
              <p className="text-secondary text-sm leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{
            opacity: 1,
            y: 0,
            transition: { duration: 0.8, delay: 0.5 },
          }}
          viewport={{ once: true }}
          className="text-center mt-12"
        >
          <div className="bg-white/5 border border-white/10 p-8 rounded-lg">
            <h3 className="text-2xl font-bold mb-4 text-white">
              Ready to Remember Everything You Read?
            </h3>
            <p className="text-gray-400 mb-6 max-w-2xl mx-auto">
              Join thousands who are using Deckbase to turn their reading into
              lasting knowledge with AI-powered flashcards and spaced
              repetition.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <AppStoreDownloadButton />
              <GooglePlayDownloadButton />
            </div>
          </div>
        </motion.div>
      </div>
    </motion.section>
  );
};

export default AppFeatures;

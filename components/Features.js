"use client";
import { motion } from "framer-motion";
import { Sparkles, Brain, Layers, LayoutGrid, BarChart3, Users } from "lucide-react";

const features = [
  {
    id: "01",
    icon: Sparkles,
    title: "AI-Powered Card Generation",
    gradient: "from-blue-500/20 to-cyan-500/10",
    iconColor: "text-blue-400",
    iconBg: "bg-blue-500/10 border-blue-500/20",
    desc: [
      "Capture any text and let AI instantly create well-structured flashcards.",
      "Our AI extracts key concepts, generates examples, and formats cards for optimal learning.",
      "Edit and customize generated cards to match your personal study style.",
    ],
  },
  {
    id: "02",
    icon: Brain,
    title: "Spaced Repetition System",
    gradient: "from-violet-500/20 to-purple-500/10",
    iconColor: "text-violet-400",
    iconBg: "bg-violet-500/10 border-violet-500/20",
    desc: [
      "Review cards at scientifically optimal intervals for maximum retention.",
      "Algorithm adapts to your performance, showing difficult cards more often.",
      "Never waste time reviewing what you already know—focus on what needs work.",
    ],
  },
  {
    id: "03",
    icon: Layers,
    title: "Multi-Source Import",
    gradient: "from-emerald-500/20 to-teal-500/10",
    iconColor: "text-emerald-400",
    iconBg: "bg-emerald-500/10 border-emerald-500/20",
    desc: [
      "Import content from PDFs, web articles, ebooks, and handwritten notes.",
      "Use share extension to capture content directly from any app.",
      "Scan physical books and documents using your device camera.",
    ],
  },
  {
    id: "04",
    icon: LayoutGrid,
    title: "Smart Organization",
    gradient: "from-amber-500/20 to-orange-500/10",
    iconColor: "text-amber-400",
    iconBg: "bg-amber-500/10 border-amber-500/20",
    desc: [
      "Organize cards into decks and folders by subject, course, or topic.",
      "Tag cards for cross-referencing and create smart filtered views.",
      "Search across all your cards to quickly find what you need.",
    ],
  },
  {
    id: "05",
    icon: BarChart3,
    title: "Learning Analytics",
    gradient: "from-rose-500/20 to-pink-500/10",
    iconColor: "text-rose-400",
    iconBg: "bg-rose-500/10 border-rose-500/20",
    desc: [
      "Track your progress with detailed insights and performance metrics.",
      "See mastery levels, review streaks, and time spent studying.",
      "Identify weak areas and get recommendations for improvement.",
    ],
  },
  {
    id: "06",
    icon: Users,
    title: "Share & Collaborate",
    gradient: "from-sky-500/20 to-indigo-500/10",
    iconColor: "text-sky-400",
    iconBg: "bg-sky-500/10 border-sky-500/20",
    desc: [
      "Share decks with friends, classmates, or study groups instantly.",
      "Browse and import community-created decks for popular subjects.",
      "Collaborate on shared decks with real-time sync across devices.",
    ],
  },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] } },
};

const Feature = () => {
  return (
    <section className="relative w-full text-white overflow-hidden">
      {/* Subtle ambient glow */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full bg-accent/5 blur-[120px]" />
      </div>

      <div className="mx-auto py-24 px-5 md:px-[5%] max-w-[1200px]">
        {/* Header */}
        <motion.div
          className="flex flex-col items-center text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold tracking-widest uppercase text-accent border border-accent/25 bg-accent/[0.07] mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            What's inside
          </span>

          <h2 className="text-h2 lg:text-h3 font-bold tracking-tight leading-tight max-w-[720px]">
            Everything you need to{" "}
            <span className="bg-gradient-to-r from-accent via-blue-400 to-violet-400 bg-clip-text text-transparent">
              learn faster
            </span>
          </h2>

          <p className="mt-5 text-white/50 text-base md:text-lg max-w-[540px] leading-relaxed">
            Deckbase turns any text into effective flashcards with AI, then helps
            you retain it with spaced repetition — all with minimal effort.
          </p>
        </motion.div>

        {/* Feature Grid */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
        >
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.id}
                variants={cardVariants}
                className={`group relative flex flex-col gap-4 p-6 rounded-2xl border border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.12] transition-all duration-300 overflow-hidden`}
              >
                {/* Gradient bleed on hover */}
                <div
                  className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl`}
                />

                {/* Icon + number row */}
                <div className="relative flex items-center justify-between">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-xl border ${feature.iconBg}`}>
                    <Icon className={`w-5 h-5 ${feature.iconColor}`} strokeWidth={1.75} />
                  </div>
                  <span className="text-[11px] font-bold tracking-[0.15em] text-white/20">
                    {feature.id}
                  </span>
                </div>

                {/* Content */}
                <div className="relative flex flex-col gap-3">
                  <h3 className="text-[15px] font-semibold text-white leading-snug">
                    {feature.title}
                  </h3>
                  <ul className="flex flex-col gap-2">
                    {feature.desc.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-[13px] text-white/50 leading-relaxed">
                        <span className={`mt-[5px] w-1 h-1 rounded-full flex-shrink-0 ${feature.iconColor} opacity-60`} />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
};

export default Feature;

"use client";
import { motion } from "framer-motion";
import { Sparkles, Brain, Layers, LayoutGrid, ImageIcon, Workflow } from "lucide-react";

const features = [
  {
    id: "01",
    icon: Sparkles,
    title: "AI Card Creation",
    gradient: "from-blue-500/20 to-cyan-500/10",
    iconColor: "text-blue-400",
    iconBg: "bg-blue-500/10 border-blue-500/20",
    desc: [
      "Generate cards from text, images, PDFs, and imported rows.",
      "Use AI suggestions to speed up card writing instead of starting from blank templates.",
      "Edit every card after generation so final content stays accurate.",
    ],
  },
  {
    id: "02",
    icon: Brain,
    title: "Spaced Repetition That Sticks",
    gradient: "from-violet-500/20 to-purple-500/10",
    iconColor: "text-violet-400",
    iconBg: "bg-violet-500/10 border-violet-500/20",
    desc: [
      "Study with adaptive scheduling designed for long-term retention.",
      "Reviews focus more on weak cards and less on cards you already know.",
      "Deckbase is built for daily review habits, not one-time cramming.",
    ],
  },
  {
    id: "03",
    icon: Layers,
    title: "Import From Real Study Files",
    gradient: "from-emerald-500/20 to-teal-500/10",
    iconColor: "text-emerald-400",
    iconBg: "bg-emerald-500/10 border-emerald-500/20",
    desc: [
      "Import CSV, Excel (.xls/.xlsx), and Anki (.apkg) into your decks.",
      "Map columns to template blocks before import so cards stay structured.",
      "Bring existing study material into one place without rebuilding from scratch.",
    ],
  },
  {
    id: "04",
    icon: LayoutGrid,
    title: "Template-Based Card Structure",
    gradient: "from-amber-500/20 to-orange-500/10",
    iconColor: "text-amber-400",
    iconBg: "bg-amber-500/10 border-amber-500/20",
    desc: [
      "Create reusable templates with text, hidden text, image, audio, and quiz blocks.",
      "Choose front/back rendering by template so reviews stay consistent.",
      "Keep deck-level organization clean with clear card previews and block labels.",
    ],
  },
  {
    id: "05",
    icon: ImageIcon,
    title: "Beautiful Flexible Card UI",
    gradient: "from-rose-500/20 to-pink-500/10",
    iconColor: "text-rose-400",
    iconBg: "bg-rose-500/10 border-rose-500/20",
    desc: [
      "Study in a clean, modern interface designed for focused review sessions.",
      "Use text, image, and audio-ready blocks in the same card experience.",
      "Customize card structure with templates while keeping layouts consistent.",
    ],
  },
  {
    id: "06",
    icon: Workflow,
    title: "⚡ MCP + API For Power Users",
    gradient: "from-sky-500/20 to-indigo-500/10",
    iconColor: "text-sky-400",
    iconBg: "bg-sky-500/10 border-sky-500/20",
    desc: [
      "Connect AI tools through Deckbase MCP to list decks and create cards.",
      "Use API keys to automate repeatable study content workflows.",
      "Keep generated cards aligned with your template schema.",
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
            Feature overview
          </span>

          <h1 className="text-h2 lg:text-h3 font-bold tracking-tight leading-tight max-w-[720px]">
            Your New Learning System for{" "}
            <span className="bg-gradient-to-r from-accent via-blue-400 to-violet-400 bg-clip-text text-transparent">
              the AI era
            </span>
          </h1>

          <p className="mt-5 text-white/50 text-base md:text-lg max-w-[540px] leading-relaxed">
            Deckbase helps you go from source material to review-ready cards:
            generate with AI, design with flexible templates, support image/audio
            content, automate with MCP, and move smoothly with Anki APKG
            import/export.
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

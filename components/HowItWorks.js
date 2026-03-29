"use client";
import { motion } from "framer-motion";

const steps = [
  {
    number: "01",
    title: "Import Your Learning Content",
    description:
      "Bring in notes, articles, table files (CSV/XLSX), files like PDF/DOCX/images, and Anki APKG imports from the material you already study.",
    accent: "from-accent to-cyan-400",
    dot: "bg-accent",
  },
  {
    number: "02",
    title: "Use App or MCP Workflow",
    description:
      "Create cards directly in the app or through Deckbase MCP integrations, then target the right deck and template.",
    accent: "from-cyan-400 to-purple-500",
    dot: "bg-cyan-400",
  },
  {
    number: "03",
    title: "Generate Cards with AI",
    description:
      "Deckbase AI maps extracted content into your template fields and creates study-ready flashcards in seconds.",
    accent: "from-purple-500 to-accent",
    dot: "bg-purple-500",
  },
  {
    number: "04",
    title: "Review and Add to Deck",
    description:
      "Preview and edit cards in a flexible interface, including text, image, and audio-ready content, then add selected cards to your deck.",
    accent: "from-accent to-purple-500",
    dot: "bg-accent",
  },
  {
    number: "05",
    title: "Study with Spaced Repetition",
    description:
      "Practice at the right time using proven spaced repetition so concepts move from short-term memory to long-term retention.",
    accent: "from-purple-500 to-cyan-400",
    dot: "bg-purple-500",
  },
];

const HowItWorks = () => {
  return (
    <section className="relative z-10 w-full bg-white overflow-hidden">
      <div className="container mx-auto py-24 px-5 md:px-[5%] 2xl:px-0 max-w-[1400px]">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <p className="text-xs uppercase tracking-widest text-secondary mb-3 font-medium">
            The process
          </p>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 text-primary">
            How Deckbase Works
          </h2>
          <p className="text-secondary text-lg max-w-2xl mx-auto">
            From notes, table files, or MCP workflows to retention-focused
            review in five clear steps
          </p>
        </motion.div>

        {/* Main content grid */}
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">

          {/* Left: Phone mockup */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="flex justify-center"
          >
            <div className="relative">
              {/* Glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-accent/20 to-purple-600/15 rounded-[40px] blur-3xl scale-110" />
              {/* Decorative ring */}
              <div className="absolute -inset-3 rounded-[38px] border border-accent/10" />
              <img
                src="/mock/mock1.webp"
                alt="Deckbase app preview"
                className="relative w-full max-w-[240px] lg:max-w-[320px] h-auto drop-shadow-2xl rounded-[32px] object-cover"
              />
            </div>
          </motion.div>

          {/* Right: Steps */}
          <div className="space-y-2">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: 40 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.09 }}
                className="group relative"
              >
                {/* Connector line */}
                {index < steps.length - 1 && (
                  <div className="absolute left-[1.1rem] top-[3.25rem] w-px h-4 bg-border" />
                )}

                <div className="flex gap-4 p-4 rounded-xl border border-border hover:border-accent/25 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group bg-white">
                  {/* Number badge */}
                  <div className="flex-shrink-0">
                    <div
                      className={`w-8 h-8 rounded-full bg-gradient-to-br ${step.accent} flex items-center justify-center text-white font-bold text-[11px] shadow-sm group-hover:scale-110 transition-transform duration-200`}
                    >
                      {step.number}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 py-0.5">
                    <h3 className="text-sm font-semibold mb-0.5 text-primary group-hover:text-accent transition-colors duration-200">
                      {step.title}
                    </h3>
                    <p className="text-secondary text-xs leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Bottom callout */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-16 text-center"
        >
          <div className="inline-block bg-gradient-to-r from-accent/5 to-purple-600/5 border border-accent/15 rounded-xl px-8 py-4">
            <p className="text-primary text-sm">
              <span className="font-semibold text-accent">
                Built for real study workflows
              </span>{" "}
              — import source material through the app or MCP, generate cards in
              your template, and move smoothly with Anki APKG import/export plus
              consistent spaced repetition
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default HowItWorks;

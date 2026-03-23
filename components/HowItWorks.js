"use client";
import { motion } from "framer-motion";

const steps = [
  {
    number: "01",
    title: "Capture Any Text",
    description:
      "Highlight and capture text from articles, PDFs, books, web pages, or your own notes—anywhere you find valuable information.",
  },
  {
    number: "02",
    title: "AI Generates Flashcards",
    description:
      "Our AI analyzes the content, extracts key concepts, and automatically creates well-structured flashcards optimized for learning.",
  },
  {
    number: "03",
    title: "Review with Spaced Repetition",
    description:
      "Cards are scheduled using proven spaced repetition algorithms, so you review at the optimal time for long-term retention.",
  },
  {
    number: "04",
    title: "Track Your Progress",
    description:
      "Monitor your learning with detailed analytics. See which topics you've mastered and where you need more practice.",
  },
  {
    number: "05",
    title: "Remember Forever",
    description:
      "With consistent review sessions, transform fleeting information into lasting knowledge that stays with you.",
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
            Turn any content into lasting knowledge with AI-powered flashcards
          </p>
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-2 gap-16 items-center">

          {/* Left: Phone Mockup */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="flex justify-center lg:justify-center"
          >
            <div className="relative">
              {/* Soft glow behind phone */}
              <div className="absolute inset-0 bg-gradient-to-br from-accent/15 to-purple-600/10 rounded-3xl blur-3xl scale-110" />
              <img
                src="/mock/mock1.webp"
                alt="Deckbase app preview"
                className="relative w-full max-w-[200px] lg:max-w-[260px] h-auto drop-shadow-xl rounded-3xl object-cover"
              />
            </div>
          </motion.div>

          {/* Right: Steps */}
          <div className="space-y-3">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: 40 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="group relative"
              >
                {/* Connector line */}
                {index < steps.length - 1 && (
                  <div className="absolute left-[1.85rem] top-14 w-px h-3 bg-border" />
                )}

                {/* Step card */}
                <div className="flex gap-4 p-4 rounded-xl bg-white border border-border hover:border-accent/20 hover:shadow-sm transition-all duration-300 group">
                  {/* Number */}
                  <div className="flex-shrink-0 relative">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-accent to-purple-600 flex items-center justify-center text-white font-semibold text-xs">
                      {step.number}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold mb-0.5 text-primary group-hover:text-accent transition-colors duration-200">
                      {step.title}
                    </h3>
                    <p className="text-secondary text-sm leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Bottom Feature Highlight */}
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
                Powered by advanced AI
              </span>{" "}
              — Deckbase understands context and creates flashcards that focus
              on what matters most for effective learning
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default HowItWorks;

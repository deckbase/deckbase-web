"use client";
import { motion } from "framer-motion";
import Image from "next/image";

const features = [
  {
    id: "01",
    title: "AI-Powered Card Generation",
    desc: [
      "Capture any text and let AI instantly create well-structured flashcards.",
      "Our AI extracts key concepts, generates examples, and formats cards for optimal learning.",
      "Edit and customize generated cards to match your personal study style.",
    ],
  },
  {
    id: "02",
    title: "Spaced Repetition System",
    desc: [
      "Review cards at scientifically optimal intervals for maximum retention.",
      "Algorithm adapts to your performance, showing difficult cards more often.",
      "Never waste time reviewing what you already know—focus on what needs work.",
    ],
  },
  {
    id: "03",
    title: "Multi-Source Import",
    desc: [
      "Import content from PDFs, web articles, ebooks, and handwritten notes.",
      "Use share extension to capture content directly from any app.",
      "Scan physical books and documents using your device camera.",
    ],
  },
  {
    id: "04",
    title: "Smart Organization",
    desc: [
      "Organize cards into decks and folders by subject, course, or topic.",
      "Tag cards for cross-referencing and create smart filtered views.",
      "Search across all your cards to quickly find what you need.",
    ],
  },
  {
    id: "05",
    title: "Learning Analytics",
    desc: [
      "Track your progress with detailed insights and performance metrics.",
      "See mastery levels, review streaks, and time spent studying.",
      "Identify weak areas and get recommendations for improvement.",
    ],
  },
  {
    id: "06",
    title: "Share & Collaborate",
    desc: [
      "Share decks with friends, classmates, or study groups instantly.",
      "Browse and import community-created decks for popular subjects.",
      "Collaborate on shared decks with real-time sync across devices.",
    ],
  },
];

const Feature = () => {
  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { duration: 0.8 } }}
      className="relative z-10 w-full bg-transparent text-white"
    >
      <article className="container mx-auto py-14 p-4 px-5 md:px-[5%] 2xl:px-0 max-w-[1200px] gap-4flex flex-col items-center justify-center gap-4">
        <div className="flex flex-col items-center justify-center">
          <h2 className="text-h2 lg:text-h3 font-bold text-center max-w-[80%]">
            Features & Benefits
          </h2>
          <span className="w-16 h-1 mt-3 bg-gradient-to-r from-accent to-purple-600 rounded-full" />

          <article className="flex flex-col items-center justify-center mt-16">
            <p className="mt-5 text-justify md:max-w-[60%] md:text-center text-white/90">
              Deckbase is your AI-powered learning companion that turns any text
              into effective flashcards. Master new subjects, retain what you
              read, and learn faster with spaced repetition—all with minimal
              effort on your part.
            </p>
          </article>
        </div>
        <div className="mt-16 lg:mt-26 max-w-[1000px] mx-auto grid grid-cols-1 gap-5">
          {features.map((paragraph, index) => (
            <motion.article
              key={paragraph.id}
              initial={{ opacity: 0, y: 100 }}
              whileInView={{ opacity: 1, y: 0, transition: { duration: 0.5 } }}
              viewport={{ once: true }}
              className={`mt-2 items-center flex flex-col mx-auto md:justify-between gap-4 p-4 py-10 border-b-2 last:border-b-0 border-silver ${
                index % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"
              }`}
            >
              <div className="w-[30%] md:w-[20%] flex items-center justify-center">
                <Image
                  src={`/mock/mock${parseInt(paragraph.id) + 2}.png`}
                  alt={paragraph.title}
                  width={300}
                  height={600}
                  className="w-full h-auto rounded-2xl shadow-2xl"
                />
              </div>
              <div className="flex flex-col items-start">
                <h4 className="text-h5 font-bold mt-5 lg:mt0 lg:text-left text-center bg-gradient-to-r from-accent to-purple-600 bg-clip-text text-transparent">
                  {paragraph.title}
                </h4>
                <ul className="mt-2 px-4 text-center lg:text-left">
                  {paragraph.desc.map((item, index) => (
                    <li key={index} className="text-left list-disc">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.article>
          ))}
        </div>
      </article>
    </motion.section>
  );
};

export default Feature;

"use client";
import { motion } from "framer-motion";

const story = [
  "Most of what we read is forgotten within days.",
  "We built Deckbase because we were tired of consuming information without actually retaining it.",
  "Books, articles, courses—we'd read them and forget most of the content within a week. The problem wasn't motivation; it was method.",
  "Traditional flashcard apps required hours of manual work. Creating good study materials was almost as time-consuming as the learning itself.",
  "So we built something different. AI that understands what you're reading. Flashcards that create themselves.",
  "Combined with spaced repetition—a scientifically proven method that schedules reviews at optimal intervals for long-term retention.",
  "Now, learning is effortless. Capture any text, let AI do the work, and actually remember what you learn.",
  "Deckbase is where reading becomes knowledge that lasts.",
];

const OurStory = () => {
  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { duration: 0.8 } }}
      className="relative z-10 w-full text-white bg-transparent"
    >
      <article className="container mx-auto py-14 p-4 px-5 md:px-[5%] 2xl:px-0 max-w-[1200px] lg:grid lg:grid-cols-2 items-center justify-center gap-4">
        <div className="flex flex-col items-center lg:items-start justify-start">
          <h2 className="text-h2 lg:text-h3 font-bold text-center lg:text-left max-w-[80%]">
            The Birth of Deckbase
          </h2>
          <span className="w-16 h-1 mt-3 bg-gradient-to-r from-accent to-purple-600 rounded-full" />
          <div className="flex items-center justify-center lg:justify-start mt-6">
            <img
              src="/mock/mock1.png"
              alt="Deckbase App Mockup"
              className="w-auto h-auto max-w-[300px] lg:max-w-[350px]"
            />
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 text-justify self-start">
          {story.map((paragraph, index) => {
            const isIntro = index === 0;
            const isQuote = paragraph.startsWith("Deckbase is");

            return (
              <motion.p
                key={index}
                initial={{ opacity: 0, y: 100 }}
                whileInView={{
                  opacity: 1,
                  y: 0,
                  transition: { duration: 0.5 },
                }}
                viewport={{ once: true }}
                className={`mt-1 ${isIntro ? "font-semibold text-lg" : ""} ${
                  isQuote
                    ? "italic font-bold text-xl mt-6 text-white"
                    : "text-base text-white/90"
                }`}
              >
                {paragraph}
              </motion.p>
            );
          })}
        </div>
      </article>
    </motion.section>
  );
};

export default OurStory;

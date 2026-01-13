"use client";
import { motion } from "framer-motion";

const values = [
  {
    id: "01",
    title: "Learning Should Be Effortless",
    desc: `Creating study materials shouldn't take longer than learning itself. Deckbase uses AI to do the heavy lifting, so you can focus on what matters — actually remembering what you learn.<br /><span class="italic text-black/60">💡 Great learning happens when friction is removed.</span>`,
  },
  {
    id: "02",
    title: "Science-Backed Methods",
    desc: `We believe in evidence-based learning. Spaced repetition is proven to dramatically improve long-term retention, and our algorithms are built on decades of cognitive science research.<br /><span class="italic text-black/60">💡 Memory isn't magic — it's a skill you can master with the right tools.</span>`,
  },
  {
    id: "03",
    title: "Your Data Stays Private",
    desc: `Your learning materials and study progress belong to you. We keep your data secure and private because your educational journey deserves protection, not exploitation.<br /><span class="italic text-black/60">💡 True learning happens in focused, private spaces.</span>`,
  },
  {
    id: "04",
    title: "Consistency Over Intensity",
    desc: `You don't need marathon study sessions. With short daily reviews, Deckbase helps you build lasting knowledge through consistent practice — creating powerful momentum one card at a time.<br /><span class="italic text-black/60">💡 Small daily efforts compound into extraordinary results.</span>`,
  },
  {
    id: "05",
    title: "Technology Should Serve Learning",
    desc: `AI should make education more accessible, not replace understanding. Deckbase uses technology to enhance your learning process while keeping you in control of what and how you study.<br /><span class="italic text-black/60">💡 When AI assists learning, knowledge becomes limitless.</span>`,
  },
];

const CoreValues = () => {
  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { duration: 0.8 } }}
      className="relative z-10 w-full bg-white"
    >
      <article className="container mx-auto py-14 p-4 px-5 md:px-[5%] 2xl:px-0 max-w-[1200px] flex flex-col items-center justify-center gap-10">
        <div className="flex flex-col items-center justify-center text-center">
          <h2 className="text-h2 lg:text-h3 font-bold max-w-[80%]">
            Deckbase – Our Core Values
          </h2>
          <span className="w-16 h-1 mt-3 bg-gradient-to-r from-accent to-purple-600 rounded-full" />
          <p className="mt-5 text-justify md:max-w-[60%] md:text-center">
            At <strong>Deckbase</strong>, we believe everyone deserves access to
            effective learning tools. Our values reflect our commitment to
            helping you{" "}
            <strong>
              transform reading into lasting knowledge using AI and proven
              learning science
            </strong>
            , one flashcard at a time.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {values.map((item) => (
            <motion.article
              key={item.id}
              initial={{ opacity: 0, y: 100, scale: 0.95 }}
              whileInView={{
                opacity: 1,
                y: 0,
                scale: 1,
                transition: { duration: 0.5 },
              }}
              viewport={{ once: true }}
              className="relative flex flex-col gap-4 border border-primary/20 bg-white rounded-xl p-6 md:p-8 shadow-lg"
            >
              <div className="absolute -top-5 left-1/2 transform -translate-x-1/2 w-[50px] h-[50px] rounded-full bg-gradient-to-r from-accent to-purple-600 text-white flex items-center justify-center font-bold text-md shadow-md">
                {item.id}
              </div>
              <h4 className="mt-6 text-lg font-semibold text-center lg:text-left bg-gradient-to-r from-accent to-purple-600 bg-clip-text text-transparent">
                {item.title}
              </h4>
              <p
                className="text-base text-center lg:text-left text-black/90"
                dangerouslySetInnerHTML={{ __html: item.desc }}
              />
            </motion.article>
          ))}
        </div>
      </article>
    </motion.section>
  );
};

export default CoreValues;

"use client";
import { motion } from "framer-motion";
import { Star } from "lucide-react";
import Link from "next/link";

const testimonials = [
  {
    name: "Sarah Chen",
    role: "Medical Student",
    avatar: "/avatars/sarah.jpg",
    rating: 5,
    text: "Deckbase has transformed how I study for exams. Instead of spending hours making flashcards, I just highlight my textbook and the AI does the rest. My retention has improved dramatically!",
  },
  {
    name: "Marcus Rodriguez",
    role: "Software Engineer",
    avatar: "/avatars/marcus.jpg",
    rating: 5,
    text: "I use Deckbase to learn new programming concepts. The AI creates perfect flashcards from documentation and tutorials. The spaced repetition keeps everything fresh in my memory.",
  },
  {
    name: "Emma Thompson",
    role: "Language Learner",
    avatar: "/avatars/emma.jpg",
    rating: 5,
    text: "Learning Japanese vocabulary has never been easier. I capture sentences from articles and Deckbase creates cards with context. The spaced repetition scheduling is a game-changer!",
  },
  {
    name: "David Park",
    role: "Law Student",
    avatar: "/avatars/david.jpg",
    rating: 5,
    text: "Law school requires memorizing countless cases and statutes. Deckbase helps me turn dense legal text into digestible flashcards. I've cut my study time in half while improving my grades.",
  },
  {
    name: "Lisa Johnson",
    role: "Product Manager",
    avatar: "/avatars/lisa.jpg",
    rating: 5,
    text: "I read tons of articles and books for work. Deckbase ensures I actually retain the key insights instead of forgetting them a week later. It's like having a personal memory assistant.",
  },
  {
    name: "Alex Kumar",
    role: "PhD Researcher",
    avatar: "/avatars/alex.jpg",
    rating: 5,
    text: "The AI understands academic papers remarkably well. It extracts the key findings and methodologies into study-ready flashcards. Essential for keeping up with literature in my field.",
  },
];

const UserTestimonials = () => {
  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { duration: 0.8 } }}
      className="relative z-10 w-full bg-white py-16 overflow-hidden"
    >
      <div className="container mx-auto p-4 px-5 md:px-[5%] 2xl:px-0 max-w-[1200px]">
        <div className="text-center mb-12 bg-bg-secondary border border-border rounded-3xl p-6 shadow-sm">
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0, transition: { duration: 0.6 } }}
            viewport={{ once: true }}
            className="text-sm text-gray-500 mb-2"
          >
            What We Expect to Hear
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0, transition: { duration: 0.8 } }}
            viewport={{ once: true }}
            className="text-3xl md:text-4xl font-bold mb-3 text-primary"
          >
            Expected User Feedback
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            whileInView={{
              opacity: 1,
              y: 0,
              transition: { duration: 0.8, delay: 0.2 },
            }}
            viewport={{ once: true }}
            className="text-base text-secondary max-w-2xl mx-auto"
          >
            Here&apos;s the kind of experience we&apos;re building Deckbase to
            deliver. Real user testimonials coming soon!
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{
                opacity: 1,
                y: 0,
                transition: { duration: 0.6, delay: index * 0.1 },
              }}
              viewport={{ once: true }}
              className="group bg-white border border-border p-6 rounded-lg shadow-sm hover:shadow-md transition-all duration-300"
            >
              <div className="flex items-center gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star
                    key={i}
                    className="w-5 h-5 fill-yellow-400 text-yellow-400"
                  />
                ))}
              </div>

              <blockquote className="text-primary mb-6 italic leading-relaxed">
                &quot;{testimonial.text}&quot;
              </blockquote>

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-r from-accent to-purple-600 rounded-full flex items-center justify-center text-white font-bold shadow-sm">
                  {testimonial.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </div>
                <div>
                  <div className="font-semibold text-primary">
                    {testimonial.name}
                  </div>
                  <div className="text-sm text-secondary">
                    {testimonial.role}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{
            opacity: 1,
            y: 0,
            transition: { duration: 0.8, delay: 0.8 },
          }}
          viewport={{ once: true }}
          className="text-center mt-12"
        >
          <div className="bg-bg-secondary border border-border p-8 rounded-lg">
            <h3 className="text-2xl font-bold mb-4 text-primary">
              Be Among the First to Learn Smarter
            </h3>
            <p className="text-secondary mb-6 max-w-2xl mx-auto">
              Start your journey to remembering everything you read. Transform
              passive reading into lasting knowledge with AI-powered flashcards.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => {
                  const userAgent =
                    navigator.userAgent || navigator.vendor || window.opera;
                  if (/android/i.test(userAgent)) {
                    window.open(
                      "https://play.google.com/store/apps/details?id=com.tkg.deckbase",
                      "_blank"
                    );
                  } else if (
                    /iPad|iPhone|iPod/.test(userAgent) &&
                    !window.MSStream
                  ) {
                    window.open(
                      "https://apps.apple.com/app/6755723338",
                      "_blank"
                    );
                  } else {
                    window.open(
                      "https://apps.apple.com/app/6755723338",
                      "_blank"
                    );
                  }
                }}
                className="bg-gradient-to-r from-accent to-purple-600 text-white px-8 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity cursor-pointer w-full sm:w-auto"
              >
                Download Now
              </button>
              <Link href="/about-us" className="w-full sm:w-auto">
                <button className="border-2 border-accent text-accent px-8 py-3 rounded-lg font-medium hover:bg-gradient-to-r hover:from-accent hover:to-purple-600 hover:text-white hover:border-transparent transition-all w-full">
                  Learn More
                </button>
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.section>
  );
};

export default UserTestimonials;

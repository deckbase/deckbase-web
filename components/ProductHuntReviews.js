"use client";

import { motion } from "framer-motion";

const PRODUCT_HUNT_REVIEWS_URL =
  "https://www.producthunt.com/products/deckbase/reviews/new?utm_source=badge-product_review&utm_medium=badge&utm_campaign=badge-deckbase";
const PRODUCT_HUNT_BADGE_SRC =
  "https://api.producthunt.com/widgets/embed-image/v1/product_review.svg?product_id=1190473&theme=light";

const ProductHuntReviews = () => {
  return (
    <section className="relative w-full bg-white overflow-hidden" aria-labelledby="product-hunt-reviews-heading">
      <div className="w-full h-px bg-border" />

      <div className="container mx-auto max-w-[1200px] px-5 md:px-[5%] 2xl:px-0 py-16 md:py-20">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-10 lg:gap-16">
          <div className="flex-1 text-center lg:text-left max-w-xl mx-auto lg:mx-0">
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-xs uppercase tracking-[0.18em] text-secondary font-medium mb-4"
            >
              Reviews
            </motion.p>

            <motion.h2
              id="product-hunt-reviews-heading"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.06 }}
              className="text-3xl md:text-4xl font-bold text-primary leading-tight mb-4"
            >
              Share your experience on{" "}
              <span className="bg-gradient-to-r from-accent to-purple-500 bg-clip-text text-transparent">
                Product Hunt
              </span>
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.55, delay: 0.12 }}
              className="text-secondary text-[15px] leading-relaxed"
            >
              People often use Product Hunt to search for their next personal or work tool. If Deckbase
              has helped you study, leave a review—reviews help others discover and choose the right
              product.
            </motion.p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55, delay: 0.1 }}
            className="shrink-0 flex justify-center"
          >
            <a
              href={PRODUCT_HUNT_REVIEWS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block rounded-lg overflow-hidden ring-1 ring-border/60 hover:ring-accent/40 transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- Product Hunt remote widget SVG */}
              <img
                src={PRODUCT_HUNT_BADGE_SRC}
                alt="Deckbase — AI flashcards with MCP + Anki-friendly import/export | Product Hunt"
                width={250}
                height={54}
                className="w-[250px] h-[54px] block"
                loading="lazy"
              />
            </a>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default ProductHuntReviews;

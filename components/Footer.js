"use client";

import Link from "next/link";
import Image from "next/image";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full min-w-0 overflow-x-hidden bg-[#050507] text-white border-t border-white/10 footer">
      <div className="mx-auto max-w-[1400px] pt-8 pb-6 px-4 sm:px-5 md:px-[5%]">
        <div className="flex flex-col gap-10 text-center lg:flex-row lg:items-start lg:gap-10 lg:text-left">
          <section className="flex w-full min-w-0 flex-col items-center gap-3 lg:items-start lg:w-[40%] lg:shrink-0">
            <Link
              href="/"
              className="flex items-center justify-center cursor-pointer font-ubuntu text-white md:text-xl font-bold lg:justify-start"
            >
              <Image
                src="/app_logo.webp"
                alt="Deckbase Logo"
                width={32}
                height={32}
                className="mr-2"
              />
              Deckbase
            </Link>
            <small className="mx-auto max-w-full text-[#fff] text-[15] leading-[20.46px] sm:max-w-[90%] lg:mx-0 lg:max-w-[50%]">
              Scan. Build. Remember. Deckbase is an AI-powered platform that
              turns what you read into lasting knowledge with spaced repetition.
            </small>
            <p className="text-white/80 text-sm mt-1 text-center lg:text-left">
              Customer support:{" "}
              <a
                href="mailto:support@deckbase.co"
                className="text-accent hover:underline"
              >
                support@deckbase.co
              </a>
            </p>
          </section>
          <section className="flex w-full min-w-0 flex-col items-center sm:max-w-none lg:items-start">
            <h2 className="text-silver pb-2">HELP</h2>
            <div className="flex flex-col items-center gap-2 text-[15] text-[#fff] lg:items-start">
              <Link
                href="/about-us"
                className="cursor-pointer transition-all min-w-fit hover:text-silver"
              >
                About
              </Link>
              <Link
                href="/features"
                className="cursor-pointer transition-all min-w-fit hover:text-silver"
              >
                Features
              </Link>
              <Link
                href="/premium"
                className="cursor-pointer transition-all hover:text-silver"
              >
                Pricing
              </Link>
              <Link
                href="/contact-us"
                className="cursor-pointer transition-all hover:text-silver"
              >
                Contact Us
              </Link>
            </div>
          </section>
          <section className="flex w-full min-w-0 flex-col items-center sm:max-w-none lg:items-start">
            <h2 className="text-silver pb-2">RESOURCES</h2>
            <div className="flex flex-col items-center gap-2 text-[#fff] lg:items-start">
              <Link
                href="/resources/mcp"
                className="cursor-pointer transition-all hover:text-silver"
              >
                MCP for Flashcards
              </Link>
              <Link
                href="/best-flashcard-apps"
                className="cursor-pointer transition-all hover:text-silver"
              >
                Best Flashcard Apps
              </Link>
            </div>
          </section>
          <section className="flex w-full min-w-0 flex-col items-center sm:max-w-none lg:items-start">
            <h2 className="text-silver pb-2">LEGALS</h2>
            <div className="flex flex-col items-center gap-2 text-[#fff] lg:items-start">
              <Link
                href="/terms-and-conditions"
                className="cursor-pointer transition-all hover:text-silver"
              >
                Terms & Conditions
              </Link>
              <Link
                href="/privacy-policy"
                className="cursor-pointer transition-all hover:text-silver"
              >
                Privacy Policy
              </Link>
              <Link
                href="/terms-and-conditions#refund-cancellation"
                className="cursor-pointer transition-all hover:text-silver"
              >
                Refunds & Cancellation
              </Link>
            </div>
          </section>
        </div>
        <div className="w-full h-[1px] bg-[#fff] mt-8 mb-3"></div>
        <small className="flex items-center justify-center gap-1 text-white py-1">
          &copy;
          <span
            className="text-[14px] lg:text-[15px] text-[#fff]"
            suppressHydrationWarning
          >
            {`${currentYear} Deckbase AI. All Rights Reserved`}
          </span>
        </small>
      </div>
    </footer>
  );
};

export default Footer;

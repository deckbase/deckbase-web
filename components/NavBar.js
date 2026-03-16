"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { motion } from "framer-motion";
import { usePathname } from "next/navigation";
import Button from "./Button";
import { useAuth } from "@/contexts/AuthContext";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const { user, userProfile, loading } = useAuth();

  const isActive = (path) => {
    return pathname === path
      ? "text-white font-semibold bg-white/15 rounded-md px-2 py-1 -mx-1"
      : "text-white/90 hover:text-white transition-colors duration-300";
  };

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const navbarVariants = {
    hidden: { opacity: 0, y: -50 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  return (
    <motion.nav
      className="fixed top-0 left-0 w-full min-h-[80px] z-50 bg-black/30 backdrop-blur-lg border-b border-white/10"
      variants={navbarVariants}
      initial="hidden"
      animate="visible"
    >
      <article className="p-4 px-5 md:px-[5%] w-full mx-auto flex items-center justify-between gap-3 min-w-0">
        <div className="flex items-center min-w-0 flex-1 md:flex-initial gap-4 md:gap-6 lg:gap-8">
          <Link
            href="/"
            className="flex items-center flex-shrink-0 cursor-pointer font-ubuntu text-white text-base sm:text-lg md:text-xl font-bold min-w-0"
            onClick={() => setIsOpen(false)}
          >
            <Image
              src="/app_logo.png"
              alt="Deckbase Logo"
              width={32}
              height={32}
              className="mr-2 flex-shrink-0"
              priority
            />
            <span className="truncate md:hidden lg:inline">Deckbase</span>
          </Link>

          <ul className="hidden md:flex flex-shrink min-w-0 items-center md:space-x-4 lg:space-x-6 xl:space-x-8 text-sm lg:text-base flex-nowrap overflow-x-auto">
            <li className="flex-shrink-0">
              <Link
                href="/features"
                className={isActive("/features")}
                onClick={toggleMenu}
              >
                Features
              </Link>
            </li>
            <li className="flex-shrink-0">
              <Link href="/premium" className={isActive("/premium")}>
                Pricing
              </Link>
            </li>
            <li className="flex-shrink-0">
              <Link href="/download" className={isActive("/download")}>
                Download
              </Link>
            </li>
            <li className="flex-shrink-0">
              <Link href="/mcp" className={isActive("/mcp")}>
                MCP
              </Link>
            </li>
            <li className="flex-shrink-0">
              <Link href="/docs" className={isActive("/docs")}>
                Docs
              </Link>
            </li>
            <li className="flex-shrink-0">
              <Link href="/resources" className={isActive("/resources")}>
                Resources
              </Link>
            </li>
          </ul>
        </div>

        <div className="hidden md:flex flex-shrink-0 items-center">
          {!loading && !user && (
            <Link
              href="/login"
              className="px-4 py-2 bg-accent hover:bg-accent/90 text-white font-medium rounded-lg transition-colors"
            >
              Sign in
            </Link>
          )}
          {!loading && user && (
            <Link
              href="/dashboard"
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-colors"
              aria-label="Go to dashboard"
            >
              {(userProfile?.profileUrl || user.photoURL) ? (
                <img
                  src={userProfile?.profileUrl || user.photoURL}
                  alt=""
                  className="h-7 w-7 min-w-[28px] rounded-full object-cover shrink-0"
                />
              ) : (
                <span className="inline-flex h-7 w-7 min-w-[28px] shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold text-white">
                  {(userProfile?.displayName || user.email || "U").charAt(0).toUpperCase()}
                </span>
              )}
              <span className="max-w-[140px] truncate text-sm">
                {userProfile?.displayName || user.email}
              </span>
            </Link>
          )}
        </div>

        {/* Mobile Menu Button */}
        <article className="md:hidden flex items-center justify-end flex-shrink-0">
          <motion.button
            onClick={toggleMenu}
            whileHover={{ scale: 1.1 }}
            transition={{ duration: 0.2 }}
          >
            {isOpen ? (
              <svg
                className="w-8 h-8 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                ></path>
              </svg>
            ) : (
              <svg
                className="w-8 h-8 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 6h16M4 12h16M4 18h16"
                ></path>
              </svg>
            )}
          </motion.button>
        </article>
      </article>

      {/* Mobile Menu */}
      <motion.article
        className={`md:hidden ${
          isOpen
            ? "fixed block inset-0 min-h-[100vh] top-[80px] transform translate-y-0 transition-transform duration-300 w-full bg-black/90 backdrop-blur-xl"
            : "fixed hidden inset-0 transform -translate-y-full transition-transform duration-300"
        }`}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: isOpen ? 1 : 0, y: isOpen ? 0 : -10 }}
        transition={{ duration: 0.3 }}
      >
        <ul className="flex text-secondary flex-col items-center pt-28 space-y-14">
          <li className="text-3xl">
            <Link
              href="/features"
              className={isActive("/features")}
              onClick={toggleMenu}
            >
              Features
            </Link>
          </li>
          <li className="text-3xl">
            <Link
              href="/premium"
              className={isActive("/premium")}
              onClick={toggleMenu}
            >
              Pricing
            </Link>
          </li>
          <li className="text-3xl">
            <Link
              href="/download"
              className={isActive("/download")}
              onClick={toggleMenu}
            >
              Download
            </Link>
          </li>
          <li className="text-3xl">
            <Link
              href="/mcp"
              className={isActive("/mcp")}
              onClick={toggleMenu}
            >
              MCP
            </Link>
          </li>
          <li className="text-3xl">
            <Link
              href="/docs"
              className={isActive("/docs")}
              onClick={toggleMenu}
            >
              Docs
            </Link>
          </li>
          <li className="text-3xl">
            <Link
              href="/resources"
              className={isActive("/resources")}
              onClick={toggleMenu}
            >
              Resources
            </Link>
          </li>
          <li className="text-2xl mt-4">
            {!loading && !user && (
              <Link
                href="/login"
                className="px-6 py-3 bg-accent hover:bg-accent/90 text-white font-medium rounded-lg transition-colors"
                onClick={toggleMenu}
              >
                Sign in
              </Link>
            )}
            {!loading && user && (
              <Link
                href="/dashboard"
                className="flex items-center gap-3 px-6 py-3 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium transition-colors"
                onClick={toggleMenu}
                aria-label="Go to dashboard"
              >
                {(userProfile?.profileUrl || user.photoURL) ? (
                  <img
                    src={userProfile?.profileUrl || user.photoURL}
                    alt=""
                    className="h-9 w-9 min-w-[36px] rounded-full object-cover shrink-0"
                  />
                ) : (
                  <span className="inline-flex h-9 w-9 min-w-[36px] shrink-0 items-center justify-center rounded-full bg-accent text-base font-semibold text-white">
                    {(userProfile?.displayName || user.email || "U").charAt(0).toUpperCase()}
                  </span>
                )}
                <span className="max-w-[160px] truncate text-base">
                  {userProfile?.displayName || user.email}
                </span>
              </Link>
            )}
          </li>
        </ul>
      </motion.article>
    </motion.nav>
  );
};

export default Navbar;

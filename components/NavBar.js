"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

const navLinks = [
  { href: "/features", label: "Features" },
  { href: "/premium", label: "Pricing" },
  { href: "/download", label: "Download" },
  { href: "/mcp", label: "MCP" },
  { href: "/docs", label: "Docs" },
  { href: "/resources", label: "Resources" },
];

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const { user, userProfile, loading } = useAuth();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  const navBarBg =
    scrolled
      ? "bg-black/75 backdrop-blur-2xl border-b border-white/[0.07] shadow-[0_1px_24px_rgba(0,0,0,0.5)]"
      : "border-b border-transparent md:bg-transparent md:backdrop-blur-none max-md:bg-black/82 max-md:backdrop-blur-xl max-md:border-white/[0.06]";

  return (
    <>
      <motion.nav
        className={`fixed top-0 left-0 w-full z-[100] transition-all duration-500 pt-[env(safe-area-inset-top,0px)] ${navBarBg}`}
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <div className="px-4 sm:px-5 md:px-[5%] mx-auto max-w-[1400px] flex items-center justify-between min-h-[68px] h-[68px]">

          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2.5 flex-shrink-0 group"
            onClick={() => setIsOpen(false)}
          >
            <Image
              src="/app_logo.webp"
              alt="Deckbase Logo"
              width={28}
              height={28}
              className="flex-shrink-0 group-hover:scale-105 transition-transform duration-200"
              priority
            />
            <span className="font-bold text-white text-[17px] tracking-[-0.01em]">
              Deckbase
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-0.5">
            {navLinks.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative px-3.5 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
                    active
                      ? "text-white"
                      : "text-white/50 hover:text-white/90"
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="nav-active-pill"
                      className="absolute inset-0 bg-white/[0.09] rounded-md border border-white/[0.1]"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                    />
                  )}
                  <span className="relative">{link.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-3">
            {!loading && !user && (
              <Link
                href="/login"
                className="px-4 py-2 text-sm font-semibold text-white bg-accent hover:bg-accent/90 rounded-lg transition-all duration-200 hover:shadow-[0_0_20px_rgba(35,131,226,0.35)]"
              >
                Sign in
              </Link>
            )}
            {!loading && user && (
              <Link
                href="/dashboard"
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-white transition-all duration-200"
              >
                {(userProfile?.profileUrl || user.photoURL) ? (
                  <img
                    src={userProfile?.profileUrl || user.photoURL}
                    alt=""
                    className="h-6 w-6 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-[11px] font-bold text-white">
                    {(userProfile?.displayName || user.email || "U").charAt(0).toUpperCase()}
                  </span>
                )}
                <span className="max-w-[120px] truncate text-sm">
                  {userProfile?.displayName || user.email}
                </span>
              </Link>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden flex shrink-0 items-center justify-center w-11 h-11 text-white hover:text-white transition-colors rounded-xl bg-white/[0.08] border border-white/[0.12] hover:bg-white/[0.12]"
            aria-expanded={isOpen}
            aria-controls="mobile-nav-menu"
            aria-label="Toggle menu"
          >
            <div className="w-5 h-[14px] flex flex-col justify-between">
              <motion.span
                className="block h-[1.5px] w-full bg-current rounded-full origin-center"
                animate={isOpen ? { rotate: 45, y: 6.25 } : { rotate: 0, y: 0 }}
                transition={{ duration: 0.22, ease: "easeInOut" }}
              />
              <motion.span
                className="block h-[1.5px] w-full bg-current rounded-full"
                animate={isOpen ? { opacity: 0, scaleX: 0.5 } : { opacity: 1, scaleX: 1 }}
                transition={{ duration: 0.18 }}
              />
              <motion.span
                className="block h-[1.5px] w-full bg-current rounded-full origin-center"
                animate={isOpen ? { rotate: -45, y: -6.25 } : { rotate: 0, y: 0 }}
                transition={{ duration: 0.22, ease: "easeInOut" }}
              />
            </div>
          </button>
        </div>
      </motion.nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            id="mobile-nav-menu"
            role="dialog"
            aria-modal="true"
            className="md:hidden fixed left-0 right-0 bottom-0 z-[95] top-[calc(68px+env(safe-area-inset-top,0px))] overflow-y-auto overscroll-contain bg-[#0a0a0a]/98 backdrop-blur-2xl border-b border-white/[0.06] pb-[env(safe-area-inset-bottom,0px)]"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            <div className="px-4 pt-3 pb-6 flex flex-col gap-0.5 min-h-0">
              {navLinks.map((link, i) => {
                const active = pathname === link.href;
                return (
                  <motion.div
                    key={link.href}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04, duration: 0.2 }}
                  >
                    <Link
                      href={link.href}
                      onClick={() => setIsOpen(false)}
                      className={`flex items-center px-4 py-3 rounded-xl text-[15px] font-medium transition-colors ${
                        active
                          ? "text-white bg-white/[0.08] border border-white/[0.07]"
                          : "text-white/50 hover:text-white hover:bg-white/[0.04]"
                      }`}
                    >
                      {link.label}
                    </Link>
                  </motion.div>
                );
              })}

              <div className="mt-4 pt-4 border-t border-white/[0.06]">
                {!loading && !user && (
                  <Link
                    href="/login"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center justify-center w-full px-4 py-3 bg-accent hover:bg-accent/90 text-white font-semibold rounded-xl transition-colors text-[15px]"
                  >
                    Sign in
                  </Link>
                )}
                {!loading && user && (
                  <Link
                    href="/dashboard"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white transition-colors"
                  >
                    {(userProfile?.profileUrl || user.photoURL) ? (
                      <img
                        src={userProfile?.profileUrl || user.photoURL}
                        alt=""
                        className="h-8 w-8 rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-white">
                        {(userProfile?.displayName || user.email || "U").charAt(0).toUpperCase()}
                      </span>
                    )}
                    <span className="text-sm truncate">{userProfile?.displayName || user.email}</span>
                  </Link>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navbar;

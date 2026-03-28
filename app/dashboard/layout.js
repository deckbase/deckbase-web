"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  LogOut,
  Home,
  LayoutTemplate,
  Settings,
  User,
  Key,
  CreditCard,
  ChevronDown,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Home", icon: Home, exact: true },
  { href: "/dashboard/templates", label: "Templates", icon: LayoutTemplate },
  { href: "/dashboard/admin", label: "Admin", icon: Settings },
];

export default function DashboardLayout({ children }) {
  const { user, userProfile, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminGateReady, setAdminGateReady] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      setAdminGateReady(true);
      return;
    }
    let cancelled = false;
    setAdminGateReady(false);
    (async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch("/api/user/is-admin", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const j = await res.json().catch(() => ({}));
        if (!cancelled) setIsAdmin(!!j.isAdmin);
      } catch {
        if (!cancelled) setIsAdmin(false);
      } finally {
        if (!cancelled) setAdminGateReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    setAccountOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handlePointerDown = (e) => {
      if (accountRef.current && !accountRef.current.contains(e.target)) {
        setAccountOpen(false);
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") setAccountOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      router.push("/");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const isActive = (item) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  if (loading || !adminGateReady) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center">
        <div className="w-7 h-7 rounded-full border-2 border-white/[0.07] border-t-accent animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  const visibleNavItems = navItems.filter(
    (item) => item.href !== "/dashboard/admin" || isAdmin,
  );

  const displayName = userProfile?.displayName || user?.email || "U";
  const avatarUrl = userProfile?.profileUrl || user?.photoURL;

  return (
    <div className="min-h-screen bg-[#080808] text-white">
      {/* Top nav */}
      <nav className="fixed top-0 left-0 right-0 h-14 z-50 bg-black/75 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="h-full max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-3">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 flex-shrink-0 group">
            <Image
              src="/app_logo.webp"
              alt="Deckbase"
              width={26}
              height={26}
              className="group-hover:scale-105 transition-transform duration-200"
              priority
            />
            <span className="font-bold text-[15px] text-white hidden sm:block tracking-tight">
              Deckbase
            </span>
          </Link>

          {/* Nav links */}
          <div className="flex items-center gap-0.5 overflow-x-auto">
            {visibleNavItems.map((item) => {
              const active = isActive(item);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={item.label}
                  className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors duration-150 whitespace-nowrap ${
                    active
                      ? "text-white"
                      : "text-white/40 hover:text-white/80 hover:bg-white/[0.04]"
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="dash-nav-pill"
                      className="absolute inset-0 rounded-lg bg-white/[0.08] border border-white/[0.08]"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.35 }}
                    />
                  )}
                  <Icon className="w-[15px] h-[15px] flex-shrink-0 relative" />
                  <span className="hidden md:inline relative">{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Account menu */}
          <div className="relative flex-shrink-0" ref={accountRef}>
            <button
              type="button"
              onClick={() => setAccountOpen((o) => !o)}
              aria-expanded={accountOpen}
              aria-haspopup="menu"
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border transition-all duration-150 ${
                accountOpen
                  ? "bg-white/[0.1] border-white/[0.12]"
                  : "bg-white/[0.05] hover:bg-white/[0.09] border-white/[0.07]"
              }`}
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt=""
                  className="h-6 w-6 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <span className="inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-accent text-[11px] font-bold">
                  {displayName.charAt(0).toUpperCase()}
                </span>
              )}
              <span className="text-[13px] text-white/65 hidden sm:block truncate max-w-[110px]">
                {displayName}
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-white/35 shrink-0 transition-transform duration-200 ${
                  accountOpen ? "rotate-180" : ""
                }`}
                aria-hidden
              />
            </button>

            <AnimatePresence>
              {accountOpen && (
                <motion.div
                  role="menu"
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  className="absolute right-0 top-[calc(100%+6px)] w-[min(100vw-2rem,220px)] rounded-xl border border-white/[0.08] bg-[#121212]/95 backdrop-blur-xl shadow-[0_12px_40px_rgba(0,0,0,0.55)] py-1 z-[60]"
                >
                  <Link
                    role="menuitem"
                    href="/dashboard/profile"
                    onClick={() => setAccountOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2.5 text-[13px] text-white/85 hover:bg-white/[0.06] transition-colors"
                  >
                    <User className="w-4 h-4 text-white/45 shrink-0" />
                    Edit account
                  </Link>
                  <Link
                    role="menuitem"
                    href="/dashboard/api-keys"
                    onClick={() => setAccountOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2.5 text-[13px] text-white/85 hover:bg-white/[0.06] transition-colors"
                  >
                    <Key className="w-4 h-4 text-white/45 shrink-0" />
                    API keys
                  </Link>
                  <Link
                    role="menuitem"
                    href="/dashboard/subscription"
                    onClick={() => setAccountOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2.5 text-[13px] text-white/85 hover:bg-white/[0.06] transition-colors"
                  >
                    <CreditCard className="w-4 h-4 text-white/45 shrink-0" />
                    Subscription
                  </Link>
                  <div className="my-1 h-px bg-white/[0.06]" />
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setAccountOpen(false);
                      handleLogout();
                    }}
                    className="flex w-full items-center gap-2.5 px-3 py-2.5 text-[13px] text-red-400/90 hover:bg-red-500/[0.08] transition-colors"
                  >
                    <LogOut className="w-4 h-4 shrink-0" />
                    Sign out
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </nav>

      <main className="pt-14 min-h-screen">{children}</main>
    </div>
  );
}

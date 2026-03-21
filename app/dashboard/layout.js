"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import Image from "next/image";
import { LogOut, Home, LayoutTemplate, Settings, Crown, Key } from "lucide-react";

export default function DashboardLayout({ children }) {
  const { user, userProfile, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  const handleLogout = async () => {
    try {
      await logout();
      router.push("/");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Top Navigation */}
      <nav className="fixed top-0 left-0 right-0 h-16 bg-black/80 backdrop-blur-lg border-b border-white/10 z-50">
        <div className="h-full max-w-7xl mx-auto px-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/app_logo.webp"
              alt="Deckbase"
              width={32}
              height={32}
              className="rounded-lg"
              priority
            />
            <span className="text-white font-bold text-lg hidden sm:block">
              Deckbase
            </span>
          </Link>

          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="text-white/70 hover:text-white transition-colors p-2"
              title="Home"
            >
              <Home className="w-5 h-5" />
            </Link>

            <Link
              href="/dashboard/templates"
              className="text-white/70 hover:text-white transition-colors p-2"
              title="Templates"
            >
              <LayoutTemplate className="w-5 h-5" />
            </Link>
            <Link
              href="/dashboard/api-keys"
              className="text-white/70 hover:text-white transition-colors p-2"
              title="API keys"
            >
              <Key className="w-5 h-5" />
            </Link>
            <Link
              href="/dashboard/subscription"
              className="text-white/70 hover:text-white transition-colors p-2"
              title="Subscription"
            >
              <Crown className="w-5 h-5" />
            </Link>
            <Link
              href="/dashboard/admin"
              className="text-white/70 hover:text-white transition-colors p-2"
              title="Admin"
            >
              <Settings className="w-5 h-5" />
            </Link>

            <Link
              href="/dashboard/profile"
              className="flex items-center gap-3 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
            >
              {(userProfile?.profileUrl || user?.photoURL) ? (
                <img
                  src={userProfile?.profileUrl || user?.photoURL}
                  alt=""
                  className="h-7 w-7 min-w-[28px] rounded-full object-cover shrink-0"
                />
              ) : (
                <span className="inline-flex h-7 w-7 min-w-[28px] shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold text-white">
                  {(userProfile?.displayName || user?.email || "U").charAt(0).toUpperCase()}
                </span>
              )}
              <span className="text-white/80 text-sm hidden sm:block truncate max-w-[140px]">
                {userProfile?.displayName || user?.email}
              </span>
            </Link>

            <button
              onClick={handleLogout}
              className="text-white/70 hover:text-red-400 transition-colors p-2"
              title="Sign Out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-16 min-h-screen">{children}</main>
    </div>
  );
}

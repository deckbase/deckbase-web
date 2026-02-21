"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import Image from "next/image";
import { LogOut, User, Home, Layers, LayoutTemplate, Settings } from "lucide-react";

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
          <Link href="/dashboard" className="flex items-center gap-2">
            <Image
              src="/app_logo.png"
              alt="Deckbase"
              width={32}
              height={32}
              className="rounded-lg"
            />
            <span className="text-white font-bold text-lg hidden sm:block">
              Deckbase
            </span>
          </Link>

          <div className="flex items-center gap-4">
            <Link
              href="/"
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
              href="/dashboard/admin"
              className="text-white/70 hover:text-white transition-colors p-2"
              title="Admin"
            >
              <Settings className="w-5 h-5" />
            </Link>

            <div className="flex items-center gap-3 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
              {userProfile?.profileUrl ? (
                <Image
                  src={userProfile.profileUrl}
                  alt="Profile"
                  width={28}
                  height={28}
                  className="rounded-full"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center">
                  <User className="w-4 h-4 text-accent" />
                </div>
              )}
              <span className="text-white/80 text-sm hidden sm:block">
                {userProfile?.displayName || user?.email?.split("@")[0]}
              </span>
            </div>

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

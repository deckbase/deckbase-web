"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function AdminSectionLayout({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [gate, setGate] = useState("loading");

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      setGate("denied");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch("/api/user/is-admin", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const j = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!j.isAdmin) {
          router.replace("/dashboard");
          setGate("denied");
          return;
        }
        setGate("ok");
      } catch {
        if (!cancelled) {
          router.replace("/dashboard");
          setGate("denied");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, loading, router]);

  if (loading || gate === "loading") {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center">
        <div className="w-7 h-7 rounded-full border-2 border-white/[0.07] border-t-accent animate-spin" />
      </div>
    );
  }

  if (gate !== "ok") {
    return null;
  }

  return children;
}

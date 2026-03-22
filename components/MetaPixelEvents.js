"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const isDev = process.env.NODE_ENV === "development";

function scheduleIdle(callback) {
  if (typeof window === "undefined") return () => {};
  if (typeof window.requestIdleCallback === "function") {
    const id = window.requestIdleCallback(callback, { timeout: 3500 });
    return () => window.cancelIdleCallback(id);
  }
  const t = window.setTimeout(callback, 1800);
  return () => window.clearTimeout(t);
}

export const MetaPixelEvents = () => {
  const pathname = usePathname();
  const [pixelApi, setPixelApi] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const cancel = scheduleIdle(() => {
      import("react-facebook-pixel").then((module) => {
        if (cancelled) return;
        const ReactPixel = module.default;
        if (!window.fbqInitialized) {
          ReactPixel.init(process.env.NEXT_PUBLIC_META_PIXEL_ID);
          window.fbqInitialized = true;
          if (isDev) console.log("Meta Pixel Initialized ✅");
        }
        setPixelApi(ReactPixel);
      });
    });
    return () => {
      cancelled = true;
      cancel();
    };
  }, []);

  useEffect(() => {
    if (!pixelApi || typeof window === "undefined") return;

    pixelApi.pageView();
    if (isDev) console.log(`Meta Pixel Event: PageView triggered for ${pathname}`);

    const trackedPages = ["/features", "/premium", "/about-us", "/updates"];

    if (trackedPages.includes(pathname)) {
      pixelApi.track("ViewContent", {
        content_name: pathname.replace("/", "").toUpperCase() + " Page",
      });

      if (isDev) console.log(`Meta Pixel Event: ViewContent triggered on ${pathname}`);
    }

    const handleScroll = () => {
      const scrollY = window.scrollY;
      const pageHeight = document.body.scrollHeight;
      const windowHeight = window.innerHeight;

      const scrollPercentage = (scrollY / (pageHeight - windowHeight)) * 100;

      if (scrollPercentage > 50) {
        pixelApi.trackCustom("ScrollDepth50", {
          content_name: "50% Page Scroll",
          page: pathname,
        });

        if (isDev) console.log("Meta Pixel Event: ScrollDepth50 triggered");

        window.removeEventListener("scroll", handleScroll);
      }
    };

    window.addEventListener("scroll", handleScroll);

    const timeOnPageTimeout = setTimeout(() => {
      pixelApi.trackCustom("TimeOnPage", {
        time_spent: "30 seconds",
        page: pathname,
      });

      if (isDev) console.log("Meta Pixel Event: TimeOnPage triggered");
    }, 30000);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      clearTimeout(timeOnPageTimeout);
    };
  }, [pixelApi, pathname]);

  return null;
};

export default MetaPixelEvents;

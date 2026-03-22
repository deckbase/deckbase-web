import React from "react";
import Image from "next/image"; // If using Next.js
import { googlePlayStoreUrl } from "@/lib/app-download-config";

const GooglePlayDownloadButton = () => {
  const androidUrl = googlePlayStoreUrl();

  const handleClick = () => {
    if (typeof window !== "undefined") {
      import("react-facebook-pixel").then((module) => {
        const ReactPixel = module.default;
        ReactPixel.init(process.env.NEXT_PUBLIC_META_PIXEL_ID);
        ReactPixel.trackCustom("GOOGLE_PLAY_Click", {
          button_name: "Google Play",
        });
        console.log("Google Play button clicked");
      });
      window.open(androidUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="Get Deckbase on Google Play"
      style={{ border: "none", background: "none", padding: 0 }}
    >
      <Image
        src="/buttons/google-play-badge.png"
        alt="Get it on Google Play"
        className="h-[45px] w-auto"
        width={150}
        height={50}
        style={{ width: "auto", height: "45px" }}
      />
    </button>
  );
};

export default GooglePlayDownloadButton;

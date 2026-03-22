import React from "react";
import Image from "next/image"; // If using Next.js
import { appStoreUrl } from "@/lib/app-download-config";

const AppStoreDownloadButton = () => {
  const iosUrl = appStoreUrl();

  const handleClick = () => {
    if (typeof window !== "undefined") {
      import("react-facebook-pixel").then((module) => {
        const ReactPixel = module.default;
        ReactPixel.init(process.env.NEXT_PUBLIC_META_PIXEL_ID);
        ReactPixel.trackCustom("APP_STORE_Click", {
          button_name: "App Store",
        });
        console.log("App Store button clicked");
      });
      window.open(iosUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="Download Deckbase on the App Store"
      style={{ border: "none", background: "none", padding: 0 }}
    >
      <Image
        src="/buttons/app-store-badge.svg"
        alt="Download on the App Store"
        width={150}
        height={45}
        style={{ width: "auto", height: "45px" }}
        className="inline-block"
      />
    </button>
  );
};

export default AppStoreDownloadButton;

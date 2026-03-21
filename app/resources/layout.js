import { JsonLdScript } from "@/components/seo/JsonLdScript";
import { breadcrumbSchema } from "@/lib/seo-schema";
import { absoluteUrl } from "@/lib/site-url";

export const metadata = {
  title: "Resources",
  description:
    "Quick links: MCP setup, download the app, contact support, and more.",
  alternates: { canonical: "/resources" },
  openGraph: {
    title: "Deckbase Resources",
    description: "Links to MCP, downloads, and support.",
    url: absoluteUrl("/resources"),
    siteName: "Deckbase",
  },
};

export default function ResourcesLayout({ children }) {
  return (
    <>
      <JsonLdScript
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Resources", path: "/resources" },
        ])}
      />
      {children}
    </>
  );
}

import { SITE_URL } from "@/lib/site-url";

export default function sitemap() {
  const baseUrl = SITE_URL;

  const routes = [
    { path: "", changeFrequency: "weekly", priority: 1.0 },
    { path: "/download", changeFrequency: "weekly", priority: 0.95 },
    { path: "/features", changeFrequency: "weekly", priority: 0.9 },
    { path: "/premium", changeFrequency: "weekly", priority: 0.9 },
    { path: "/deckbase-vs-anki", changeFrequency: "monthly", priority: 0.8 },
    { path: "/deckbase-vs-quizlet", changeFrequency: "monthly", priority: 0.8 },
    { path: "/mcp", changeFrequency: "monthly", priority: 0.65 },
    { path: "/docs", changeFrequency: "monthly", priority: 0.6 },
    { path: "/docs/mcp-server", changeFrequency: "monthly", priority: 0.6 },
    { path: "/resources", changeFrequency: "monthly", priority: 0.55 },
    { path: "/about-us", changeFrequency: "monthly", priority: 0.7 },
    { path: "/contact-us", changeFrequency: "monthly", priority: 0.6 },
    { path: "/updates", changeFrequency: "weekly", priority: 0.6 },
    { path: "/privacy-policy", changeFrequency: "yearly", priority: 0.3 },
    { path: "/terms-and-conditions", changeFrequency: "yearly", priority: 0.3 },
  ];

  return routes.map((route) => ({
    url: `${baseUrl}${route.path}`,
    lastModified: new Date(),
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}

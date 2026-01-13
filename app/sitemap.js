export default function sitemap() {
  const baseUrl = "https://deckbase.co";

  // Define all your public pages with specific priorities
  const routes = [
    { path: "", changeFrequency: "weekly", priority: 1.0 },
    { path: "/features", changeFrequency: "weekly", priority: 0.9 },
    { path: "/premium", changeFrequency: "weekly", priority: 0.9 },
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

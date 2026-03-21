import { SITE_URL } from "@/lib/site-url";
import { SITEMAP_ROUTES } from "@/lib/sitemap-metadata";

export default function sitemap() {
  const baseUrl = SITE_URL;

  return SITEMAP_ROUTES.map((route) => ({
    url: `${baseUrl}${route.path}`,
    lastModified: new Date(route.lastModified),
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}

import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://fitness.trollrunner.net";
  return [
    { url: `${base}/`, priority: 1 },
    { url: `${base}/learn`, priority: 0.8 },
    { url: `${base}/training`, priority: 0.5 },
    { url: `${base}/coach`, priority: 0.5 },
    { url: `${base}/you`, priority: 0.3 },
  ];
}

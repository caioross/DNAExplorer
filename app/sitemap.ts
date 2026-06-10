import { MetadataRoute } from "next";

const BASE = process.env.NEXT_PUBLIC_APP_URL || "https://dnaexplorer.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: BASE,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
  ];
}

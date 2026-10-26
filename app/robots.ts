import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/constants";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/app", "/testeur", "/verifier", "/invitation"] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}

import type { MetadataRoute } from "next";

const manifest = (): MetadataRoute.Manifest => ({
  name: "Personalized Nutrition",
  short_name: "PN",
  description:
    "Pick the codes that matter to you. Weight them. See how any food scores against your personal definition of good food.",
  start_url: "/",
  scope: "/",
  display: "standalone",
  orientation: "portrait",
  background_color: "#fbf6ed",
  theme_color: "#fbf6ed",
  categories: ["health", "food", "lifestyle"],
  icons: [
    {
      src: "/icons/icon-192.png",
      sizes: "192x192",
      type: "image/png",
      purpose: "any",
    },
    {
      src: "/icons/icon-512.png",
      sizes: "512x512",
      type: "image/png",
      purpose: "any",
    },
    {
      src: "/icons/icon-maskable-512.png",
      sizes: "512x512",
      type: "image/png",
      purpose: "maskable",
    },
  ],
});

export default manifest;

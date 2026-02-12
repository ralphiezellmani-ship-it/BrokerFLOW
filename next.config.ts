import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Optimera bilder för vanliga leverantörer
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
  // Servermiljö: gör pdf-parse tillgänglig i serverless functions
  serverExternalPackages: ["pdf-parse"],
};

export default nextConfig;

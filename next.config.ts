import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // DOM implementations used for import parsing/sanitising: load them from
  // node_modules at runtime instead of bundling them.
  serverExternalPackages: ["isomorphic-dompurify", "jsdom", "happy-dom", "mammoth"],
};

export default nextConfig;

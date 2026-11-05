import type { NextConfig } from "next";

// No serverExternalPackages on purpose: happy-dom (used by @tiptap/html/server)
// and marked are ESM-only, and Vercel's function loader can't require() ESM
// from node_modules. Letting Next bundle them avoids that entirely.
const nextConfig: NextConfig = {};

export default nextConfig;

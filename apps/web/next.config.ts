import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@vowgrid/contracts", "@vowgrid/ui"],
};

export default nextConfig;

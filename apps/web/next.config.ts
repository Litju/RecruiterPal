import type { NextConfig } from "next";
import { withEve } from "eve/next";
import { withWorkflow } from "workflow/next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
};

export default withEve(withWorkflow(nextConfig), {
  eveRoot: "../../agent",
  eveBuildCommand: "node ../scripts/eve-vercel-build.mjs",
});

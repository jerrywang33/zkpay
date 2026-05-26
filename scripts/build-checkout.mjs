import { build } from "esbuild";

await build({
  entryPoints: ["site/checkout.ts"],
  outfile: "checkout.js",
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2022",
  sourcemap: false,
  minify: false,
});

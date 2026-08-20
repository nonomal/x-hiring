import { cloudflare } from "@cloudflare/vite-plugin";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact, { reactCompilerPreset } from "@vitejs/plugin-react";
import { defineConfig, lazyPlugins } from "vite-plus";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  optimizeDeps: {
    holdUntilCrawlEnd: false,
  },
  plugins: lazyPlugins(() => [
    cloudflare({ viteEnvironment: { name: "ssr" } }),
    tailwindcss(),
    tanstackStart({
      sitemap: {
        host: "https://x-hiring.hehehai.cn",
      },
    }),
    viteReact(),
    babel({ presets: [reactCompilerPreset()] }),
  ]),
  run: {
    tasks: {
      build: {
        command: "vp build",
        env: ["CLOUDFLARE_ENV"],
        input: [{ auto: true }, "!**/.wrangler/**", "!**/dist/**"],
        output: [{ auto: true }, "!**/.wrangler/**"],
      },
      "check-types": {
        command: "tsgo --noEmit",
      },
    },
  },
});

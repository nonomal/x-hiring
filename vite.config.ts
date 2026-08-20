import { defineConfig } from "vite-plus";

export default defineConfig({
  fmt: {},
  lint: {
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
    rules: { "vite-plus/prefer-vite-plus-imports": "error" },
    options: { typeAware: false, typeCheck: false },
  },
  check: {
    // Existing files still need a separate Oxfmt baseline migration.
    // Keep formatting opt-in until that intentionally creates a broad diff.
    fmt: false,
  },
  run: {
    tasks: {
      "build:all": {
        command: "vp run --filter ./apps/web... build",
      },
      "check-types:all": {
        command: "vp run --filter ./apps/web... check-types",
      },
    },
  },
});

import { defineConfig } from "vite";

export default defineConfig({
  root: "site",
  publicDir: "public",
  build: {
    outDir: "../dist/site",
    emptyOutDir: false,
    target: "es2022",
    rollupOptions: {
      input: {
        main: new URL("./site/index.html", import.meta.url).pathname,
        privacy: new URL("./site/privacy/index.html", import.meta.url).pathname,
        terms: new URL("./site/terms/index.html", import.meta.url).pathname,
      },
    },
  },
});

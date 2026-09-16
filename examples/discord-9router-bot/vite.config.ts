import { cloudflare } from "@cloudflare/vite-plugin";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [cloudflare()],
  build: {
    rolldownOptions: {
      external: ["zlib-sync"]
    }
  }
});

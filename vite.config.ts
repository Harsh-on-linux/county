import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  server: {
    watch: {
      ignored: [
        "**/.tools/**",
        "**/.npm-cache/**",
        "**/android/**",
        "**/test-results/**",
        "**/design/motion-previews/**",
      ],
    },
  },
  test: { environment: "node", include: ["src/**/*.test.ts"] },
} as any);

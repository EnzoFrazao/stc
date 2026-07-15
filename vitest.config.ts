import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    include: ["src/**/*.behavior.test.{ts,tsx}"],
    css: true,
    // Os fluxos completos exercitam várias telas com userEvent e ficam pouco acima
    // do padrão de 5 s no Windows; preserve uma margem sem mascarar travamentos.
    testTimeout: 10_000,
  },
});

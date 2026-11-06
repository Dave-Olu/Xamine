import type { Config } from "tailwindcss";

// Brand tokens live here. To change the look of the whole app, edit only this file.
// Purple and gold are the Xamine / BLI brand colors.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: "#5b2a9e", dark: "#2e1065", soft: "#f1e9fb" },
        gold: { DEFAULT: "#f5b50a", soft: "#fff6d6" },
        ink: "#1a1033",
        muted: "#5d5878",
        line: "#e6e1f0",
        surface: "#f7f5fb",
        success: { DEFAULT: "#0b7d54", soft: "#e2f6ed" },
        danger: { DEFAULT: "#b42318", soft: "#fde8e8" },
      },
      fontFamily: { sans: ["Plus Jakarta Sans", "Arial", "sans-serif"] },
    },
  },
  plugins: [],
};
export default config;

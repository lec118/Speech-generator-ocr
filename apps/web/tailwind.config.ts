import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "../../packages/ui/src/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#6366f1",
          dark: "#4f46e5",
          light: "#818cf8"
        },
        secondary: {
          DEFAULT: "#a855f7",
          dark: "#9333ea"
        },
        accent: "#06b6d4",
        success: "#10b981",
        warning: "#f59e0b",
        error: "#ef4444"
      }
    }
  },
  plugins: []
};

export default config;

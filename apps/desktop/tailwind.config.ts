import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/renderer/**/*.{js,ts,jsx,tsx,html}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#1D4ED8",
          hover: "#1E40AF",
          light: "#DBEAFE",
        },
        accent: {
          DEFAULT: "#F59E0B",
          hover: "#D97706",
        },
        success: {
          DEFAULT: "#16A34A",
          hover: "#15803D",
          light: "#DCFCE7",
        },
        danger: {
          DEFAULT: "#DC2626",
          hover: "#B91C1C",
          light: "#FEE2E2",
        },
      },
    },
  },
  plugins: [],
};

export default config;

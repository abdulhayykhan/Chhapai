import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#1D4ED8",
          hover: "#1e40af",
          light: "#dbeafe",
        },
        accent: {
          DEFAULT: "#F59E0B",
          hover: "#d97706",
          light: "#fef3c7",
        },
        success: {
          DEFAULT: "#16A34A",
          hover: "#15803d",
          light: "#dcfce7",
        },
        danger: {
          DEFAULT: "#DC2626",
          hover: "#b91c1c",
          light: "#fee2e2",
        },
      },
    },
  },
  plugins: [],
};

export default config;

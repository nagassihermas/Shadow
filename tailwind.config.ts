import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#6B8F71", // vert sauge
          hover: "#5E7E63",
          light: "#7F9F84",
          subtle: "rgba(107, 143, 113, 0.15)",
        },
        secondary: {
          DEFAULT: "#B8A088", // beige argile
          hover: "#A78F77",
          light: "#C7B39E",
          subtle: "rgba(184, 160, 136, 0.15)",
        },
        background: "#1C1B1A", // gris pierre très sombre
        surface: {
          DEFAULT: "#282625", // gris chaud
          subtle: "#22201F",
          hover: "#34312F",
          border: "#3D3936",
          elevated: "#302E2C",
        },
        text: {
          DEFAULT: "#E8E4DD", // blanc cassé
          muted: "#8A8580", // gris moyen
          dim: "#5C5854",
        },
        success: {
          DEFAULT: "#5A7A5F", // vert sauge foncé
          subtle: "rgba(90, 122, 95, 0.15)",
        },
        danger: {
          DEFAULT: "#A6624F", // terracotta mat
          subtle: "rgba(166, 98, 79, 0.15)",
        },
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          '"Helvetica Neue"',
          "Arial",
          "sans-serif",
        ],
        serif: ['"Noto Serif"', "Georgia", "serif"],
      },
      borderRadius: {
        sm: "6px",
        DEFAULT: "10px",
        md: "12px",
        lg: "16px",
        xl: "20px",
      },
    },
  },
  plugins: [],
};

export default config;

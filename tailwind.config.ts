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
          DEFAULT: "#2EB872", // émeraude
          hover: "#249A5E",
          light: "#4FD08F",
          subtle: "rgba(46, 184, 114, 0.14)",
        },
        secondary: {
          DEFAULT: "#D4A24C", // or
          hover: "#BC8C3A",
          light: "#E3BB72",
          subtle: "rgba(212, 162, 76, 0.14)",
        },
        background: "#0E1110", // vert-noir neutre
        surface: {
          DEFAULT: "#161B19",
          subtle: "#121614",
          hover: "#1E2522",
          border: "#2A332F",
          elevated: "#1C2320",
        },
        text: {
          DEFAULT: "#F2F4F3",
          muted: "#9AA7A1",
          dim: "#66726C", // décoratif ou grande taille uniquement (3,5:1)
        },
        success: {
          DEFAULT: "#3FA66B",
          subtle: "rgba(63, 166, 107, 0.15)",
        },
        danger: {
          DEFAULT: "#E5604D",
          subtle: "rgba(229, 96, 77, 0.15)",
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

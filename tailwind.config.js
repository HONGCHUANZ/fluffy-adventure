/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: { primary: "#f5f5f7", secondary: "#ffffff" },
        card: { DEFAULT: "#ffffff", hover: "#f0f0f5" },
        text: { primary: "#1a1a2e", secondary: "#6b7280" },
        accent: { DEFAULT: "#6c63ff", hover: "#5a52e0" },
        danger: "#ff6b6b",
        success: "#22c55e",
        warning: "#f59e0b",
      },
    },
  },
  plugins: [],
};

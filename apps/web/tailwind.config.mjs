import typography from "@tailwindcss/typography";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: "rgb(var(--club-primary) / <alpha-value>)",
          "primary-dark": "rgb(var(--club-primary-dark) / <alpha-value>)",
          secondary: "rgb(var(--club-secondary) / <alpha-value>)",
          accent: "rgb(var(--club-accent) / <alpha-value>)",
          ink: "rgb(var(--club-ink) / <alpha-value>)",
          paper: "rgb(var(--club-paper) / <alpha-value>)",
          muted: "rgb(var(--club-muted) / <alpha-value>)",
        },
      },
      fontFamily: {
        sans: ['"Inter Variable"', "Inter", "system-ui", "sans-serif"],
        display: ['"Barlow Condensed"', "Impact", "sans-serif"],
      },
      container: {
        center: true,
        padding: {
          DEFAULT: "1rem",
          sm: "1.5rem",
          lg: "2rem",
        },
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.6s ease-out both",
      },
    },
  },
  plugins: [typography],
};

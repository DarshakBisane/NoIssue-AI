/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          beige: "#DDD0C8",
          "beige-light": "#F7F4F0",
          "beige-surface": "#EFEAE4",
          "beige-border": "#D5C8BD",
          "beige-dark": "#B8A799",
          dark: "#323232",
          "dark-soft": "#464646",
          "dark-muted": "#6E6A66",
          charcoal: "#1F1F1F",
          accent: "#7A6555",
          "accent-dark": "#4C3D32"
        },
        status: {
          supported: {
            bg: "#EBF5ED",
            text: "#1E5832",
            border: "#C2E2C8"
          },
          partial: {
            bg: "#FEF7E6",
            text: "#8E5B10",
            border: "#FAD899"
          },
          conflict: {
            bg: "#FDF0F0",
            text: "#9E2323",
            border: "#F5BABA"
          },
          insufficient: {
            bg: "#F2EFEB",
            text: "#5E564F",
            border: "#D6CECB"
          },
          review: {
            bg: "#F4EEFD",
            text: "#5E2596",
            border: "#DEC8FB"
          },
          resolved: {
            bg: "#EBF3FB",
            text: "#1A4971",
            border: "#B7D6F3"
          }
        }
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "-apple-system", "sans-serif"],
        display: ["var(--font-outfit)", "system-ui", "-apple-system", "sans-serif"],
      },
      boxShadow: {
        subtle: "0 1px 3px 0 rgba(50, 50, 50, 0.04), 0 1px 2px -1px rgba(50, 50, 50, 0.04)",
        card: "0 4px 12px -2px rgba(50, 50, 50, 0.05), 0 2px 6px -2px rgba(50, 50, 50, 0.03)",
        elevated: "0 12px 32px -4px rgba(50, 50, 50, 0.08), 0 4px 12px -2px rgba(50, 50, 50, 0.04)",
      }
    },
  },
  plugins: [],
};

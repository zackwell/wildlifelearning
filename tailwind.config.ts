import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        np: {
          paper: "var(--np-paper)",
          peach: "var(--np-peach)",
          terracotta: "var(--np-terracotta)",
          cream: "var(--np-cream)",
          brand: "var(--np-brand-line)",
          cta: "var(--np-cta)",
          "cta-hover": "var(--np-cta-hover)",
          "cta-ink": "var(--np-cta-ink)",
          "welcome-brand": "var(--np-welcome-brand)",
          "welcome-title": "var(--np-welcome-title)",
        },
      },
      fontFamily: {
        sans: [
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "PingFang SC",
          "Hiragino Sans GB",
          "Microsoft YaHei",
          "Noto Sans SC",
          "sans-serif",
        ],
        mono: [
          "ui-monospace",
          "Cascadia Mono",
          "Segoe UI Mono",
          "Consolas",
          "monospace",
        ],
      },
    },
  },
  plugins: [],
} satisfies Config;

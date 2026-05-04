import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          base: "var(--color-bg-base)",
          surface: "var(--color-bg-surface)",
          elevated: "var(--color-bg-elevated)",
          overlay: "var(--color-bg-overlay)",
        },
        border: {
          DEFAULT: "var(--color-border)",
          strong: "var(--color-border-strong)",
        },
        accent: {
          DEFAULT: "var(--color-accent)",
          muted: "var(--color-accent-muted)",
          hover: "var(--color-accent-hover)",
        },
        text: {
          primary: "var(--color-text-primary)",
          secondary: "var(--color-text-secondary)",
          muted: "var(--color-text-muted)",
        },
        success: "var(--color-success)",
        warning: "var(--color-warning)",
        error: "var(--color-error)",
        info: "var(--color-info)",
        template: "var(--color-template-tag)",
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      fontSize: {
        xs: ["11px", "16px"],
        sm: ["13px", "20px"],
        base: ["14px", "22px"],
        md: ["15px", "24px"],
        lg: ["18px", "28px"],
        xl: ["22px", "32px"],
        "2xl": ["28px", "36px"],
        "3xl": ["36px", "44px"],
      },
      borderRadius: {
        sm: "6px",
        md: "10px",
        lg: "16px",
      },
      boxShadow: {
        glow: "0 0 0 3px rgba(37,211,102,0.3)",
      },
    },
  },
  plugins: [],
};

export default config;

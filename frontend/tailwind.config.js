/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: 'rgb(var(--brand-surface-rgb) / <alpha-value>)',
          100: 'rgb(var(--brand-soft-rgb) / <alpha-value>)',
          200: 'rgb(var(--brand-soft-strong-rgb) / <alpha-value>)',
          300: '#adc1d2',
          400: '#7295b0',
          500: '#416c8d',
          600: '#285572',
          700: 'rgb(var(--brand-navy-rgb) / <alpha-value>)',
          800: 'rgb(var(--brand-navy-hover-rgb) / <alpha-value>)',
          900: 'rgb(var(--brand-navy-deep-rgb) / <alpha-value>)',
        },
        sand: {
          50: 'rgb(var(--brand-sand-soft-rgb) / <alpha-value>)',
          100: '#f3e7ce',
          200: '#ead5ac',
          300: 'rgb(var(--brand-sand-hover-rgb) / <alpha-value>)',
          400: 'rgb(var(--brand-sand-rgb) / <alpha-value>)',
          500: '#c59e4e',
          600: '#97702b',
          700: 'rgb(var(--brand-sand-ink-rgb) / <alpha-value>)',
        },
        // Đây là dòng quan trọng nhất để sửa lỗi của bạn
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
}

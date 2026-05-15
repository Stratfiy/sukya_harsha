/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
    theme: {
        extend: {
            fontFamily: {
                serif: ['"Instrument Serif"', "serif"],
                sans: ['"Outfit"', "sans-serif"],
                mono: ['"JetBrains Mono"', "monospace"],
            },
            borderRadius: {
                lg: "var(--radius)",
                md: "calc(var(--radius) - 2px)",
                sm: "calc(var(--radius) - 4px)",
            },
            colors: {
                mint: {
                    50: "#EEFBF3",
                    100: "#D4F5E2",
                    200: "#A8EBC2",
                    300: "#7DDFA2",
                    400: "#52D381",
                    500: "#34C472",
                    600: "#2AA760",
                    700: "#1F8A4D",
                    800: "#0A2518",
                },
                background: "hsl(var(--background))",
                foreground: "hsl(var(--foreground))",
                card: {
                    DEFAULT: "hsl(var(--card))",
                    foreground: "hsl(var(--card-foreground))",
                },
                popover: {
                    DEFAULT: "hsl(var(--popover))",
                    foreground: "hsl(var(--popover-foreground))",
                },
                primary: {
                    DEFAULT: "hsl(var(--primary))",
                    foreground: "hsl(var(--primary-foreground))",
                },
                secondary: {
                    DEFAULT: "hsl(var(--secondary))",
                    foreground: "hsl(var(--secondary-foreground))",
                },
                muted: {
                    DEFAULT: "hsl(var(--muted))",
                    foreground: "hsl(var(--muted-foreground))",
                },
                accent: {
                    DEFAULT: "hsl(var(--accent))",
                    foreground: "hsl(var(--accent-foreground))",
                },
                destructive: {
                    DEFAULT: "hsl(var(--destructive))",
                    foreground: "hsl(var(--destructive-foreground))",
                },
                border: "hsl(var(--border))",
                input: "hsl(var(--input))",
                ring: "hsl(var(--ring))",
            },
            keyframes: {
                "accordion-down": { from: { height: "0" }, to: { height: "var(--radix-accordion-content-height)" } },
                "accordion-up": { from: { height: "var(--radix-accordion-content-height)" }, to: { height: "0" } },
                float: {
                    "0%, 100%": { transform: "translateY(0)" },
                    "50%": { transform: "translateY(-12px)" },
                },
                "float-slow": {
                    "0%, 100%": { transform: "translateY(0)" },
                    "50%": { transform: "translateY(-18px)" },
                },
                "fade-up": {
                    "0%": { opacity: "0", transform: "translateY(20px)" },
                    "100%": { opacity: "1", transform: "translateY(0)" },
                },
                "glow-pulse": {
                    "0%, 100%": { boxShadow: "0 0 20px rgba(52, 196, 114, 0.4)" },
                    "50%": { boxShadow: "0 0 36px rgba(52, 196, 114, 0.75)" },
                },
            },
            animation: {
                "accordion-down": "accordion-down 0.2s ease-out",
                "accordion-up": "accordion-up 0.2s ease-out",
                float: "float 5s ease-in-out infinite",
                "float-slow": "float-slow 8s ease-in-out infinite",
                "fade-up": "fade-up 0.7s ease-out both",
                "glow-pulse": "glow-pulse 3s ease-in-out infinite",
            },
        },
    },
    plugins: [require("tailwindcss-animate")],
};

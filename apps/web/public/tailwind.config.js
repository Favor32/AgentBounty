/** @type {import('tailwindcss').Config} */
const config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        void:    "#080B0F",
        surface: "#0D1117",
        panel:   "#111820",
        border:  "#1C2A3A",
        neon:    "#00FF94",
        amber:   "#FFB800",
        red:     "#FF3B3B",
        blue:    "#3B82F6",
        dim:     "#4A6580",
        muted:   "#7A9AB5",
        body:    "#B8D0E8",
        bright:  "#E8F4FF",
      },
      fontFamily: {
        mono:    ["'JetBrains Mono'", "'Fira Code'", "monospace"],
        display: ["'Space Mono'", "monospace"],
      },
      animation: {
        "pulse-neon": "pulseNeon 2s ease-in-out infinite",
        "scan":       "scan 8s linear infinite",
        "flicker":    "flicker 0.15s infinite",
        "slide-up":   "slideUp 0.4s ease-out",
        "fade-in":    "fadeIn 0.3s ease-out",
        "blink":      "blink 1s step-end infinite",
        "spin-slow":  "spin 4s linear infinite",
      },
      keyframes: {
        pulseNeon: {
          "0%, 100%": { boxShadow: "0 0 4px #00FF94, 0 0 12px #00FF9440" },
          "50%":      { boxShadow: "0 0 8px #00FF94, 0 0 24px #00FF9480" },
        },
        scan: {
          "0%":   { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100vh)" },
        },
        flicker: {
          "0%, 100%": { opacity: "1" },
          "50%":      { opacity: "0.85" },
        },
        slideUp: {
          "0%":   { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%":      { opacity: "0" },
        },
      },
      backgroundImage: {
        "grid-pattern":
          "linear-gradient(rgba(0,255,148,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,148,0.03) 1px, transparent 1px)",
        "radial-glow":
          "radial-gradient(ellipse at 50% 0%, rgba(0,255,148,0.08) 0%, transparent 60%)",
      },
      backgroundSize: {
        "grid": "40px 40px",
      },
    },
  },
  plugins: [],
};

module.exports = config;
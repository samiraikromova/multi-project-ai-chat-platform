/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#d97757',
        secondary: '#F9F9F8', // Background
        border: '#E5E5E3',    // Subtle border
        text: '#1C1C1A',      // Main text
        muted: '#8C8C85',  // Secondary text
      },
    },
  },
  plugins: [],
}
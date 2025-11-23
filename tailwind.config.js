/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
            },
            colors: {
                'neon-blue': '#22d3ee',
                'neon-purple': '#a855f7',
                'neon-pink': '#ec4899',
                'neon-green': '#10b981',
                'neon-orange': '#f97316',
            },
            boxShadow: {
                'neon-blue': '0 0 20px rgba(34, 211, 238, 0.5)',
                'neon-purple': '0 0 20px rgba(168, 85, 247, 0.5)',
                'neon-pink': '0 0 20px rgba(236, 72, 153, 0.5)',
                'neon-green': '0 0 20px rgba(16, 185, 129, 0.5)',
            },
            backdropBlur: {
                xs: '2px',
            }
        },
    },
    plugins: [],
}

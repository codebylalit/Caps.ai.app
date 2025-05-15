module.exports = {
  content: [
    "./App.js", // Add your app files here
    "./screens/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      letterSpacing: {
        1: '0.025em',
        2: '0.05em',
        3: '0.075em',
      },
      spacing: {
        'x-2': '0.5rem',
        'x-4': '1rem',
        'y-4': '1rem',
      }
    },
  },
  plugins: [],
};

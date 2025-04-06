/** @type {import('tailwindcss').Config} */
module.exports = {
  // Ripristina 'content' se necessario, aggiungendo i percorsi rilevanti
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./app/**/*.{js,jsx,ts,tsx}", // Assicurati che questo percorso sia corretto
    "./components/**/*.{js,jsx,ts,tsx}", // Includiamo la nuova cartella
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
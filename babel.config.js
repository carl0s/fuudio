module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"], // O la tua configurazione esistente
    plugins: [
      "nativewind/babel", // Aggiunto il plugin NativeWind
    ],
  };
};

module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      // "nativewind/babel", // Rimosso
      "react-native-reanimated/plugin", // DEVE essere l'ultimo plugin
    ],
  };
}; 
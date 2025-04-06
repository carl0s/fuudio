/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

const tintColorLight = '#011d22';
const tintColorDark = '#ff4500';

export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#fcfcfc',
    background: '#011d22',
    tint: tintColorDark,
    icon: '#fcfcfc',
    tabIconDefault: '#fcfcfc',
    tabIconSelected: tintColorDark,
  },
};

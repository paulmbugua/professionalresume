// apps/mobile/src/theme/useTWColors.ts
import tw from '../../tailwind';
import { useThemeMode } from './ThemeProvider';

export default function useTWColors() {
  const { scheme } = useThemeMode();
  return {
    textPrimary: tw.color(scheme === 'dark' ? 'white' : 'lightText')!,
    textSecondary: tw.color(scheme === 'dark' ? 'darkPlaceholder' : 'lightSecondary')!,
    inputBg: tw.color(scheme === 'dark' ? 'darkElevated' : 'lightElevated')!,
    border: tw.color(scheme === 'dark' ? 'darkBorder' : 'lightBorder')!,
    placeholder: tw.color(scheme === 'dark' ? 'darkPlaceholder' : 'lightSecondary')!,
    card: tw.color(scheme === 'dark' ? 'darkCard' : 'lightCard')!,
    bg: tw.color(scheme === 'dark' ? 'darkBg' : 'lightBg')!,
  };
}

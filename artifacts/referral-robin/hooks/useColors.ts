import { useColorScheme } from 'react-native';
import colors from '@/constants/colors';

export function useColors() {
  const scheme = useColorScheme() === 'light' ? 'light' : 'dark';
  return { ...colors[scheme], radius: colors.radius };
}

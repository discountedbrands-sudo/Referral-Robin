import { useColorScheme } from 'react-native';
import colors from '@/constants/colors';

export function useColors() {
  const scheme = useColorScheme() ?? 'dark';
  return { ...colors[scheme as keyof typeof colors], radius: colors.radius };
}

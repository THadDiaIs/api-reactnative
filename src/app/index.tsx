import { router } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';

import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { authService } from '@/services';

export default function IndexRoute() {
  const theme = useTheme();

  useEffect(() => {
    let active = true;
    authService.restaurarSesion().then((hasSession) => {
      if (!active) return;
      router.replace(hasSession ? '/listado-pedidos' : '/login');
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <ThemedView style={styles.container}>
      <ActivityIndicator size="large" color={theme.text} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

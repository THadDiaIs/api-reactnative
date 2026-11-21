import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { authService } from '@/services';

export function LoginScreen() {
  const theme = useTheme();
  const [nombreUsuario, setNombreUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    const user = nombreUsuario.trim();
    if (!user || !password) {
      Alert.alert('Datos incompletos', 'Ingresa tu usuario y contraseña.');
      return;
    }

    setLoading(true);
    try {
      await authService.login(user, password);
      router.replace('/listado-pedidos');
    } catch (err) {
      Alert.alert(
        'Error al iniciar sesión',
        err instanceof Error ? err.message : 'Error de conexión'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardView}>
          <ThemedView style={styles.headerSection}>
            <ThemedText type="title" style={styles.title}>
              StockNex
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.subtitle}>
              Inicia sesión para gestionar pedidos
            </ThemedText>
          </ThemedView>

          <ThemedView type="backgroundElement" style={styles.formCard}>
            <View style={styles.fieldGroup}>
              <ThemedText type="smallBold">Usuario</ThemedText>
              <TextInput
                value={nombreUsuario}
                onChangeText={setNombreUsuario}
                placeholder="pedidos"
                placeholderTextColor={theme.textSecondary}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
                style={[
                  styles.input,
                  { backgroundColor: theme.background, color: theme.text },
                ]}
              />
            </View>

            <View style={styles.fieldGroup}>
              <ThemedText type="smallBold">Contraseña</ThemedText>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="••••••"
                placeholderTextColor={theme.textSecondary}
                secureTextEntry
                editable={!loading}
                onSubmitEditing={handleLogin}
                style={[
                  styles.input,
                  { backgroundColor: theme.background, color: theme.text },
                ]}
              />
            </View>

            <Pressable
              disabled={loading}
              onPress={handleLogin}
              style={({ pressed }) => [
                styles.submitButton,
                loading && styles.disabled,
                pressed && styles.pressed,
              ]}>
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <ThemedText style={styles.submitText}>Iniciar sesión</ThemedText>
              )}
            </Pressable>
          </ThemedView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    flexDirection: 'row',
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    maxWidth: MaxContentWidth,
    justifyContent: 'center',
  },
  keyboardView: {
    gap: Spacing.four,
  },
  headerSection: {
    alignItems: 'center',
    gap: Spacing.one,
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
  },
  formCard: {
    padding: Spacing.four,
    borderRadius: Spacing.four,
    gap: Spacing.three,
  },
  fieldGroup: {
    gap: Spacing.one,
  },
  input: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
    fontSize: 16,
  },
  submitButton: {
    backgroundColor: '#2563EB',
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    alignItems: 'center',
    marginTop: Spacing.one,
  },
  submitText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.5,
  },
});


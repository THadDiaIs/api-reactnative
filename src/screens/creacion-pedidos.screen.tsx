import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { apiService, InventarioItem, pedidosService } from '@/services';

function formatCantidad(valor: number): string {
  return String(valor).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function CreacionPedidosScreen() {
  const theme = useTheme();
  const [cliente, setCliente] = useState('');
  const [inventario, setInventario] = useState<InventarioItem[]>([]);
  const [cantidades, setCantidades] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargarInventario = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const data = await pedidosService.getInventario();
      setInventario(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el inventario.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargarInventario(false);
    }, [cargarInventario])
  );

  useEffect(() => {
    const desconectar = apiService.conectarTiempoReal({
      StockBajo: () => {
        cargarInventario(true);
      },
    });
    return desconectar;
  }, [cargarInventario]);

  const ajustarCantidad = (item: InventarioItem, delta: number) => {
    setCantidades((prev) => {
      const actual = prev[item.inventarioId] ?? 0;
      const siguiente = Math.max(0, Math.min(item.existencia, actual + delta));
      if (siguiente === 0) {
        const { [item.inventarioId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [item.inventarioId]: siguiente };
    });
  };

  const totalEstimado = useMemo(() => {
    return inventario.reduce((acc, item) => {
      const qty = cantidades[item.inventarioId] ?? 0;
      return acc + qty * item.precio;
    }, 0);
  }, [inventario, cantidades]);

  const detallesSeleccionados = useMemo(() => {
    return Object.entries(cantidades)
      .filter(([, cantidad]) => cantidad > 0)
      .map(([inventarioId, cantidad]) => ({
        inventarioId: Number(inventarioId),
        cantidad,
      }));
  }, [cantidades]);

  const handleCrearPedido = async () => {
    const clienteLimpio = cliente.trim();
    if (!clienteLimpio) {
      Alert.alert('Datos incompletos', 'Ingresa el nombre del cliente.');
      return;
    }
    if (detallesSeleccionados.length === 0) {
      Alert.alert('Datos incompletos', 'Selecciona al menos un producto.');
      return;
    }

    setSubmitting(true);
    try {
      const orden = await pedidosService.crearOrden({
        cliente: clienteLimpio,
        detalles: detallesSeleccionados,
      });

      setCliente('');
      setCantidades({});
      await cargarInventario(true);

      Alert.alert(
        'Pedido creado',
        `Orden ${orden.numeroOrden} creada en estado ${orden.estado}.`,
        [
          {
            text: 'Ver pedidos',
            onPress: () => router.navigate('/listado-pedidos'),
          },
          { text: 'OK' },
        ]
      );
    } catch (err) {
      Alert.alert('Error al crear pedido', err instanceof Error ? err.message : 'Error de conexión');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ThemedView style={styles.headerSection}>
          <ThemedText type="subtitle" style={styles.title}>
            Creación de pedidos
          </ThemedText>

          <TextInput
            value={cliente}
            onChangeText={setCliente}
            placeholder="Nombre del cliente"
            placeholderTextColor={theme.textSecondary}
            style={[
              styles.input,
              {
                backgroundColor: theme.backgroundElement,
                color: theme.text,
              },
            ]}
          />
        </ThemedView>

        {loading && !refreshing ? (
          <View style={styles.centerState}>
            <ActivityIndicator size="large" color={theme.text} />
            <ThemedText type="small" themeColor="textSecondary">
              Cargando productos disponibles...
            </ThemedText>
          </View>
        ) : error ? (
          <ThemedView type="backgroundElement" style={styles.stateCard}>
            <ThemedText type="smallBold" style={styles.errorText}>
              {error}
            </ThemedText>
            <Pressable
              onPress={() => cargarInventario(false)}
              style={({ pressed }) => [
                styles.actionButton,
                { backgroundColor: theme.backgroundSelected },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="smallBold">Reintentar</ThemedText>
            </Pressable>
          </ThemedView>
        ) : (
          <FlatList
            data={inventario}
            keyExtractor={(item) => String(item.inventarioId)}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => cargarInventario(true)} />
            }
            ListEmptyComponent={
              <ThemedView type="backgroundElement" style={styles.stateCard}>
                <ThemedText type="small" themeColor="textSecondary">
                  No hay productos en inventario.
                </ThemedText>
              </ThemedView>
            }
            renderItem={({ item }) => {
              const cantidad = cantidades[item.inventarioId] ?? 0;
              const sinStock = item.existencia <= 0;

              return (
                <ThemedView type="backgroundElement" style={styles.productCard}>
                  <View style={styles.productInfo}>
                    <ThemedText type="smallBold">{item.nombre}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      Q {item.precio.toFixed(2)} · Disponible: {formatCantidad(item.existencia)}
                    </ThemedText>
                  </View>

                  <View style={styles.qtyControls}>
                    <Pressable
                      disabled={cantidad <= 0}
                      onPress={() => ajustarCantidad(item, -1)}
                      style={({ pressed }) => [
                        styles.qtyButton,
                        { backgroundColor: theme.backgroundSelected },
                        cantidad <= 0 && styles.disabled,
                        pressed && styles.pressed,
                      ]}>
                      <ThemedText type="smallBold">-</ThemedText>
                    </Pressable>

                    <ThemedText type="smallBold" style={styles.qtyValue}>
                      {cantidad}
                    </ThemedText>

                    <Pressable
                      disabled={sinStock || cantidad >= item.existencia}
                      onPress={() => ajustarCantidad(item, 1)}
                      style={({ pressed }) => [
                        styles.qtyButton,
                        { backgroundColor: theme.backgroundSelected },
                        (sinStock || cantidad >= item.existencia) && styles.disabled,
                        pressed && styles.pressed,
                      ]}>
                      <ThemedText type="smallBold">+</ThemedText>
                    </Pressable>
                  </View>
                </ThemedView>
              );
            }}
          />
        )}

        <ThemedView type="backgroundElement" style={styles.footerBar}>
          <View>
            <ThemedText type="small" themeColor="textSecondary">
              Total estimado
            </ThemedText>
            <ThemedText type="smallBold">Q {totalEstimado.toFixed(2)}</ThemedText>
          </View>

          <Pressable
            disabled={submitting}
            onPress={handleCrearPedido}
            style={({ pressed }) => [
              styles.submitButton,
              { backgroundColor: theme.primary },
              submitting && styles.disabled,
              pressed && styles.pressed,
            ]}>
            {submitting ? (
              <ActivityIndicator size="small" color={theme.onPrimary} />
            ) : (
              <ThemedText style={[styles.submitText, { color: theme.onPrimary }]}>
                Crear pedido
              </ThemedText>
            )}
          </Pressable>
        </ThemedView>
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
    paddingTop: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.three,
    gap: Spacing.three,
    maxWidth: MaxContentWidth,
  },
  headerSection: {
    gap: Spacing.two,
    paddingTop: Spacing.two,
  },
  title: {
    textAlign: 'center',
  },
  input: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
    fontSize: 16,
  },
  listContent: {
    gap: Spacing.two,
    paddingBottom: Spacing.two,
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.two,
  },
  productInfo: {
    flex: 1,
    gap: Spacing.half,
  },
  qtyControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  qtyButton: {
    width: 32,
    height: 32,
    borderRadius: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyValue: {
    minWidth: 24,
    textAlign: 'center',
  },
  footerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  submitButton: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
    minWidth: 130,
    alignItems: 'center',
  },
  submitText: {
    fontWeight: '700',
    fontSize: 14,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  stateCard: {
    padding: Spacing.four,
    borderRadius: Spacing.three,
    alignItems: 'center',
    gap: Spacing.three,
  },
  errorText: {
    color: '#DC2626',
    textAlign: 'center',
  },
  actionButton: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.4,
  },
});

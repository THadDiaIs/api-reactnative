import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { apiService, authService, Orden, OrdenEstado, pedidosService } from '@/services';

type FiltroEstado = 'Todas' | OrdenEstado;

const FILTROS: FiltroEstado[] = ['Todas', 'Pendiente', 'Despachada', 'Rechazada'];

const ESTADO_COLORS: Record<OrdenEstado, { bg: string; text: string }> = {
  Pendiente: { bg: '#FEF08A', text: '#854D0E' },
  Despachada: { bg: '#DCFCE7', text: '#166534' },
  Rechazada: { bg: '#FEE2E2', text: '#991B1B' },
};

function formatFecha(fechaIso: string): string {
  const date = new Date(fechaIso);
  if (Number.isNaN(date.getTime())) return fechaIso;
  return date.toLocaleString();
}

export function ListadoPedidosScreen() {
  const theme = useTheme();
  const [ordenes, setOrdenes] = useState<Orden[]>([]);
  const [filtro, setFiltro] = useState<FiltroEstado>('Todas');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargarOrdenes = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const estadoParam = filtro === 'Todas' ? undefined : filtro;
        const data = await pedidosService.getOrdenes(estadoParam);
        setOrdenes(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudieron cargar los pedidos.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [filtro]
  );

  useFocusEffect(
    useCallback(() => {
      cargarOrdenes(false);
    }, [cargarOrdenes])
  );

  useEffect(() => {
    const desconectar = apiService.conectarTiempoReal({
      OrdenCreada: (datos) => {
        const orden = datos as Orden;
        if (filtro !== 'Todas' && orden.estado !== filtro) return;
        setOrdenes((lista) => [orden, ...lista.filter((o) => o.ordenId !== orden.ordenId)]);
      },
      OrdenActualizada: (datos) => {
        const orden = datos as Orden;
        setOrdenes((lista) => {
          const actualizada = lista.map((o) => (o.ordenId === orden.ordenId ? orden : o));
          if (filtro !== 'Todas') {
            return actualizada.filter((o) => o.estado === filtro);
          }
          return actualizada;
        });
      },
    });

    return desconectar;
  }, [filtro]);

  const toggleDetalle = (ordenId: number) => {
    setExpandedId((prev) => (prev === ordenId ? null : ordenId));
  };

  const handleLogout = async () => {
    await authService.logout();
    router.replace('/login');
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.headerSection}>
          <View style={styles.titleRow}>
            <ThemedText type="subtitle" style={styles.title}>
              Listado de pedidos
            </ThemedText>
            <Pressable
              onPress={handleLogout}
              style={({ pressed }) => [
                styles.logoutButton,
                { backgroundColor: theme.backgroundElement },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="small" themeColor="textSecondary">
                Salir
              </ThemedText>
            </Pressable>
          </View>

          <View style={styles.filtrosRow}>
            {FILTROS.map((item) => {
              const selected = filtro === item;
              return (
                <Pressable
                  key={item}
                  onPress={() => setFiltro(item)}
                  style={({ pressed }) => [
                    styles.filtroChip,
                    {
                      backgroundColor: selected ? theme.backgroundSelected : theme.backgroundElement,
                    },
                    pressed && styles.pressed,
                  ]}>
                  <ThemedText
                    type="small"
                    themeColor={selected ? 'text' : 'textSecondary'}
                    style={selected ? styles.filtroTextSelected : undefined}>
                    {item}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </ThemedView>

        {loading && !refreshing ? (
          <View style={styles.centerState}>
            <ActivityIndicator size="large" color={theme.text} />
            <ThemedText type="small" themeColor="textSecondary">
              Cargando pedidos...
            </ThemedText>
          </View>
        ) : error ? (
          <ThemedView type="backgroundElement" style={styles.stateCard}>
            <ThemedText type="smallBold" style={styles.errorText}>
              {error}
            </ThemedText>
            <Pressable
              onPress={() => cargarOrdenes(false)}
              style={({ pressed }) => [
                styles.retryButton,
                { backgroundColor: theme.backgroundSelected },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="smallBold">Reintentar</ThemedText>
            </Pressable>
          </ThemedView>
        ) : (
          <FlatList
            data={ordenes}
            keyExtractor={(item) => String(item.ordenId)}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => cargarOrdenes(true)} />
            }
            ListEmptyComponent={
              <ThemedView type="backgroundElement" style={styles.stateCard}>
                <ThemedText type="small" themeColor="textSecondary">
                  No hay pedidos registrados.
                </ThemedText>
              </ThemedView>
            }
            renderItem={({ item }) => {
              const badgeStyle = ESTADO_COLORS[item.estado] ?? ESTADO_COLORS.Pendiente;
              const isExpanded = expandedId === item.ordenId;

              return (
                <Pressable onPress={() => toggleDetalle(item.ordenId)}>
                  <ThemedView type="backgroundElement" style={styles.card}>
                    <View style={styles.cardHeader}>
                      <ThemedText type="smallBold">{item.numeroOrden}</ThemedText>
                      <View style={[styles.badge, { backgroundColor: badgeStyle.bg }]}>
                        <ThemedText style={[styles.badgeText, { color: badgeStyle.text }]}>
                          {item.estado}
                        </ThemedText>
                      </View>
                    </View>

                    <ThemedText type="default">{item.cliente}</ThemedText>

                    <View style={styles.cardFooter}>
                      <ThemedText type="small" themeColor="textSecondary">
                        {formatFecha(item.fechaMod)}
                      </ThemedText>
                      <ThemedText type="smallBold">Q {item.total.toFixed(2)}</ThemedText>
                    </View>

                    {isExpanded && item.detalles?.length > 0 && (
                      <View style={[styles.detallesBox, { borderTopColor: theme.backgroundSelected }]}>
                        {item.detalles.map((det) => (
                          <View key={det.detalleOrdenId} style={styles.detalleRow}>
                            <ThemedText type="small" style={styles.detalleNombre}>
                              {det.cantidad}x {det.nombre}
                            </ThemedText>
                            <ThemedText type="small" themeColor="textSecondary">
                              Q {det.total.toFixed(2)}
                            </ThemedText>
                          </View>
                        ))}
                      </View>
                    )}
                  </ThemedView>
                </Pressable>
              );
            }}
          />
        )}
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logoutButton: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.three,
  },
  title: {
    textAlign: 'left',
  },
  filtrosRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  filtroChip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.four,
  },
  filtroTextSelected: {
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.7,
  },
  listContent: {
    gap: Spacing.two,
    paddingBottom: Spacing.four,
  },
  card: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.one,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Spacing.two,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.one,
  },
  detallesBox: {
    marginTop: Spacing.two,
    paddingTop: Spacing.two,
    borderTopWidth: 1,
    gap: Spacing.one,
  },
  detalleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  detalleNombre: {
    flex: 1,
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
  retryButton: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
  },
});

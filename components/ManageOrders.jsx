import { Feather } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { confirmSalesOrder, fetchSalesOrders } from '../services/orderManagementService';
import { formatSalesPrice, getSalesProductById } from '../services/salesCatalog';

const GREEN = '#145B40';
const STATES = {
  Pendiente: { label: 'Pendientes', icon: 'clock', color: '#9D6718', background: '#FBF0D9' },
  Completado: { label: 'Completados', icon: 'check-circle', color: GREEN, background: '#E9F2E3' },
  Cancelado: { label: 'Cancelados', icon: 'x-circle', color: '#9A4B2A', background: '#F7EAE3' },
};
const shortNumber = (id) => id.slice(0, 8).toUpperCase();
const amount = (value) => Number.isFinite(value) ? formatSalesPrice(value) : 'Por confirmar';
const orderDate = (date) => new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'America/Santiago' }).format(new Date(date));

function StatusBadge({ status }) {
  const state = STATES[status];
  return <View style={[styles.statusBadge, { backgroundColor: state.background }]}><Feather accessible={false} name={state.icon} size={12} color={state.color} /><Text style={[styles.statusLabel, { color: state.color }]}>{status}</Text></View>;
}

function ProductPhoto({ item, large = false }) {
  const product = getSalesProductById(item.product_id);
  return (
    <View style={[styles.photoFrame, large && styles.photoLarge]}>
      {product
        ? <Image source={product.image} accessibilityLabel={item.product_name} contentFit="contain" style={styles.photo} />
        : <Feather accessible={false} name="package" size={large ? 25 : 17} color="#9A8464" />}
    </View>
  );
}

function ConfirmOrderButton({ order, onConfirm, confirmingId, disabled }) {
  const busy = confirmingId === order.id;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Confirmar pedido ${shortNumber(order.id)} de ${order.player_name}`} accessibilityState={{ disabled, busy }} disabled={disabled} onPress={() => onConfirm(order)} style={({ pressed }) => [styles.primaryButton, disabled && styles.disabled, pressed && styles.pressed]}>
      {busy ? <ActivityIndicator color="#FFFCF4" /> : <Feather accessible={false} name="check-circle" size={18} color="#FFFCF4" />}
      <Text style={styles.primaryLabel}>{busy ? 'Confirmando…' : 'Confirmar Pedido'}</Text>
    </Pressable>
  );
}

function ConfirmationNotice({ notice }) {
  if (!notice) return null;
  return <View style={[styles.confirmationNotice, notice.error && styles.confirmationError]}><Feather accessible={false} name={notice.error ? 'alert-circle' : 'check-circle'} size={18} color={notice.error ? '#9A4B2A' : GREEN} /><Text accessibilityRole={notice.error ? 'alert' : undefined} accessibilityLiveRegion="polite" style={[styles.confirmationText, notice.error && styles.errorText]}>{notice.message}</Text></View>;
}

function OrderCard({ order, onPress, onConfirm, confirmingId, confirmationDisabled }) {
  const units = order.items.reduce((sum, item) => sum + item.quantity, 0);
  return (
    <View style={styles.orderCard}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Ver pedido ${shortNumber(order.id)} de ${order.player_name}`} accessibilityHint="Muestra todos los productos, cantidades y precios del pedido" onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
      <View style={styles.spacedRow}>
        <Text style={styles.orderNumber}>#{shortNumber(order.id)}</Text>
        <StatusBadge status={order.status} />
      </View>
      <View style={styles.playerRow}>
        <View style={styles.avatar}><Feather accessible={false} name="user" size={21} color={GREEN} /></View>
        <View style={styles.flex}>
          <Text numberOfLines={2} style={styles.playerName}>{order.player_name}</Text>
          <Text style={styles.playerLeague}>{order.league_name}</Text>
        </View>
      </View>
      <View style={styles.dateRow}><Feather accessible={false} name="calendar" size={12} color="#95846E" /><Text style={styles.date}>{orderDate(order.created_at)}</Text></View>
      <View style={styles.productsPreview}>
        {order.items.slice(0, 2).map((item) => (
          <View key={item.product_id} style={styles.previewRow}>
            <ProductPhoto item={item} />
            <Text numberOfLines={2} style={styles.previewName}><Text style={styles.previewQuantity}>{item.quantity} × </Text>{item.product_name}</Text>
            <Text style={styles.previewPrice}>{amount(item.subtotal)}</Text>
          </View>
        ))}
        {order.items.length > 2 && <Text style={styles.moreProducts}>+ {order.items.length - 2} {order.items.length === 3 ? 'producto más' : 'productos más'}</Text>}
      </View>
      <View style={styles.cardFooter}>
        <View style={styles.flex}><Text style={styles.totalCaption}>Total · {units} {units === 1 ? 'unidad' : 'unidades'}</Text><Text style={styles.cardTotal}>{amount(order.total)}</Text></View>
        <View style={styles.detailLink}><Text style={styles.detailLinkLabel}>Ver detalle</Text><Feather accessible={false} name="arrow-up-right" size={16} color={GREEN} /></View>
      </View>
      </Pressable>
      {order.status === 'Pendiente' && <View style={styles.cardAction}><ConfirmOrderButton order={order} onConfirm={onConfirm} confirmingId={confirmingId} disabled={confirmationDisabled} /></View>}
    </View>
  );
}

function OrderDetails({ order, onClose, onConfirm, confirmingId, confirmationDisabled, notice }) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  if (!order) return null;
  return (
    <Modal visible transparent animationType="fade" accessibilityLabel="Detalle del pedido" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <Pressable accessible={false} onPress={onClose} style={StyleSheet.absoluteFill} />
        <View accessibilityViewIsModal style={[styles.detailPanel, { height: Math.min(760, height - insets.top - insets.bottom - 32) }]}>
          <View style={styles.detailHeader}>
            <View style={styles.flex}><Text accessibilityRole="header" style={styles.detailTitle}>Detalle del pedido</Text><Text style={styles.orderNumber}>#{shortNumber(order.id)}</Text></View>
            <Pressable accessibilityRole="button" accessibilityLabel="Cerrar detalle del pedido" onPress={onClose} style={({ pressed }) => [styles.detailClose, pressed && styles.pressed]}><Feather accessible={false} name="x" size={22} color="#713C24" /></Pressable>
          </View>
          <ScrollView style={styles.flex} contentContainerStyle={styles.detailContent} showsVerticalScrollIndicator={false}>
            <View style={styles.detailPlayer}>
              <View style={styles.playerRow}><View style={styles.avatar}><Feather accessible={false} name="user-check" size={22} color={GREEN} /></View><View style={styles.flex}><Text style={styles.totalCaption}>Solicitado por</Text><Text style={styles.playerName}>{order.player_name}</Text><Text style={styles.playerLeague}>{order.league_name}</Text></View></View>
              <View style={styles.detailMeta}><View style={styles.dateRow}><Feather accessible={false} name="calendar" size={12} color="#95846E" /><Text style={styles.date}>{orderDate(order.created_at)}</Text></View><StatusBadge status={order.status} /></View>
            </View>
            <Text accessibilityRole="header" style={styles.sectionTitle}>Productos solicitados</Text>
            {order.items.map((item) => {
              const savings = Number.isFinite(item.unit_price) && Number.isFinite(item.subtotal) ? item.unit_price * item.quantity - item.subtotal : 0;
              return (
                <View key={item.product_id} style={styles.detailItem}>
                  <ProductPhoto item={item} large />
                  <View style={styles.flex}>
                    <Text style={styles.itemName}>{item.product_name}</Text>
                    <Text style={styles.itemQuantity}>{item.quantity} × {Number.isFinite(item.unit_price) ? formatSalesPrice(item.unit_price) : 'Precio por confirmar'}</Text>
                    <Text accessibilityLabel={`Subtotal de ${item.product_name}: ${amount(item.subtotal)}`} style={styles.itemSubtotal}>{amount(item.subtotal)}</Text>
                    {savings > 0 && <Text style={styles.savings}>Promoción aplicada · Ahorro {formatSalesPrice(savings)}</Text>}
                  </View>
                </View>
              );
            })}
          </ScrollView>
          <View style={styles.detailFooter}>
            <View style={styles.spacedRow}><Text style={styles.sectionTitle}>Total del pedido</Text><Text accessibilityLabel={`Total del pedido: ${amount(order.total)}`} style={styles.cardTotal}>{amount(order.total)}</Text></View>
            {notice?.orderId === order.id && <ConfirmationNotice notice={notice} />}
            {order.status === 'Pendiente' && <ConfirmOrderButton order={order} onConfirm={onConfirm} confirmingId={confirmingId} disabled={confirmationDisabled} />}
            <Pressable accessibilityRole="button" accessibilityLabel="Volver a los pedidos" onPress={onClose} style={({ pressed }) => [styles.primaryButton, order.status === 'Pendiente' && styles.secondaryButton, pressed && styles.pressed]}><Feather accessible={false} name="arrow-left" size={18} color={order.status === 'Pendiente' ? GREEN : '#FFFCF4'} /><Text style={[styles.primaryLabel, order.status === 'Pendiente' && styles.secondaryLabel]}>Volver a los pedidos</Text></Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function ErrorNotice({ message, onRetry }) {
  return <View style={styles.errorNotice}><Feather accessible={false} name="alert-circle" size={24} color="#9A4B2A" /><Text accessibilityRole="alert" style={styles.errorText}>{message}</Text><Pressable accessibilityRole="button" accessibilityLabel="Reintentar carga de pedidos" onPress={onRetry} style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}><Text style={styles.retryLabel}>Reintentar</Text></Pressable></View>;
}

export default function ManageOrders() {
  const isFocused = useIsFocused();
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState(null);
  const [matchingCount, setMatchingCount] = useState(0);
  const [status, setStatus] = useState(null);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [moreError, setMoreError] = useState('');
  const [hasMore, setHasMore] = useState(false);
  const [nextOffset, setNextOffset] = useState(0);
  const [reload, setReload] = useState(0);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [confirmingId, setConfirmingId] = useState(null);
  const [confirmationNotice, setConfirmationNotice] = useState(null);
  const confirmationLock = useRef(false);
  const versionRef = useRef(0);
  const listRef = useRef(null);
  const refreshRequested = useRef(false);
  const moreController = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const redirectIfNeeded = useCallback((failure) => {
    if (failure.code !== 'ADMIN_AUTH_REQUIRED') return false;
    setSelectedOrder(null);
    router.replace({ pathname: '/admin-key', params: { next: 'orders' } });
    return true;
  }, []);

  useEffect(() => {
    if (!isFocused) return;
    const controller = new AbortController();
    const version = ++versionRef.current;
    let cancelled = false;
    moreController.current?.abort();
    if (!refreshRequested.current) { setLoading(true); setOrders([]); }
    refreshRequested.current = false;
    setLoadingMore(false);
    setError('');
    setMoreError('');
    fetchSalesOrders({ status, search: query, signal: controller.signal })
      .then((result) => {
        if (cancelled || version !== versionRef.current) return;
        setOrders(result.orders); setStats(result.stats); setMatchingCount(result.matching_count);
        setHasMore(result.has_more); setNextOffset(result.orders.length);
      })
      .catch((failure) => {
        if (!cancelled && version === versionRef.current && !redirectIfNeeded(failure)) setError(failure.message || 'No se pudieron cargar los pedidos. Intenta nuevamente.');
      })
      .finally(() => {
        if (!cancelled && version === versionRef.current) { setLoading(false); setRefreshing(false); }
      });
    return () => { cancelled = true; controller.abort(); moreController.current?.abort(); };
  }, [isFocused, status, query, reload, redirectIfNeeded]);

  const refresh = () => {
    if (refreshing || loading) return;
    refreshRequested.current = true;
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
    setRefreshing(true);
    setReload((value) => value + 1);
  };
  const retry = () => setReload((value) => value + 1);
  const confirmOrder = async (order) => {
    if (confirmationLock.current || order.status !== 'Pendiente') return;
    confirmationLock.current = true;
    setConfirmingId(order.id);
    setConfirmationNotice(null);
    try {
      const receipt = await confirmSalesOrder(order.id);
      setOrders((current) => current.map((item) => item.id === receipt.id ? { ...item, status: receipt.status } : item));
      setSelectedOrder((current) => current?.id === receipt.id ? { ...current, status: receipt.status } : current);
      setConfirmationNotice({ orderId: order.id, message: `Pedido #${shortNumber(order.id)} confirmado. Estado: Completado.`, error: false });
      // Reload the filtered first page so counts and offsets remain consistent.
      refreshRequested.current = true;
      moreController.current?.abort();
      listRef.current?.scrollToOffset({ offset: 0, animated: false });
      setRefreshing(true);
      setReload((value) => value + 1);
    } catch (failure) {
      if (!redirectIfNeeded(failure)) {
        setConfirmationNotice({ orderId: order.id, message: failure.message || 'No se pudo confirmar el pedido. Intenta nuevamente.', error: true });
        listRef.current?.scrollToOffset({ offset: 0, animated: false });
      }
    } finally {
      confirmationLock.current = false;
      setConfirmingId(null);
    }
  };
  const loadMore = async () => {
    if (loadingMore || loading || refreshing || !hasMore) return;
    const version = versionRef.current;
    const controller = new AbortController();
    moreController.current = controller;
    setLoadingMore(true); setMoreError('');
    try {
      const result = await fetchSalesOrders({ status, search: query, offset: nextOffset, signal: controller.signal });
      if (controller.signal.aborted || version !== versionRef.current) return;
      setOrders((current) => [...current, ...result.orders.filter((order) => !current.some((existing) => existing.id === order.id))]);
      setStats(result.stats); setMatchingCount(result.matching_count); setHasMore(result.has_more); setNextOffset(nextOffset + result.orders.length);
    } catch (failure) {
      if (!controller.signal.aborted && version === versionRef.current && !redirectIfNeeded(failure)) setMoreError(failure.message || 'No se pudieron cargar más pedidos.');
    } finally {
      if (!controller.signal.aborted && version === versionRef.current) setLoadingMore(false);
    }
  };

  return (
    <View style={styles.screen}>
      {isFocused && <StatusBar style="light" />}
      <View style={styles.frame}>
        <LinearGradient colors={['#855335', '#713C24', '#63311E']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <SafeAreaView edges={['top', 'left', 'right']}>
            <View style={styles.header}>
              <View style={styles.headerRow}>
                <Pressable accessibilityRole="button" accessibilityLabel="Volver al administrador" onPress={() => router.dismissTo('/admin-home')} style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}><Feather accessible={false} name="arrow-left" size={23} color="#FFFCF4" /></Pressable>
                <Text accessibilityRole="header" style={styles.title}>Gestión de Pedidos</Text>
                <Pressable accessibilityRole="button" accessibilityLabel="Actualizar pedidos" disabled={loading || refreshing} onPress={refresh} style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}>{refreshing ? <ActivityIndicator color="#FFFCF4" /> : <Feather accessible={false} name="refresh-cw" size={20} color="#FFFCF4" />}</Pressable>
              </View>
              <Text style={styles.subtitle}>Las solicitudes de tu academia, en un solo lugar.</Text>
            </View>
          </SafeAreaView>
        </LinearGradient>
        <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.sheet}>
          <FlatList
            ref={listRef}
            data={loading ? [] : orders}
            keyExtractor={(order) => order.id}
            renderItem={({ item }) => <OrderCard order={item} onPress={() => setSelectedOrder(item)} onConfirm={confirmOrder} confirmingId={confirmingId} confirmationDisabled={Boolean(confirmingId) || loading || refreshing} />}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            initialNumToRender={5}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[GREEN]} tintColor={GREEN} />}
            ListHeaderComponent={(
              <View>
                <View style={styles.statsRow}>
                  <View style={styles.statCard}><View style={styles.statHeading}><Feather accessible={false} name="shopping-bag" size={16} color="#8B5937" /><Text style={styles.statLabel}>Pedidos registrados</Text></View><Text style={styles.statValue}>{stats?.total ?? '—'}</Text></View>
                  <View style={styles.statCard}><View style={styles.statHeading}><Feather accessible={false} name="clock" size={16} color={GREEN} /><Text style={styles.statLabel}>Pendientes</Text></View><Text style={[styles.statValue, { color: GREEN }]}>{stats?.pending ?? '—'}</Text></View>
                </View>
                <View style={styles.searchField}><Feather accessible={false} name="search" size={18} color="#95846E" /><TextInput accessibilityLabel="Buscar pedidos" placeholder="Buscar jugador, producto o pedido" placeholderTextColor="#9B8C76" value={search} onChangeText={setSearch} maxLength={100} autoCorrect={false} returnKeyType="search" selectionColor={GREEN} style={styles.searchInput} />{search ? <Pressable accessibilityRole="button" accessibilityLabel="Limpiar búsqueda de pedidos" onPress={() => setSearch('')} hitSlop={8}><Feather accessible={false} name="x-circle" size={18} color="#95846E" /></Pressable> : null}</View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
                  {[null, ...Object.keys(STATES)].map((value) => <Pressable key={value || 'all'} accessibilityRole="button" accessibilityLabel={value ? STATES[value].label : 'Todos los pedidos'} accessibilityState={{ selected: status === value }} aria-pressed={status === value} onPress={() => setStatus(value)} style={({ pressed }) => [styles.filter, status === value && styles.filterSelected, pressed && styles.pressed]}><Text style={[styles.filterLabel, status === value && styles.filterLabelSelected]}>{value ? STATES[value].label : 'Todos'}</Text></Pressable>)}
                </ScrollView>
                <View style={styles.resultsHeading}><Text accessibilityRole="header" style={styles.sectionTitle}>Pedidos realizados</Text><Text accessibilityLiveRegion="polite" style={styles.resultCount}>{loading ? 'Cargando…' : `${orders.length} de ${matchingCount}`}</Text></View>
                <ConfirmationNotice notice={confirmationNotice} />
                {error && orders.length > 0 && <ErrorNotice message={error} onRetry={retry} />}
              </View>
            )}
            ListEmptyComponent={loading ? <View accessibilityRole="progressbar" accessibilityLabel="Cargando pedidos" style={styles.emptyState}><ActivityIndicator color={GREEN} /><Text style={styles.emptyDescription}>Cargando pedidos…</Text></View> : error ? <ErrorNotice message={error} onRetry={retry} /> : <View style={styles.emptyState}><View style={styles.emptyIcon}><Feather accessible={false} name="clipboard" size={32} color={GREEN} /></View><Text style={styles.emptyTitle}>{query || status ? 'No encontramos pedidos' : 'Todavía no hay pedidos'}</Text><Text style={styles.emptyDescription}>{query || status ? 'Prueba con otro nombre, producto o estado.' : 'Las solicitudes confirmadas aparecerán aquí.'}</Text></View>}
            ListFooterComponent={!loading && orders.length > 0 ? <View style={styles.listFooter}>{moreError ? <Text accessibilityRole="alert" style={styles.errorText}>{moreError}</Text> : null}{hasMore && <Pressable accessibilityRole="button" accessibilityLabel="Cargar más pedidos" disabled={loadingMore} onPress={loadMore} style={({ pressed }) => [styles.loadMore, pressed && styles.pressed]}>{loadingMore ? <ActivityIndicator color={GREEN} /> : <Feather accessible={false} name="plus" size={18} color={GREEN} />}<Text style={styles.retryLabel}>{loadingMore ? 'Cargando…' : 'Cargar más pedidos'}</Text></Pressable>}</View> : null}
          />
        </SafeAreaView>
      </View>
      <OrderDetails order={selectedOrder} onClose={() => setSelectedOrder(null)} onConfirm={confirmOrder} confirmingId={confirmingId} confirmationDisabled={Boolean(confirmingId) || loading || refreshing} notice={confirmationNotice} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', backgroundColor: '#F2EDDF' },
  frame: { flex: 1, width: '100%', maxWidth: 560, backgroundColor: '#713C24' },
  flex: { flex: 1, minWidth: 0 },
  header: { paddingTop: Platform.OS === 'web' ? 24 : 8, paddingHorizontal: 16, paddingBottom: 42 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerButton: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.10)' },
  title: { flex: 1, fontSize: 22, lineHeight: 28, fontWeight: '700', color: '#FFFCF4', textAlign: 'center' },
  subtitle: { fontSize: 12, lineHeight: 18, textAlign: 'center', color: '#EBDACB', marginTop: 10 },
  sheet: { flex: 1, marginTop: -24, borderTopLeftRadius: 30, borderTopRightRadius: 30, backgroundColor: '#F8F5EB', overflow: 'hidden' },
  listContent: { flexGrow: 1, padding: 16, paddingBottom: 24 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 15 },
  statCard: { flex: 1, minWidth: 0, padding: 14, borderRadius: 18, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EBE5D8' },
  statHeading: { minHeight: 32, flexDirection: 'row', alignItems: 'center', gap: 7 },
  statLabel: { flex: 1, fontSize: 11, lineHeight: 16, color: '#89785F' },
  statValue: { fontSize: 29, lineHeight: 37, color: '#713C24', fontWeight: '700', marginTop: 5 },
  searchField: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 12, borderWidth: 1, borderColor: '#E4DDCD', borderRadius: 14, backgroundColor: '#FFFFFF' },
  searchInput: { flex: 1, minWidth: 0, height: 46, fontSize: 13, color: '#34412F', ...Platform.select({ web: { outlineStyle: 'none' } }) },
  filters: { gap: 8, paddingVertical: 14 },
  filter: { minHeight: 38, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14, borderRadius: 13, borderWidth: 1, borderColor: '#E2DFD1', backgroundColor: '#FFFCF5' },
  filterSelected: { borderColor: GREEN, backgroundColor: GREEN },
  filterLabel: { color: '#817560', fontSize: 12, lineHeight: 18, fontWeight: '600' },
  filterLabelSelected: { color: '#FFFCF4' },
  resultsHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 12 },
  sectionTitle: { fontSize: 15, lineHeight: 22, fontWeight: '700', color: '#34412F' },
  resultCount: { fontSize: 11, lineHeight: 17, color: '#95846E' },
  orderCard: { padding: 14, borderRadius: 21, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E8E2D5', marginBottom: 14, ...Platform.select({ web: { boxShadow: '0px 4px 15px rgba(112,85,46,0.04)' }, default: { shadowColor: '#70552E', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 1 } }) },
  spacedRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  orderNumber: { fontSize: 11, lineHeight: 17, fontWeight: '600', color: '#9A8464', letterSpacing: 0.6 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 9, flexShrink: 0 },
  statusLabel: { fontSize: 10, lineHeight: 15, fontWeight: '600' },
  playerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  avatar: { width: 40, height: 40, borderRadius: 14, backgroundColor: '#EAF1E2', alignItems: 'center', justifyContent: 'center' },
  playerName: { color: '#274634', fontSize: 16, lineHeight: 22, fontWeight: '700' },
  playerLeague: { color: '#95846E', fontSize: 11, lineHeight: 17, marginTop: 2 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, flexShrink: 1 },
  date: { color: '#95846E', fontSize: 11, lineHeight: 17, flexShrink: 1 },
  productsPreview: { borderRadius: 13, backgroundColor: '#F9F7F0', padding: 10, gap: 9, marginTop: 12 },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  photoFrame: { width: 34, height: 40, borderRadius: 8, borderWidth: 1, borderColor: '#E9E2D4', backgroundColor: '#FFFFFF', padding: 3, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  photo: { width: '100%', height: '100%' },
  photoLarge: { width: 64, height: 78, borderRadius: 12, padding: 5 },
  previewName: { flex: 1, minWidth: 0, color: '#676D60', fontSize: 12, lineHeight: 17 },
  previewQuantity: { color: GREEN, fontWeight: '700' },
  previewPrice: { color: GREEN, fontSize: 11, lineHeight: 17, fontWeight: '600', maxWidth: 92, textAlign: 'right' },
  moreProducts: { color: '#8B795E', fontSize: 11, lineHeight: 17, marginLeft: 42 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 13 },
  cardAction: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#EEE8DC' },
  confirmationNotice: { flexDirection: 'row', alignItems: 'center', gap: 9, padding: 12, borderRadius: 13, backgroundColor: '#E9F2E3', marginBottom: 10 },
  confirmationError: { backgroundColor: '#FFF0E6' },
  confirmationText: { flex: 1, fontSize: 12, lineHeight: 18, color: GREEN },
  totalCaption: { fontSize: 10, lineHeight: 16, color: '#95846E' },
  cardTotal: { color: '#713C24', fontSize: 22, lineHeight: 29, fontWeight: '700', flexShrink: 1 },
  detailLink: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 11, padding: 10, backgroundColor: '#EDF4E8' },
  detailLinkLabel: { fontSize: 12, lineHeight: 18, fontWeight: '600', color: GREEN },
  listFooter: { paddingTop: 2, gap: 12 },
  loadMore: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, borderRadius: 14, borderWidth: 1, borderColor: '#D5E0CA', backgroundColor: '#EAF1E2' },
  errorNotice: { alignItems: 'center', padding: 22, gap: 14, borderRadius: 18, backgroundColor: '#FFF8F0', marginBottom: 14 },
  errorText: { fontSize: 13, lineHeight: 20, color: '#9A4B2A', textAlign: 'center' },
  retryButton: { minHeight: 44, borderRadius: 12, paddingHorizontal: 20, backgroundColor: '#E6EDDD', justifyContent: 'center' },
  retryLabel: { color: GREEN, fontSize: 13, lineHeight: 19, fontWeight: '600' },
  emptyState: { paddingVertical: 38, paddingHorizontal: 18, alignItems: 'center', gap: 14 },
  emptyIcon: { width: 74, height: 74, borderRadius: 25, backgroundColor: '#E6EDDD', alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { color: '#4D3829', fontSize: 18, lineHeight: 25, fontWeight: '700', textAlign: 'center' },
  emptyDescription: { color: '#89785F', fontSize: 13, lineHeight: 20, textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(43,30,20,0.44)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  detailPanel: { width: '100%', maxWidth: 480, borderRadius: 25, backgroundColor: '#FFFCF5', overflow: 'hidden' },
  detailHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 18, borderBottomWidth: 1, borderBottomColor: '#EAE2D1' },
  detailTitle: { fontSize: 20, lineHeight: 27, fontWeight: '700', color: '#30261D', marginBottom: 3 },
  detailClose: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F2EADB' },
  detailContent: { padding: 18, gap: 14 },
  detailPlayer: { paddingHorizontal: 12, paddingBottom: 12, borderRadius: 15, backgroundColor: '#F2F5E9' },
  detailMeta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 8 },
  detailItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 12, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EBE4D8', borderRadius: 15 },
  itemName: { color: '#34412F', fontSize: 14, lineHeight: 20, fontWeight: '600' },
  itemQuantity: { color: '#89785F', fontSize: 12, lineHeight: 18, marginTop: 5 },
  itemSubtotal: { color: GREEN, fontSize: 16, lineHeight: 23, fontWeight: '700', marginTop: 5 },
  savings: { fontSize: 10, lineHeight: 16, color: GREEN, marginTop: 4 },
  detailFooter: { padding: 18, gap: 14, borderTopWidth: 1, borderTopColor: '#EAE2D1', backgroundColor: '#FAF6EC' },
  primaryButton: { minHeight: 50, borderRadius: 14, backgroundColor: GREEN, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, paddingHorizontal: 14 },
  primaryLabel: { color: '#FFFCF4', fontSize: 14, lineHeight: 21, fontWeight: '700' },
  secondaryButton: { backgroundColor: '#EAF1E2' },
  secondaryLabel: { color: GREEN },
  disabled: { opacity: 0.55 },
  pressed: { opacity: 0.72 },
});

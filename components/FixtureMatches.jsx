import { Feather } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { fetchLeagues } from '../services/adminService';
import { fetchFixturesByLeague, formatFixtureDate } from '../services/fixtureService';

const GREEN = '#145B40';

function FixtureCard({ fixture }) {
  return (
    <View style={styles.card}>
      <Text style={styles.matchTitle}>
        {fixture.player_a_name}<Text style={styles.versus}> vs </Text>{fixture.player_b_name}
      </Text>
      <View style={styles.cardDetails}>
        <View style={styles.schedule}>
          <View style={styles.detail}>
            <Feather accessible={false} name="calendar" size={14} color="#8E8E7A" />
            <Text style={styles.detailText}>{formatFixtureDate(fixture.match_date, { month: 'short' })}</Text>
          </View>
          <View style={styles.detail}>
            <Feather accessible={false} name="clock" size={14} color="#8E8E7A" />
            <Text style={styles.detailText}>{fixture.match_time.slice(0, 5)} hrs.</Text>
          </View>
        </View>
        <View style={styles.status}>
          <Feather accessible={false} name="check-circle" size={12} color={GREEN} />
          <Text style={styles.statusText}>Confirmado</Text>
        </View>
      </View>
    </View>
  );
}

function RetryButton({ onPress }) {
  return <Pressable accessibilityRole="button" accessibilityLabel="Reintentar carga de partidos" onPress={onPress} style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}><Feather accessible={false} name="refresh-cw" size={16} color={GREEN} /><Text style={styles.retryText}>Reintentar</Text></Pressable>;
}

export default function FixtureMatches() {
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const [leagues, setLeagues] = useState([]);
  const [leagueId, setLeagueId] = useState(null);
  const [leaguesLoading, setLeaguesLoading] = useState(true);
  const [leaguesError, setLeaguesError] = useState('');
  const [fixtures, setFixtures] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState('');
  const requestRef = useRef(null);
  const nextOffsetRef = useRef(0);
  const moreAttemptRef = useRef(false);
  const listRef = useRef(null);
  const selectedLeague = leagues.find((league) => league.id === leagueId);
  const busy = leaguesLoading || loading;

  const loadLeagues = useCallback(async () => {
    setLeaguesLoading(true);
    setLeaguesError('');
    try {
      const available = await fetchLeagues();
      setLeagues(available);
      setLeagueId((current) => available.some((league) => league.id === current) ? current : available[0]?.id ?? null);
    } catch {
      setLeaguesError('No se pudieron cargar las ligas. Revisa tu conexión e intenta nuevamente.');
    } finally {
      setLeaguesLoading(false);
    }
  }, []);

  const loadFixtures = useCallback(async ({ refresh = false, more = false } = {}) => {
    if (!leagueId) return;
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    moreAttemptRef.current = more;
    setLoading(!refresh && !more);
    setRefreshing(refresh);
    setLoadingMore(more);
    setError('');
    try {
      const page = await fetchFixturesByLeague(leagueId, {
        offset: more ? nextOffsetRef.current : 0,
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      setFixtures((current) => more
        ? [...new Map([...current, ...page.fixtures].map((fixture) => [fixture.id, fixture])).values()]
        : page.fixtures);
      setHasMore(page.hasMore);
      nextOffsetRef.current = page.nextOffset;
    } catch (failure) {
      if (!controller.signal.aborted) setError(failure.message || 'No se pudieron cargar los partidos. Intenta nuevamente.');
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    }
  }, [leagueId]);

  useEffect(() => { loadLeagues(); }, [loadLeagues]);
  useEffect(() => {
    if (!isFocused) return;
    loadFixtures();
    return () => requestRef.current?.abort();
  }, [isFocused, loadFixtures]);

  const selectLeague = (id) => {
    if (id === leagueId) return;
    requestRef.current?.abort();
    setFixtures([]);
    setError('');
    setLoading(true);
    setHasMore(false);
    nextOffsetRef.current = 0;
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
    setLeagueId(id);
  };
  const retry = () => leaguesError ? loadLeagues() : loadFixtures();

  return (
    <View style={styles.screen}>
      {isFocused && <StatusBar style="light" />}
      <View style={styles.frame}>
        <LinearGradient colors={['#277048', '#145B40', '#00472F']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <SafeAreaView edges={['top', 'left', 'right']}>
            <View style={styles.header}>
              <Pressable accessibilityRole="button" accessibilityLabel="Volver al inicio" onPress={() => router.canGoBack() ? router.back() : router.replace('/login')} style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}>
                <Feather accessible={false} name="arrow-left" size={23} color="#FFFCF4" />
              </Pressable>
              <View style={styles.headerCopy}>
                <Text accessibilityRole="header" style={styles.title}>Fixture de Partidos</Text>
                <Text style={styles.subtitle}>Encuentra tu próximo encuentro.</Text>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel="Actualizar partidos" accessibilityState={{ disabled: busy || refreshing || loadingMore }} disabled={busy || refreshing || loadingMore} onPress={() => leaguesError || !leagueId ? loadLeagues() : loadFixtures({ refresh: true })} style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}>
                <Feather accessible={false} name="refresh-cw" size={20} color="#E9EACD" />
              </Pressable>
            </View>
          </SafeAreaView>
        </LinearGradient>

        <LinearGradient colors={['#FAF8F1', '#F5F0E2']} style={styles.sheet}>
          <SafeAreaView edges={['left', 'right']} style={styles.flex}>
            {!!leagues.length && <View style={styles.filters}>
              <ScrollView horizontal accessibilityRole="tablist" accessibilityLabel="Filtrar partidos por liga" showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContent}>
                {leagues.map((league) => <Pressable
                  key={league.id}
                  accessibilityRole="tab"
                  accessibilityLabel={league.name}
                  accessibilityState={{ selected: league.id === leagueId }}
                  aria-selected={league.id === leagueId}
                  onPress={() => selectLeague(league.id)}
                  style={({ pressed }) => [styles.leagueTab, league.id === leagueId && styles.leagueTabSelected, pressed && styles.pressed]}>
                  <Text style={[styles.leagueTabText, league.id === leagueId && styles.leagueTabTextSelected]}>{league.name}</Text>
                </Pressable>)}
              </ScrollView>
            </View>}
            {busy ? <View style={styles.state}><ActivityIndicator accessibilityLabel="Cargando partidos" size="large" color={GREEN} /><Text style={styles.stateDescription}>Cargando encuentros…</Text></View> : leaguesError ? (
              <View accessibilityRole="alert" style={styles.state}><Feather accessible={false} name="wifi-off" size={32} color="#914621" /><Text style={styles.errorText}>{leaguesError}</Text><RetryButton onPress={retry} /></View>
            ) : <FlatList
              ref={listRef}
              data={fixtures}
              keyExtractor={(fixture) => fixture.id}
              renderItem={({ item }) => <FixtureCard fixture={item} />}
              contentContainerStyle={[styles.listContent, { paddingBottom: Math.max(insets.bottom, 24) }]}
              showsVerticalScrollIndicator={false}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadFixtures({ refresh: true })} colors={[GREEN]} tintColor={GREEN} />}
              ListHeaderComponent={fixtures.length ? <Text style={styles.timeZone}>Horarios de Chile</Text> : null}
              ListEmptyComponent={error ? <View accessibilityRole="alert" style={styles.state}><Feather accessible={false} name="wifi-off" size={32} color="#914621" /><Text style={styles.errorText}>{error}</Text><RetryButton onPress={retry} /></View> : <View style={styles.state}>
                <View style={styles.emptyIcon}><Feather accessible={false} name="calendar" size={32} color={GREEN} /></View>
                <Text style={styles.stateTitle}>{selectedLeague ? 'Sin partidos por ahora' : 'Todavía no hay ligas'}</Text>
                <Text style={styles.stateDescription}>{selectedLeague ? `Aún no hay encuentros registrados en ${selectedLeague.name}.` : 'Las ligas aparecerán aquí cuando estén disponibles.'}</Text>
              </View>}
              ListFooterComponent={fixtures.length ? <View style={styles.listFooter}>
                {!!error && <View accessibilityRole="alert" style={styles.footerError}><Text style={styles.errorText}>{error}</Text><RetryButton onPress={() => loadFixtures({ more: moreAttemptRef.current })} /></View>}
                {hasMore && !error && <Pressable accessibilityRole="button" accessibilityLabel="Ver más partidos" accessibilityState={{ disabled: loadingMore || refreshing, busy: loadingMore }} disabled={loadingMore || refreshing} onPress={() => loadFixtures({ more: true })} style={({ pressed }) => [styles.moreButton, pressed && styles.pressed]}>
                  {loadingMore ? <ActivityIndicator size="small" color={GREEN} /> : <Feather accessible={false} name="chevron-down" size={17} color={GREEN} />}
                  <Text style={styles.retryText}>{loadingMore ? 'Cargando…' : 'Ver más partidos'}</Text>
                </Pressable>}
              </View> : null}
            />}
          </SafeAreaView>
        </LinearGradient>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', backgroundColor: '#F5F0E2' },
  frame: { flex: 1, width: '100%', maxWidth: 560, backgroundColor: GREEN },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: Platform.OS === 'web' ? 30 : 14, paddingBottom: 36 },
  headerButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: 'rgba(255, 252, 244, 0.08)' },
  headerCopy: { flex: 1, minWidth: 0 },
  title: { color: '#FFFCF4', fontSize: 22, lineHeight: 28, fontWeight: '700' },
  subtitle: { color: '#D4E2CB', fontSize: 11, lineHeight: 16, marginTop: 4 },
  sheet: { flex: 1, marginTop: -20, borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden' },
  filters: { marginTop: 14, marginHorizontal: 16, marginBottom: 4, borderRadius: 15, borderWidth: 1, borderColor: '#E7E4D7', backgroundColor: '#F1EFE6', padding: 4 },
  filterContent: { flexGrow: 1, gap: 4 },
  leagueTab: { flex: 1, minWidth: 90, minHeight: 44, paddingHorizontal: 18, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', borderRadius: 11 },
  leagueTabSelected: { backgroundColor: GREEN },
  leagueTabText: { fontSize: 14, fontWeight: '700', color: '#8E8D7C' },
  leagueTabTextSelected: { color: '#FFFFFF' },
  listContent: { flexGrow: 1, paddingHorizontal: 16, paddingTop: 12, gap: 12 },
  timeZone: { color: '#9A917B', fontSize: 11, marginBottom: -2, marginHorizontal: 4 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16, gap: 14, borderWidth: 1, borderColor: '#F1EDDF', minHeight: 104,
    ...Platform.select({ web: { boxShadow: '0px 4px 14px rgba(103, 68, 25, 0.035)' }, default: { shadowColor: '#674419', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.035, shadowRadius: 8, elevation: 1 } }),
  },
  matchTitle: { color: '#30362B', fontSize: 15, lineHeight: 22, fontWeight: '700' },
  versus: { color: '#858B73', fontWeight: '500' },
  cardDetails: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  schedule: { flex: 1, minWidth: 110, flexDirection: 'row', flexWrap: 'wrap', columnGap: 12, rowGap: 8 },
  detail: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailText: { color: '#797C6C', fontSize: 11, lineHeight: 16 },
  status: { backgroundColor: '#DCF0D9', borderRadius: 12, paddingHorizontal: 9, paddingVertical: 7, flexDirection: 'row', alignItems: 'center', gap: 5, flexShrink: 0 },
  statusText: { color: GREEN, fontSize: 11, lineHeight: 15, fontWeight: '700' },
  state: { flex: 1, minHeight: 240, alignItems: 'center', justifyContent: 'center', padding: 30, gap: 14 },
  emptyIcon: { width: 76, height: 76, backgroundColor: '#E9EFDF', alignItems: 'center', justifyContent: 'center', borderRadius: 25, marginBottom: 4 },
  stateTitle: { fontSize: 18, fontWeight: '700', color: '#34492C', textAlign: 'center' },
  stateDescription: { color: '#918671', fontSize: 13, lineHeight: 20, textAlign: 'center' },
  errorText: { color: '#914621', fontSize: 13, lineHeight: 20, textAlign: 'center' },
  retryButton: { minHeight: 44, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 13, backgroundColor: '#E8EFDF', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  retryText: { color: GREEN, fontSize: 13, fontWeight: '700' },
  listFooter: { alignItems: 'center', paddingVertical: 4 },
  footerError: { width: '100%', alignItems: 'center', gap: 10, padding: 16, borderRadius: 18, backgroundColor: '#FAEDE4' },
  moreButton: { minHeight: 48, paddingHorizontal: 22, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 14, backgroundColor: '#E8EFDF' },
  pressed: { opacity: 0.75 },
});

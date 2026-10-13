import { Feather } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  fetchLeagueStandings,
  isSupabaseConfigured,
} from '../services/resultService';
import { showUserAlert } from '../utils/alerts';

const GOLD_CUTOFF = 8;
const SILVER_CUTOFF = 16;
const GOLD = '#FFD51B';
const SILVER = '#179EFA';
const COLUMNS = [
  { label: '#', field: 'position', style: 'positionCell' },
  { label: 'Jugador', field: 'name', style: 'nameCell' },
  { label: 'Puntos', field: 'points', style: 'pointsCell' },
  { label: 'P. Jugados', field: 'played', style: 'playedCell' },
  { label: 'Pelotas', field: 'balls', style: 'ballsCell' },
];

function CupLegend({ label, color, scale }) {
  return (
    <View
      style={[
        styles.legendPill,
        {
          minHeight: 40 * scale,
          borderRadius: 20 * scale,
          borderColor: color,
          paddingHorizontal: 14 * scale,
          paddingVertical: 8 * scale,
          gap: 10 * scale,
        },
      ]}>
      <View
        accessible={false}
        style={[
          styles.legendDot,
          { width: 18 * scale, height: 18 * scale, backgroundColor: color },
        ]}
      />
      <Text style={[styles.legendText, { fontSize: 12 * scale }]}>{label}</Text>
    </View>
  );
}

function StandingRow({ player, index, scale, rowHeight }) {
  const classification = index < GOLD_CUTOFF
    ? 'Copa de Oro'
    : index < SILVER_CUTOFF
      ? 'Copa de Plata'
      : '';

  return (
    <View
      accessible
      accessibilityLabel={`Posición ${index + 1}, ${player.name}, ${player.points} puntos, ${player.played} partidos jugados, ${player.balls} pelotas${classification ? ', ' + classification : ''}`}
      style={[
        styles.tableRow,
        index % 2 === 1 && styles.alternateRow,
        { minHeight: rowHeight, paddingVertical: 4 * scale },
      ]}>
      <View
        accessible={false}
        style={[
          styles.classificationStripe,
          {
            width: 3 * scale,
            top: 4 * scale,
            bottom: 4 * scale,
            backgroundColor: index < GOLD_CUTOFF ? GOLD : index < SILVER_CUTOFF ? SILVER : 'transparent',
          },
        ]}
      />
      {COLUMNS.map(({ field, style }) => (
        <Text
          key={field}
          numberOfLines={field === 'name' ? 2 : 1}
          style={[
            styles.bodyCell,
            styles[style],
            field === 'name' && styles.playerName,
            field === 'points' && styles.pointsValue,
            {
              fontSize: 13 * scale,
              lineHeight: 17 * scale,
              paddingHorizontal: 3 * scale,
            },
          ]}>
          {field === 'position' ? index + 1 : player[field]}
        </Text>
      ))}
    </View>
  );
}

export default function LeagueStandings({ leagueId = 'B', backTo = '/login' }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const [hasMounted, setHasMounted] = useState(Platform.OS !== 'web');
  const [players, setPlayers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [tableBodyHeight, setTableBodyHeight] = useState(0);
  const scale = hasMounted
    ? Math.max(0.86, Math.min(width / 333, height / 659, 1.2))
    : 1;
  const headerControlSize = Math.max(44, 44 * scale);
  const leagueTitle = hasMounted ? `Liga ${leagueId}` : 'Liga';
  const rowHeight = Math.max(26 * scale, (tableBodyHeight - 4) / Math.max(players.length, 16));

  const loadStandings = useCallback(
    async ({ refreshing = false } = {}) => {
      if (!isSupabaseConfigured) {
        setPlayers([]);
        setIsLoading(false);
        return;
      }
      if (refreshing) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      try {
        const standings = await fetchLeagueStandings(leagueId);
        setPlayers(standings);
      } catch (error) {
        showUserAlert('No se pudo cargar la tabla', error.message);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [leagueId]
  );

  useEffect(() => {
    setHasMounted(true);
    loadStandings();
  }, [loadStandings]);

  return (
    <View style={styles.screen}>
      {isFocused && <StatusBar style="light" />}
      <View style={styles.frame}>
        <LinearGradient
          colors={['#164D3D', '#063B2D', '#053528']}
          start={{ x: 0, y: 1 }}
          end={{ x: 1, y: 0 }}>
          <Image
            source={require('../assets/images/league-header-accent.svg')}
            style={StyleSheet.absoluteFill}
            contentFit="fill"
            accessible={false}
            pointerEvents="none"
          />
          <SafeAreaView edges={['top', 'left', 'right']}>
            <View
              style={[
                styles.header,
                {
                  paddingTop: (Platform.OS === 'web' ? 40 : 14) * scale,
                  paddingBottom: 14 * scale,
                  paddingHorizontal: 14 * scale,
                  minHeight: 48 * scale,
                },
              ]}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Volver"
                accessibilityHint="Regresa a la pantalla anterior"
                onPress={() => router.replace(backTo)}
                style={({ pressed }) => [
                  styles.backButton,
                  { width: headerControlSize, height: headerControlSize },
                  pressed && styles.buttonPressed,
                ]}>
                <Feather accessible={false} name="arrow-left" size={24 * scale} color="#FFFDF3" />
              </Pressable>
              <Text
                accessibilityRole="header"
                style={[styles.title, { fontSize: 25 * scale, lineHeight: 32 * scale }]}>
                {leagueTitle}
              </Text>
              <View style={[styles.logoSlot, { width: headerControlSize }]}>
                <View
                  style={[
                    styles.logoBadge,
                    { width: 44 * scale, height: 44 * scale },
                  ]}>
                  <Image
                    source={require('../assets/images/logofs.png')}
                    accessibilityLabel="Academia de Tenis FS"
                    style={styles.logo}
                    contentFit="cover"
                  />
                </View>
              </View>
            </View>
          </SafeAreaView>
        </LinearGradient>

        <LinearGradient colors={['#FCF9EE', '#F4EEDC']} style={styles.contentSurface}>
          <SafeAreaView style={styles.contentSafeArea} edges={['left', 'right']}>
            <View
              style={[
                styles.container,
                {
                  paddingHorizontal: 12 * scale,
                  paddingBottom: Math.max(insets.bottom, 20 * scale),
                },
              ]}>
              <View style={styles.content}>
                <View
                  style={[
                    styles.legend,
                    { paddingTop: 12 * scale, paddingBottom: 14 * scale, gap: 12 * scale },
                  ]}>
                  <CupLegend label="Copa de Oro" color={GOLD} scale={scale} />
                  <CupLegend label="Copa de Plata" color={SILVER} scale={scale} />
                </View>

                <View
                  accessibilityLabel={hasMounted ? `Tabla de posiciones de la Liga ${leagueId}` : 'Tabla de posiciones'}
                  style={[styles.tableShell, { borderRadius: 16 * scale }]}>
                  <LinearGradient
                    colors={['#209D52', '#44B767']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.tableHeader, { minHeight: 36 * scale }]}>
                    {COLUMNS.map(({ label, field, style }) => (
                      <Text
                        key={field}
                        numberOfLines={1}
                        style={[
                          styles.headerCell,
                          styles[style],
                          { fontSize: 11 * scale, paddingHorizontal: 3 * scale },
                        ]}>
                        {label}
                      </Text>
                    ))}
                  </LinearGradient>

                  {isLoading ? (
                    <View style={styles.loadingState}>
                      <ActivityIndicator
                        accessibilityLabel={hasMounted ? `Cargando posiciones de Liga ${leagueId}` : 'Cargando posiciones'}
                        size="large"
                        color="#209D52"
                      />
                    </View>
                  ) : (
                    <ScrollView
                      style={styles.tableBody}
                      onLayout={({ nativeEvent }) => setTableBodyHeight(nativeEvent.layout.height)}
                      contentContainerStyle={styles.tableContent}
                      refreshControl={
                        <RefreshControl
                          refreshing={isRefreshing}
                          onRefresh={() => loadStandings({ refreshing: true })}
                          tintColor="#209D52"
                          colors={['#209D52']}
                        />
                      }
                      showsVerticalScrollIndicator={false}>
                      {players.map((player, index) => (
                        <StandingRow
                          key={player.id}
                          player={player}
                          index={index}
                          scale={scale}
                          rowHeight={rowHeight}
                        />
                      ))}
                      {players.length === 0 && (
                        <View style={styles.emptyState}>
                          <Text style={[styles.emptyText, { fontSize: 14 * scale }]}>
                            No hay jugadores registrados para esta liga.
                          </Text>
                        </View>
                      )}
                    </ScrollView>
                  )}
                </View>
              </View>
            </View>
          </SafeAreaView>
        </LinearGradient>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', backgroundColor: '#EFEAD8' },
  frame: {
    flex: 1,
    width: '100%',
    maxWidth: 560,
    overflow: 'hidden',
    backgroundColor: '#F4EEDC',
  },
  header: { flexDirection: 'row', alignItems: 'center' },
  backButton: { alignItems: 'center', justifyContent: 'center', borderRadius: 100 },
  title: { flex: 1, minWidth: 0, textAlign: 'center', fontWeight: '600', color: '#FFFDF3' },
  logoSlot: { alignItems: 'center', justifyContent: 'center' },
  logoBadge: {
    overflow: 'hidden',
    borderRadius: 100,
    borderWidth: 1,
    borderColor: '#D7BA83',
    backgroundColor: '#713A20',
  },
  logo: { width: '100%', height: '100%' },
  contentSurface: { flex: 1 },
  contentSafeArea: { flex: 1 },
  container: { flex: 1, alignItems: 'center' },
  content: { flex: 1, width: '100%', maxWidth: 520 },
  legend: { flexDirection: 'row', alignItems: 'center' },
  legendPill: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.25,
    backgroundColor: '#FFFEFA',
  },
  legendDot: { borderRadius: 100, flexShrink: 0 },
  legendText: { color: '#252923', fontWeight: '600', flexShrink: 1 },
  tableShell: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      web: { boxShadow: '0px 6px 18px rgba(106, 91, 52, 0.06)' },
      default: {
        shadowColor: '#6A5B34',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 2,
      },
    }),
  },
  tableHeader: { flexDirection: 'row', alignItems: 'center' },
  headerCell: { color: '#FFFFFF', fontWeight: '600', textAlign: 'center' },
  tableBody: { flex: 1 },
  tableContent: { flexGrow: 1, paddingBottom: 4 },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E8E7E0',
  },
  alternateRow: { backgroundColor: '#FBFAF6' },
  classificationStripe: { position: 'absolute', left: 0, borderRadius: 100 },
  bodyCell: { color: '#292C26', textAlign: 'center' },
  positionCell: { width: '8%' },
  nameCell: { width: '40%', textAlign: 'left' },
  pointsCell: { width: '17%' },
  playedCell: { width: '20%' },
  ballsCell: { width: '15%' },
  playerName: { fontWeight: '400' },
  pointsValue: { fontWeight: '700' },
  loadingState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyState: { flex: 1, minHeight: 160, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyText: { color: '#6C7566', textAlign: 'center', lineHeight: 21 },
  buttonPressed: { opacity: 0.7 },
});
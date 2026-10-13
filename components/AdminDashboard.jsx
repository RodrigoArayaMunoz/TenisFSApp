import { AntDesign, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
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
  fetchPendingMatchResults,
  isSupabaseConfigured,
  reviewMatchResult,
} from '../services/resultService';
import { showUserAlert } from '../utils/alerts';

const REVIEW_NOTICE_DURATION = 3500;
const REVIEW_MESSAGES = {
  Validado: 'Resultado validado, la tabla de posiciones se ha actualizado.',
  Rechazado: 'Resultado rechazado, la tabla de posiciones se ha actualizado.',
};

const buildShadow = (color, web, opacity = 0.14) =>
  Platform.OS === 'web'
    ? { boxShadow: web }
    : {
        shadowColor: color,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: opacity,
        shadowRadius: 6,
        elevation: 3,
      };

const formatScores = (players) => {
  const setCount = Math.max(...players.map((player) => player.scores.length));

  return Array.from({ length: setCount })
    .map((_, setIndex) => {
      const playerAScore = players[0]?.scores[setIndex];
      const playerBScore = players[1]?.scores[setIndex];
      if (playerAScore === null || playerAScore === undefined) return null;
      if (playerBScore === null || playerBScore === undefined) return null;
      return `${playerAScore}-${playerBScore}`;
    })
    .filter(Boolean)
    .join(', ');
};

const wait = (duration) => new Promise((resolve) => setTimeout(resolve, duration));

function ReviewButton({ matchTitle, status, disabled, scale, onPress }) {
  const isApproval = status === 'Validado';
  const size = 40 * scale;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${isApproval ? 'Validar' : 'Rechazar'} resultado de ${matchTitle}`}
      disabled={disabled}
      hitSlop={Math.max(0, (44 - size) / 2)}
      onPress={onPress}
      style={({ pressed }) => [
        styles.reviewAction,
        isApproval ? styles.approveShadow : styles.rejectShadow,
        { width: size, height: size, borderRadius: size / 2 },
        (pressed || disabled) && styles.actionPressed,
      ]}>
      <LinearGradient
        colors={isApproval ? ['#31C85A', '#1CA34A'] : ['#FF393D', '#EA1B25']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.actionSurface, { borderRadius: size / 2 }]}>
        <Feather
          accessible={false}
          name={isApproval ? 'check' : 'x'}
          size={25 * scale}
          color="#FFFFFF"
        />
      </LinearGradient>
    </Pressable>
  );
}

function ResultCard({ result, isReviewing, scale, onReview }) {
  const [playerA, playerB] = result.players;
  const matchTitle = `${playerA.name} vs ${playerB.name}`;
  const scoreText = formatScores(result.players);
  const detailStyle = { fontSize: 13 * scale, lineHeight: 18 * scale };

  return (
    <View
      style={[
        styles.resultCard,
        {
          minHeight: 138 * scale,
          borderRadius: 21 * scale,
          paddingHorizontal: 17 * scale,
          paddingVertical: 18 * scale,
          gap: 9 * scale,
        },
      ]}>
      <View style={styles.resultInfo}>
        <Text
          style={[
            styles.matchTitle,
            { fontSize: 15 * scale, lineHeight: 19 * scale, marginBottom: 7 * scale },
          ]}>
          {matchTitle}
        </Text>
        <Text style={[styles.detailText, detailStyle]}>
          <Text style={styles.detailLabel}>Ganador: </Text>
          <AntDesign name="trophy" size={15 * scale} color="#DDA22B" />
          {' ' + result.winnerName}
        </Text>
        <Text style={[styles.detailText, detailStyle]}>
          <Text style={styles.detailLabel}>Scores: </Text>
          {scoreText || 'Sin marcador'}
        </Text>
        <Text style={[styles.detailText, detailStyle]}>
          <Text style={styles.detailLabel}>Pelotas: </Text>
          {[0, 1, 2].map((ballIndex) => (
            <MaterialCommunityIcons
              key={`ball-${result.id}-${ballIndex}`}
              name="tennis-ball"
              size={15 * scale}
              color="#C7CB2D"
            />
          ))}
          {': ' + result.ballsProvider}
        </Text>
      </View>
      <View style={[styles.actionsRow, { gap: 7 * scale }]}>
        {['Validado', 'Rechazado'].map((status) => (
          <ReviewButton
            key={status}
            matchTitle={matchTitle}
            status={status}
            disabled={isReviewing}
            scale={scale}
            onPress={() => onReview(result.id, status)}
          />
        ))}
      </View>
    </View>
  );
}

function LeagueButton({ leagueId, scale }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Liga ${leagueId}`}
      onPress={() =>
        router.push({
          pathname: '/league-standings',
          params: { leagueId, backTo: '/admin-dashboard' },
        })
      }
      style={({ pressed }) => [
        styles.leagueCard,
        {
          minHeight: Math.max(48, 52 * scale),
          borderRadius: 19 * scale,
          paddingHorizontal: 14 * scale,
          paddingVertical: 10 * scale,
          gap: 10 * scale,
        },
        pressed && styles.buttonPressed,
      ]}>
      <AntDesign accessible={false} name="trophy" size={25 * scale} color="#AA4C20" />
      <Text style={[styles.leagueTitle, { fontSize: 14 * scale }]}>
        Liga {leagueId}
      </Text>
    </Pressable>
  );
}

export default function AdminDashboard() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const [hasMounted, setHasMounted] = useState(Platform.OS !== 'web');
  const [pendingResults, setPendingResults] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [reviewingId, setReviewingId] = useState(null);
  const [reviewNotice, setReviewNotice] = useState(null);
  const scale = hasMounted
    ? Math.max(0.86, Math.min(width / 333, height / 659, 1.2))
    : 1;

  const loadPendingResults = useCallback(async ({ refreshing = false } = {}) => {
    if (!isSupabaseConfigured) {
      setPendingResults([]);
      setIsLoading(false);
      return;
    }
    if (refreshing) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    try {
      const results = await fetchPendingMatchResults();
      setPendingResults(results);
    } catch (error) {
      showUserAlert('No se pudieron cargar resultados', error.message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    setHasMounted(true);
    loadPendingResults();
  }, [loadPendingResults]);

  const handleReview = async (resultId, status) => {
    setReviewingId(resultId);
    try {
      await reviewMatchResult(resultId, status);
      setPendingResults((currentResults) =>
        currentResults.filter((result) => result.id !== resultId)
      );
      setReviewNotice({ message: REVIEW_MESSAGES[status], type: status });
      await wait(REVIEW_NOTICE_DURATION);
      setReviewNotice(null);
    } catch (error) {
      setReviewNotice(null);
      showUserAlert('No se pudo revisar', error.message);
    } finally {
      setReviewingId(null);
    }
  };

  return (
    <View style={styles.screen}>
      {isFocused && <StatusBar style="light" />}
      <View style={styles.frame}>
        <LinearGradient
          colors={['#855335', '#713C24', '#63311E']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}>
          <SafeAreaView edges={['top', 'left', 'right']}>
            <View
              style={[
                styles.header,
                {
                  paddingTop: (Platform.OS === 'web' ? 52 : 22) * scale,
                  paddingBottom: 44 * scale,
                  paddingHorizontal: 18 * scale,
                  gap: 16 * scale,
                },
              ]}>
              <Text
                accessibilityRole="header"
                style={[
                  styles.headerTitle,
                  { fontSize: 25 * scale, lineHeight: 30 * scale },
                ]}>
                {'Bienvenido\nAdministrador'}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Volver al menú de administrador"
                accessibilityHint="Regresa a las opciones de administrador"
                onPress={() => router.replace('/admin-home')}
                style={({ pressed }) => [
                  styles.avatar,
                  { width: 48 * scale, height: 48 * scale },
                  pressed && styles.buttonPressed,
                ]}>
                <Text style={{ fontSize: 31 * scale, lineHeight: 38 * scale }}>👨🏻‍💼</Text>
              </Pressable>
            </View>
          </SafeAreaView>
        </LinearGradient>

        <LinearGradient
          colors={['#FAF8F1', '#F5F0E2']}
          style={[
            styles.sheet,
            {
              marginTop: -24 * scale,
              borderTopLeftRadius: 27 * scale,
              borderTopRightRadius: 27 * scale,
            },
          ]}>
          <SafeAreaView style={styles.sheetSafeArea} edges={['left', 'right']}>
            {isLoading ? (
              <View style={styles.loadingState}>
                <ActivityIndicator
                  accessibilityLabel="Cargando resultados pendientes"
                  size="large"
                  color="#855335"
                />
              </View>
            ) : (
              <ScrollView
                style={styles.resultsList}
                contentContainerStyle={[
                  styles.resultsContent,
                  {
                    paddingHorizontal: 6 * scale,
                    paddingTop: 8 * scale,
                    paddingBottom: 12 * scale,
                    gap: 12 * scale,
                  },
                ]}
                refreshControl={
                  <RefreshControl
                    refreshing={isRefreshing}
                    onRefresh={() => loadPendingResults({ refreshing: true })}
                    tintColor="#855335"
                    colors={['#855335']}
                  />
                }
                showsVerticalScrollIndicator={false}>
                {pendingResults.map((result) => (
                  <ResultCard
                    key={result.id}
                    result={result}
                    isReviewing={reviewingId === result.id}
                    scale={scale}
                    onReview={handleReview}
                  />
                ))}
                {pendingResults.length === 0 && (
                  <View style={[styles.emptyState, { marginTop: 12 * scale }]}>
                    <Text style={[styles.emptyText, { fontSize: 16 * scale }]}>
                      Sin resultados pendientes
                    </Text>
                  </View>
                )}
              </ScrollView>
            )}
            <View
              style={[
                styles.footer,
                {
                  paddingTop: 8 * scale,
                  paddingHorizontal: 10 * scale,
                  paddingBottom: Math.max(insets.bottom, 18 * scale),
                },
              ]}>
              <View style={[styles.leagues, { gap: 12 * scale }]}>
                {['B', 'C'].map((leagueId) => (
                  <LeagueButton key={leagueId} leagueId={leagueId} scale={scale} />
                ))}
              </View>
            </View>
          </SafeAreaView>
        </LinearGradient>
        {reviewNotice && (
          <View pointerEvents="none" style={styles.noticeOverlay}>
            <View accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.noticeCard}>
              <Feather
                accessible={false}
                name={reviewNotice.type === 'Validado' ? 'check-circle' : 'x-circle'}
                size={26}
                color={reviewNotice.type === 'Validado' ? '#1CA34A' : '#EA1B25'}
              />
              <Text style={styles.noticeText}>{reviewNotice.message}</Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', backgroundColor: '#F5F0E2' },
  frame: { flex: 1, width: '100%', maxWidth: 560, backgroundColor: '#713C24' },
  header: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { flex: 1, minWidth: 0, fontWeight: '700', color: '#FFFCF4' },
  avatar: {
    borderRadius: 100,
    backgroundColor: '#FFFCF5',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    ...buildShadow('#30150A', '0px 2px 5px rgba(48, 21, 10, 0.2)', 0.2),
  },
  sheet: { flex: 1, overflow: 'hidden' },
  sheetSafeArea: { flex: 1 },
  loadingState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  resultsList: { flex: 1 },
  resultsContent: { flexGrow: 1, alignItems: 'center' },
  resultCard: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    ...buildShadow('#745831', '0px 4px 14px rgba(116, 88, 49, 0.035)', 0.035),
  },
  resultInfo: { flex: 1, minWidth: 0 },
  matchTitle: { color: '#252723', fontWeight: '700' },
  detailText: { color: '#34362F' },
  detailLabel: { fontWeight: '500' },
  actionsRow: { flexDirection: 'row', alignItems: 'center', flexShrink: 0 },
  reviewAction: { alignItems: 'center', justifyContent: 'center' },
  actionSurface: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.24)',
  },
  approveShadow: buildShadow('#1CA34A', '0px 4px 8px rgba(28, 163, 74, 0.22)', 0.22),
  rejectShadow: buildShadow('#EA1B25', '0px 4px 8px rgba(234, 27, 37, 0.22)', 0.22),
  actionPressed: { opacity: 0.55 },
  emptyState: {
    width: '100%',
    maxWidth: 520,
    minHeight: 170,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyText: { fontWeight: '600', color: '#713C24', textAlign: 'center' },
  footer: { alignItems: 'center' },
  leagues: { width: '100%', maxWidth: 520, flexDirection: 'row' },
  leagueCard: {
    flex: 1,
    minWidth: 0,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#65AD8A',
    borderBottomWidth: 5,
    borderBottomColor: '#A95525',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...buildShadow('#587342', '0px 5px 8px rgba(88, 115, 66, 0.15)', 0.15),
  },
  leagueTitle: { color: '#244A3D', fontWeight: '700', flexShrink: 1 },
  buttonPressed: { opacity: 0.86, transform: [{ scale: 0.985 }] },
  noticeOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: 'rgba(48, 28, 16, 0.35)',
  },
  noticeCard: {
    width: '100%',
    maxWidth: 460,
    borderRadius: 22,
    backgroundColor: '#FFFCF5',
    borderWidth: 1,
    borderColor: '#E8DFCB',
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    ...buildShadow('#713C24', '0px 12px 24px rgba(113, 60, 36, 0.18)', 0.18),
  },
  noticeText: { flex: 1, fontSize: 16, lineHeight: 23, fontWeight: '600', color: '#51331F' },
});
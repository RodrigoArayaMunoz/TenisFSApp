import { AntDesign, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
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
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  fetchPendingMatchResults,
  isSupabaseConfigured,
  reviewMatchResult,
} from '../services/resultService';
import { showUserAlert } from '../utils/alerts';

const isWeb = Platform.OS === 'web';
const REVIEW_NOTICE_DURATION = 3500;
const REVIEW_MESSAGES = {
  Validado: 'Resultado validado, la tabla de posiciones se ha actualizado.',
  Rechazado: 'Resultado rechazado, la tabla de posiciones se ha actualizado.',
};

const buildShadow = ({ color, offset, opacity, radius, elevation, web }) =>
  isWeb
    ? { boxShadow: web }
    : {
        shadowColor: color,
        shadowOffset: offset,
        shadowOpacity: opacity,
        shadowRadius: radius,
        elevation,
      };

const formatScores = (players) => {
  const setCount = Math.max(...players.map((player) => player.scores.length));

  return Array.from({ length: setCount })
    .map((_, setIndex) => {
      const playerAScore = players[0]?.scores[setIndex];
      const playerBScore = players[1]?.scores[setIndex];

      if (playerAScore === null || playerAScore === undefined) {
        return null;
      }

      if (playerBScore === null || playerBScore === undefined) {
        return null;
      }

      return `${playerAScore}-${playerBScore}`;
    })
    .filter(Boolean)
    .join(', ');
};

const wait = (duration) =>
  new Promise((resolve) => {
    setTimeout(resolve, duration);
  });

const ResultCard = ({ result, isReviewing, isCompact, isTiny, onReview }) => {
  const [playerA, playerB] = result.players;
  const scoreText = formatScores(result.players);

  return (
    <View style={[styles.resultCard, isCompact && styles.resultCardCompact]}>
      <View style={styles.resultInfo}>
        <Text
          style={[styles.matchTitle, isCompact && styles.matchTitleCompact]}
          numberOfLines={2}>
          {playerA.name} vs {playerB.name}
        </Text>

        <View style={styles.detailLine}>
          <Text style={[styles.winnerText, isCompact && styles.detailTextCompact]}>
            Ganador
          </Text>
          <AntDesign name="trophy" size={isCompact ? 15 : 20} color="#C9952D" />
          <Text style={[styles.winnerText, isCompact && styles.detailTextCompact]}>
            : {result.winnerName}
          </Text>
        </View>

        <View style={styles.detailLine}>
          <Text style={[styles.detailText, isCompact && styles.detailTextCompact]}>
            Scores
          </Text>
          <MaterialCommunityIcons
            name="scoreboard-outline"
            size={isCompact ? 16 : 22}
            color="#000000"
          />
          <Text style={[styles.detailText, isCompact && styles.detailTextCompact]}>
            : {scoreText || 'Sin marcador'}
          </Text>
        </View>

        <View style={styles.ballsLine}>
          <Text style={[styles.detailText, isCompact && styles.detailTextCompact]}>
            Pelotas
          </Text>

          <View style={styles.ballIconsRow}>
            {[0, 1, 2].map((ballIndex) => (
              <MaterialCommunityIcons
                key={`ball-${result.id}-${ballIndex}`}
                name="tennis-ball"
                size={isCompact ? 15 : 20}
                color="#D6D33E"
              />
            ))}
          </View>

          <Text
            style={[styles.detailText, isCompact && styles.detailTextCompact]}
            numberOfLines={1}>
            : {result.ballsProvider}
          </Text>
        </View>
      </View>

      <View
        style={[
          styles.actionsRow,
          isCompact && styles.actionsRowCompact,
          isTiny && styles.actionsRowTiny,
        ]}>
        <Pressable
          style={({ pressed }) => [
            styles.reviewAction,
            styles.approveAction,
            isCompact && styles.reviewActionCompact,
            isTiny && styles.reviewActionTiny,
            (pressed || isReviewing) && styles.actionPressed,
          ]}
          onPress={() => onReview(result.id, 'Validado')}
          disabled={isReviewing}>
          <Feather name="check" size={isTiny ? 21 : isCompact ? 25 : 34} color="#FFFFFF" />
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.reviewAction,
            styles.rejectAction,
            isCompact && styles.reviewActionCompact,
            isTiny && styles.reviewActionTiny,
            (pressed || isReviewing) && styles.actionPressed,
          ]}
          onPress={() => onReview(result.id, 'Rechazado')}
          disabled={isReviewing}>
          <Feather name="x" size={isTiny ? 21 : isCompact ? 25 : 34} color="#FFFFFF" />
        </Pressable>
      </View>
    </View>
  );
};

export default function AdminDashboard() {
  const { width } = useWindowDimensions();
  const [pendingResults, setPendingResults] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [reviewingId, setReviewingId] = useState(null);
  const [reviewNotice, setReviewNotice] = useState(null);
  const isCompact = width < 520;
  const isTiny = width < 370;

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
    loadPendingResults();
  }, [loadPendingResults]);

  const handleReview = async (resultId, status) => {
    setReviewingId(resultId);

    try {
      await reviewMatchResult(resultId, status);
      setPendingResults((currentResults) =>
        currentResults.filter((result) => result.id !== resultId)
      );
      setReviewNotice({
        message: REVIEW_MESSAGES[status],
        type: status,
      });
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
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={[styles.headerTitle, isCompact && styles.headerTitleCompact]}>
              Bienvenido Administrador
            </Text>

            <View style={[styles.brandMark, isCompact && styles.brandMarkCompact]}>
              <View style={styles.brandBall}>
                <MaterialCommunityIcons
                  name="tennis-ball"
                  size={isCompact ? 26 : 38}
                  color="#FFFFFF"
                />
              </View>
              <Text style={[styles.brandText, isCompact && styles.brandTextCompact]}>
                tennis{'\n'}academy
              </Text>
            </View>
          </View>

          {isLoading ? (
            <View style={styles.loadingState}>
              <ActivityIndicator size="large" color="#A66132" />
            </View>
          ) : (
            <ScrollView
              style={styles.resultsList}
              contentContainerStyle={styles.resultsContent}
              refreshControl={
                <RefreshControl
                  refreshing={isRefreshing}
                  onRefresh={() => loadPendingResults({ refreshing: true })}
                  tintColor="#A66132"
                />
              }
              showsVerticalScrollIndicator={false}>
              {pendingResults.map((result) => (
                <ResultCard
                  key={result.id}
                  result={result}
                  isCompact={isCompact}
                  isTiny={isTiny}
                  isReviewing={reviewingId === result.id}
                  onReview={handleReview}
                />
              ))}

              {pendingResults.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>Sin resultados pendientes</Text>
                </View>
              ) : null}
            </ScrollView>
          )}

          <View style={styles.footerSection}>
            <View style={styles.tabsSection}>
              <Pressable
                style={({ pressed }) => [
                  styles.tabButton,
                  isCompact && styles.tabButtonCompact,
                  isTiny && styles.tabButtonTiny,
                  pressed && styles.buttonPressed,
                ]}
                onPress={() =>
                  router.push({
                    pathname: '/league-standings',
                    params: { leagueId: 'B', backTo: '/admin-dashboard' },
                  })
                }>
                <AntDesign name="trophy" size={isCompact ? 28 : 34} color="#000000" />
                <Text style={[styles.tabButtonText, isCompact && styles.tabButtonTextCompact]}>
                  Liga B
                </Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.tabButton,
                  isCompact && styles.tabButtonCompact,
                  isTiny && styles.tabButtonTiny,
                  pressed && styles.buttonPressed,
                ]}
                onPress={() =>
                  router.push({
                    pathname: '/league-standings',
                    params: { leagueId: 'C', backTo: '/admin-dashboard' },
                  })
                }>
                <AntDesign name="trophy" size={isCompact ? 28 : 34} color="#000000" />
                <Text style={[styles.tabButtonText, isCompact && styles.tabButtonTextCompact]}>
                  Liga C
                </Text>
              </Pressable>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.menuButton,
                isCompact && styles.menuButtonCompact,
                pressed && styles.buttonPressed,
              ]}
              onPress={() => router.replace('/login')}>
              <Feather name="home" size={isCompact ? 28 : 36} color="#FFFFFF" />
              <Text style={[styles.menuButtonText, isCompact && styles.menuButtonTextCompact]}>
                Volver al menu principal
              </Text>
            </Pressable>
          </View>
        </View>
      </View>

      {reviewNotice ? (
        <View style={styles.noticeOverlay}>
          <View style={styles.noticeCard}>
            <Feather
              name={reviewNotice.type === 'Validado' ? 'check-circle' : 'x-circle'}
              size={26}
              color={reviewNotice.type === 'Validado' ? '#05B743' : '#E63F42'}
            />
            <Text style={styles.noticeText}>{reviewNotice.message}</Text>
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F4E8',
  },
  container: {
    flex: 1,
    backgroundColor: '#F8F4E8',
    paddingHorizontal: 18,
    paddingTop: 22,
    paddingBottom: 24,
    alignItems: 'center',
  },
  content: {
    flex: 1,
    width: '100%',
    maxWidth: 760,
  },
  header: {
    minHeight: 130,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 18,
  },
  headerTitle: {
    flex: 1,
    fontSize: 58,
    lineHeight: 66,
    fontWeight: '900',
    color: '#6C3518',
  },
  headerTitleCompact: {
    fontSize: 40,
    lineHeight: 47,
  },
  brandMark: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 8,
  },
  brandMarkCompact: {
    gap: 6,
    paddingTop: 6,
  },
  brandBall: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#7A3D1C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandText: {
    fontSize: 22,
    lineHeight: 22,
    fontWeight: '900',
    color: '#6C3518',
  },
  brandTextCompact: {
    display: 'none',
  },
  sectionTitle: {
    fontSize: 38,
    lineHeight: 44,
    fontWeight: '900',
    color: '#000000',
    marginTop: 12,
    marginBottom: 22,
  },
  sectionTitleCompact: {
    fontSize: 27,
    lineHeight: 32,
    marginTop: 4,
    marginBottom: 14,
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultsList: {
    flex: 1,
  },
  resultsContent: {
    gap: 18,
    paddingBottom: 20,
  },
  resultCard: {
    minHeight: 126,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 22,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    ...buildShadow({
      color: '#5E4A38',
      offset: { width: 0, height: 8 },
      opacity: 0.18,
      radius: 14,
      elevation: 7,
      web: '0px 8px 14px rgba(94, 74, 56, 0.18)',
    }),
  },
  resultCardCompact: {
    minHeight: 112,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 10,
  },
  resultInfo: {
    flex: 1,
    minWidth: 0,
  },
  matchTitle: {
    fontSize: 23,
    lineHeight: 29,
    fontWeight: '900',
    color: '#000000',
    marginBottom: 8,
  },
  matchTitleCompact: {
    fontSize: 16,
    lineHeight: 20,
    marginBottom: 5,
  },
  detailText: {
    fontSize: 21,
    lineHeight: 27,
    color: '#000000',
  },
  detailTextCompact: {
    fontSize: 15,
    lineHeight: 20,
  },
  winnerText: {
    fontSize: 21,
    lineHeight: 27,
    fontWeight: '900',
    color: '#000000',
  },
  detailLine: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 5,
  },
  ballsLine: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  ballIconsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginLeft: 6,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
  },
  actionsRowCompact: {
    gap: 8,
  },
  actionsRowTiny: {
    gap: 7,
  },
  reviewAction: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    ...buildShadow({
      color: '#000000',
      offset: { width: 0, height: 5 },
      opacity: 0.18,
      radius: 8,
      elevation: 5,
      web: '0px 5px 8px rgba(0, 0, 0, 0.18)',
    }),
  },
  reviewActionCompact: {
    width: 46,
    height: 46,
    borderRadius: 23,
  },
  reviewActionTiny: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  approveAction: {
    backgroundColor: '#45BE5B',
  },
  rejectAction: {
    backgroundColor: '#E63F42',
  },
  actionPressed: {
    opacity: 0.62,
  },
  emptyState: {
    minHeight: 190,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    ...buildShadow({
      color: '#5E4A38',
      offset: { width: 0, height: 8 },
      opacity: 0.1,
      radius: 14,
      elevation: 5,
      web: '0px 8px 14px rgba(94, 74, 56, 0.1)',
    }),
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#6C3518',
  },
  footerSection: {
    width: '100%',
    gap: 26,
    paddingTop: 18,
  },
  tabsSection: {
    width: '100%',
    flexDirection: 'row',
    gap: 26,
  },
  tabButton: {
    flex: 1,
    minHeight: 94,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    ...buildShadow({
      color: '#5E4A38',
      offset: { width: 0, height: 8 },
      opacity: 0.16,
      radius: 14,
      elevation: 6,
      web: '0px 8px 14px rgba(94, 74, 56, 0.16)',
    }),
  },
  tabButtonCompact: {
    minHeight: 70,
    borderRadius: 20,
    gap: 10,
  },
  tabButtonTiny: {
    minHeight: 62,
    gap: 8,
  },
  tabButtonText: {
    fontSize: 32,
    fontWeight: '500',
    color: '#000000',
  },
  tabButtonTextCompact: {
    fontSize: 22,
  },
  menuButton: {
    minHeight: 92,
    borderRadius: 24,
    backgroundColor: '#7A3D1C',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 16,
    width: '100%',
    paddingHorizontal: 18,
    ...buildShadow({
      color: '#7A3D1C',
      offset: { width: 0, height: 10 },
      opacity: 0.2,
      radius: 18,
      elevation: 7,
      web: '0px 10px 18px rgba(122, 61, 28, 0.2)',
    }),
  },
  menuButtonCompact: {
    minHeight: 68,
    borderRadius: 20,
    gap: 12,
  },
  menuButtonText: {
    fontSize: 32,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  menuButtonTextCompact: {
    fontSize: 19,
  },
  buttonPressed: {
    opacity: 0.82,
  },
  noticeOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: 'rgba(48, 48, 48, 0.52)',
    pointerEvents: 'none',
  },
  noticeCard: {
    width: '100%',
    maxWidth: 460,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#DDEDDD',
    paddingHorizontal: 20,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    ...buildShadow({
      color: '#2F8A4D',
      offset: { width: 0, height: 16 },
      opacity: 0.18,
      radius: 24,
      elevation: 10,
      web: '0px 16px 24px rgba(47, 138, 77, 0.18)',
    }),
  },
  noticeText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
    color: '#3B170F',
  },
});

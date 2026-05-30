import { AntDesign, Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  fetchPendingMatchResults,
  isSupabaseConfigured,
  reviewMatchResult,
} from '../services/resultService';

const ResultCard = ({ result }) => (
  <View style={styles.resultContent}>
    <View style={styles.resultHeader}>
      <Text style={styles.leagueLabel}>Liga {result.league}</Text>
    </View>

    <View style={styles.playersBlock}>
      {result.players.map((player) => (
        <View key={player.name} style={styles.playerRow}>
          <Text style={styles.playerName}>{player.name}</Text>

          <View style={styles.scoresRow}>
            {player.scores.map((score, index) => (
              <Text key={`${player.name}-${index}`} style={styles.scoreText}>
                {score ?? ''}
              </Text>
            ))}
          </View>
        </View>
      ))}
    </View>

    <View style={styles.ballsRow}>
      <Text style={styles.ballsLabel}>Pelotas</Text>
      <Text style={styles.ballsName}>{result.ballsProvider}</Text>
    </View>
  </View>
);

export default function AdminDashboard() {
  const [activeLeague, setActiveLeague] = useState(null);
  const [pendingResults, setPendingResults] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [reviewingId, setReviewingId] = useState(null);

  const filteredResults = useMemo(
    () =>
      activeLeague
        ? pendingResults.filter((result) => result.league === activeLeague)
        : pendingResults,
    [activeLeague, pendingResults]
  );

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
      Alert.alert('No se pudieron cargar resultados', error.message);
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
    } catch (error) {
      Alert.alert('No se pudo revisar', error.message);
    } finally {
      setReviewingId(null);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Bienvenido Administrador</Text>
          <Image
            source={require('../assets/images/logofs.png')}
            style={styles.logo}
            contentFit="contain"
          />
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
            {filteredResults.map((result) => (
              <View key={result.id} style={styles.resultRow}>
                <ResultCard result={result} />

                <View style={styles.actionsColumn}>
                  <Pressable
                    style={[
                      styles.actionButton,
                      styles.validateButton,
                      reviewingId === result.id && styles.actionButtonDisabled,
                    ]}
                    onPress={() => handleReview(result.id, 'Validado')}
                    disabled={reviewingId === result.id}>
                    <Feather name="check" size={19} color="#2F8A4D" />
                  </Pressable>

                  <Pressable
                    style={[
                      styles.actionButton,
                      styles.rejectButton,
                      reviewingId === result.id && styles.actionButtonDisabled,
                    ]}
                    onPress={() => handleReview(result.id, 'Rechazado')}
                    disabled={reviewingId === result.id}>
                    <Feather name="x-circle" size={20} color="#D93434" />
                  </Pressable>
                </View>
              </View>
            ))}

            {filteredResults.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>Sin resultados pendientes</Text>
              </View>
            ) : null}
          </ScrollView>
        )}

        <View style={styles.footerSection}>
          <View style={styles.tabsSection}>
            <Pressable
              style={[
                styles.tabButton,
                activeLeague === 'B' && styles.tabButtonActive,
              ]}
              onPress={() => setActiveLeague('B')}>
              <AntDesign name="trophy" size={22} color="#A66132" />
              <Text style={styles.tabButtonText}>Liga B</Text>
            </Pressable>

            <Pressable
              style={[
                styles.tabButton,
                activeLeague === 'C' && styles.tabButtonActive,
              ]}
              onPress={() => setActiveLeague('C')}>
              <AntDesign name="trophy" size={22} color="#A66132" />
              <Text style={styles.tabButtonText}>Liga C</Text>
            </Pressable>
          </View>

          <Pressable
            style={styles.menuButton}
            onPress={() => router.replace('/login')}>
            <Feather name="home" size={21} color="#FFFFFF" />
            <Text style={styles.menuButtonText}>Volver al menu principal</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7F3EE',
  },
  container: {
    flex: 1,
    backgroundColor: '#F7F3EE',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 26,
  },
  header: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
  },
  headerTitle: {
    flex: 1,
    fontSize: 25,
    fontWeight: '800',
    color: '#3A312C',
  },
  logo: {
    width: 62,
    height: 62,
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultsList: {
    flex: 1,
    marginTop: 18,
    marginBottom: 18,
  },
  resultsContent: {
    gap: 8,
    paddingBottom: 4,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 10,
  },
  actionsColumn: {
    width: 34,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionButton: {
    width: 31,
    height: 31,
    borderRadius: 15.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.2,
    shadowColor: '#9F6A3F',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 3,
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  validateButton: {
    borderColor: '#B8DDBF',
  },
  rejectButton: {
    borderColor: '#F0B9B9',
  },
  resultContent: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E4D9CF',
    paddingHorizontal: 10,
    paddingVertical: 8,
    shadowColor: '#9F6A3F',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
  },
  resultHeader: {
    marginBottom: 4,
  },
  leagueLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#A66132',
  },
  playersBlock: {
    gap: 4,
  },
  playerRow: {
    minHeight: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  playerName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
    color: '#2C2A28',
  },
  scoresRow: {
    width: 74,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  scoreText: {
    minWidth: 18,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '800',
    color: '#111111',
  },
  ballsRow: {
    minHeight: 26,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#EFE6DD',
    marginTop: 6,
    paddingTop: 6,
  },
  ballsLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#4A3C32',
  },
  ballsName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#4A3C32',
  },
  emptyState: {
    minHeight: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#8C7B73',
  },
  footerSection: {
    width: '100%',
    gap: 10,
  },
  tabsSection: {
    width: '100%',
    flexDirection: 'row',
    gap: 14,
  },
  tabButton: {
    flex: 1,
    minHeight: 62,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.4,
    borderColor: '#E1D4C8',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#9F6A3F',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
  },
  tabButtonActive: {
    borderColor: '#A66132',
    backgroundColor: '#F8EEE6',
  },
  tabButtonText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#8C7B73',
  },
  menuButton: {
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: '#A66132',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
    shadowColor: '#A66132',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 6,
    width: '100%',
  },
  menuButtonText: {
    fontSize: 19,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

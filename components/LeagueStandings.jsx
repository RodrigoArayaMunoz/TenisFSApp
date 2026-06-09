import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
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
  fetchLeagueStandings,
  isSupabaseConfigured,
} from '../services/resultService';
import { showUserAlert } from '../utils/alerts';

const isWeb = Platform.OS === 'web';
const GOLD_CUTOFF = 8;
const SILVER_CUTOFF = 16;

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

export default function LeagueStandings({ leagueId = 'B', backTo = '/login' }) {
  const { width } = useWindowDimensions();
  const [players, setPlayers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const isCompact = width < 520;
  const isTiny = width < 370;

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
    loadStandings();
  }, [loadStandings]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.headerBand}>
        <Pressable
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.buttonPressed,
          ]}
          onPress={() => router.replace(backTo)}>
          <Feather name="arrow-left" size={isCompact ? 28 : 34} color="#000000" />
        </Pressable>

        <Text style={[styles.title, isCompact && styles.titleCompact]}>
          Liga {leagueId}
        </Text>

        <Image
          source={require('../assets/images/logofs.png')}
          style={[styles.logo, isCompact && styles.logoCompact]}
          contentFit="contain"
        />
      </View>

      <View style={styles.container}>
        <View style={styles.content}>
          <View style={[styles.legend, isCompact && styles.legendCompact]}>
            <View style={[styles.legendPill, styles.goldPill]}>
              <View style={[styles.legendDot, styles.goldDot]} />
              <Text style={[styles.legendText, isCompact && styles.legendTextCompact]}>
                Copa de Oro
              </Text>
            </View>

            <View style={[styles.legendPill, styles.silverPill]}>
              <View style={[styles.legendDot, styles.silverDot]} />
              <Text style={[styles.legendText, isCompact && styles.legendTextCompact]}>
                Copa de Plata
              </Text>
            </View>
          </View>

          <View style={styles.tableShell}>
            <View style={[styles.tableHeader, isCompact && styles.tableHeaderCompact]}>
              <Text style={[styles.headerCell, styles.positionCell]}>#</Text>
              <Text style={[styles.headerCell, styles.nameCell]}>Jugador</Text>
              <Text
                style={[
                  styles.headerCell,
                  styles.pointsCell,
                  isCompact && styles.headerCellCompact,
                ]}>
                Puntos
              </Text>
              <Text
                style={[
                  styles.headerCell,
                  styles.playedCell,
                  isCompact && styles.headerCellCompact,
                  isTiny && styles.headerCellTiny,
                ]}>
                P/Jugados
              </Text>
              <Text
                style={[
                  styles.headerCell,
                  styles.ballsCell,
                  isCompact && styles.headerCellCompact,
                ]}>
                Pelotas
              </Text>
            </View>

            {isLoading ? (
              <View style={styles.loadingState}>
                <ActivityIndicator size="large" color="#A66132" />
              </View>
            ) : (
              <ScrollView
                style={styles.tableBody}
                contentContainerStyle={styles.tableContent}
                refreshControl={
                  <RefreshControl
                    refreshing={isRefreshing}
                    onRefresh={() => loadStandings({ refreshing: true })}
                    tintColor="#A66132"
                  />
                }
                showsVerticalScrollIndicator={false}>
                {players.map((player, index) => {
                  const isGold = index < GOLD_CUTOFF;
                  const isSilver = index >= GOLD_CUTOFF && index < SILVER_CUTOFF;

                  return (
                    <View
                      key={player.id}
                      style={[
                        styles.tableRow,
                        isCompact && styles.tableRowCompact,
                      ]}>
                      <View
                        style={[
                          styles.classificationStripe,
                          isGold && styles.goldStripe,
                          isSilver && styles.silverStripe,
                        ]}
                      />

                      <Text style={[styles.bodyCell, styles.positionCell]}>
                        {index + 1}
                      </Text>
                      <Text
                        style={[styles.bodyCell, styles.nameCell, styles.playerName]}
                        adjustsFontSizeToFit
                        minimumFontScale={0.78}
                        numberOfLines={1}>
                        {player.name}
                      </Text>
                      <Text
                        style={[
                          styles.bodyCell,
                          styles.pointsCell,
                          styles.pointsValue,
                          isCompact && styles.bodyCellCompact,
                        ]}>
                        {player.points}
                      </Text>
                      <Text
                        style={[
                          styles.bodyCell,
                          styles.playedCell,
                          isCompact && styles.bodyCellCompact,
                        ]}>
                        {player.played}
                      </Text>
                      <Text
                        style={[
                          styles.bodyCell,
                          styles.ballsCell,
                          isCompact && styles.bodyCellCompact,
                        ]}>
                        {player.balls}
                      </Text>
                    </View>
                  );
                })}

                {players.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>
                      No hay jugadores registrados para esta liga.
                    </Text>
                  </View>
                ) : null}
              </ScrollView>
            )}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F6EC',
  },
  headerBand: {
    minHeight: 98,
    backgroundColor: '#F8F6EC',
    paddingHorizontal: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 43,
    fontWeight: '900',
    color: '#000000',
  },
  titleCompact: {
    fontSize: 34,
  },
  logo: {
    width: 62,
    height: 62,
  },
  logoCompact: {
    width: 50,
    height: 50,
  },
  container: {
    flex: 1,
    backgroundColor: '#F8F6EC',
    paddingHorizontal: 18,
    paddingBottom: 18,
    alignItems: 'center',
  },
  content: {
    flex: 1,
    width: '100%',
    maxWidth: 1260,
  },
  legend: {
    minHeight: 70,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  legendCompact: {
    minHeight: 58,
    gap: 8,
  },
  legendPill: {
    minHeight: 44,
    borderRadius: 22,
    paddingHorizontal: 20,
    borderWidth: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F7F8FA',
  },
  goldPill: {
    borderColor: '#EED841',
  },
  silverPill: {
    borderColor: '#2C86D9',
  },
  legendDot: {
    width: 23,
    height: 23,
    borderRadius: 11.5,
  },
  goldDot: {
    backgroundColor: '#FFE13F',
  },
  silverDot: {
    backgroundColor: '#2C8CE6',
  },
  legendText: {
    fontSize: 22,
    fontWeight: '600',
    color: '#000000',
  },
  legendTextCompact: {
    fontSize: 15,
  },
  tableShell: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    ...buildShadow({
      color: '#8E8A80',
      offset: { width: 0, height: 8 },
      opacity: 0.18,
      radius: 16,
      elevation: 8,
      web: '0px 8px 16px rgba(142, 138, 128, 0.18)',
    }),
  },
  tableHeader: {
    minHeight: 48,
    marginHorizontal: 12,
    marginTop: 10,
    borderRadius: 13,
    backgroundColor: '#45B85A',
    flexDirection: 'row',
    alignItems: 'center',
  },
  tableHeaderCompact: {
    minHeight: 42,
    marginHorizontal: 8,
    marginTop: 8,
    borderRadius: 11,
  },
  tableBody: {
    flex: 1,
  },
  tableContent: {
    paddingTop: 4,
    paddingBottom: 16,
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tableRow: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#D3D3D3',
  },
  tableRowCompact: {
    minHeight: 34,
  },
  classificationStripe: {
    width: 7,
    height: '88%',
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
    marginRight: 5,
  },
  goldStripe: {
    backgroundColor: '#FFE13F',
  },
  silverStripe: {
    backgroundColor: '#2C8CE6',
  },
  headerCell: {
    paddingHorizontal: 4,
    textAlign: 'center',
    fontSize: 19,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  headerCellCompact: {
    fontSize: 13,
  },
  headerCellTiny: {
    fontSize: 11,
  },
  bodyCell: {
    paddingHorizontal: 4,
    textAlign: 'center',
    fontSize: 16,
    color: '#000000',
  },
  bodyCellCompact: {
    fontSize: 13,
  },
  positionCell: {
    width: '8%',
  },
  nameCell: {
    flex: 1,
    textAlign: 'left',
  },
  pointsCell: {
    width: '16%',
  },
  playedCell: {
    width: '15%',
  },
  ballsCell: {
    width: '17%',
  },
  playerName: {
    fontWeight: '500',
  },
  pointsValue: {
    fontWeight: '900',
  },
  emptyState: {
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: '#8C7B73',
  },
  buttonPressed: {
    opacity: 0.74,
  },
});

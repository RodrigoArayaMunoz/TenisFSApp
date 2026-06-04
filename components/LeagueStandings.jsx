import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
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
  fetchLeagueStandings,
  isSupabaseConfigured,
} from '../services/resultService';

export default function LeagueStandings({ leagueId = 'B', backTo = '/login' }) {
  const [players, setPlayers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

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
        Alert.alert('No se pudo cargar la tabla', error.message);
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
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable
            style={styles.backButton}
            onPress={() => router.replace(backTo)}>
            <Feather name="arrow-left" size={22} color="#FFFFFF" />
          </Pressable>

          <View style={styles.titleBlock}>
            <Text style={styles.title}>Liga {leagueId}</Text>
            <Text style={styles.subtitle}>Tabla de posiciones</Text>
          </View>

          <Image
            source={require('../assets/images/logofs.png')}
            style={styles.logo}
            contentFit="contain"
          />
        </View>

        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendSwatch, styles.goldSwatch]} />
            <Text style={styles.legendText}>Clasificados a copa de oro</Text>
          </View>

          <View style={styles.legendItem}>
            <View style={[styles.legendSwatch, styles.silverSwatch]} />
            <Text style={styles.legendText}>Clasificados a copa de plata</Text>
          </View>
        </View>

        <View style={styles.tableShell}>
          <View style={styles.tableHeader}>
            <Text style={[styles.headerCell, styles.positionCell]}>#</Text>
            <Text style={[styles.headerCell, styles.nameCell]}>Jugador</Text>
            <Text style={styles.headerCell}>Puntos</Text>
            <Text style={styles.headerCell}>P/Jugados</Text>
            <Text style={styles.headerCell}>Pelotas</Text>
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
              {players.map((player, index) => (
                <View
                  key={player.id}
                  style={[
                    styles.tableRow,
                    index < 8 && styles.goldRow,
                    index >= 8 && index < 16 && styles.silverRow,
                  ]}>
                  <Text style={[styles.bodyCell, styles.positionCell]}>
                    {index + 1}
                  </Text>
                  <Text
                    style={[styles.bodyCell, styles.nameCell, styles.playerName]}
                    numberOfLines={2}>
                    {player.name}
                  </Text>
                  <Text style={[styles.bodyCell, styles.pointsCell]}>
                    {player.points}
                  </Text>
                  <Text style={styles.bodyCell}>{player.played}</Text>
                  <Text style={styles.bodyCell}>{player.balls}</Text>
                </View>
              ))}

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
    paddingBottom: 24,
  },
  header: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: '#A66132',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBlock: {
    flex: 1,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: '#3A312C',
  },
  subtitle: {
    marginTop: 2,
    fontSize: 15,
    fontWeight: '700',
    color: '#8C7B73',
  },
  logo: {
    width: 60,
    height: 60,
  },
  legend: {
    gap: 8,
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  legendSwatch: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#D8C9BA',
  },
  goldSwatch: {
    backgroundColor: '#FFF36A',
  },
  silverSwatch: {
    backgroundColor: '#A7D8F5',
  },
  legendText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
    color: '#4A3C32',
  },
  tableShell: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E1D4C8',
  },
  tableHeader: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#355F9F',
    borderBottomWidth: 4,
    borderBottomColor: '#D8E445',
  },
  tableBody: {
    flex: 1,
  },
  tableContent: {
    paddingBottom: 8,
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tableRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#ECE4DB',
  },
  goldRow: {
    backgroundColor: '#FFF36A',
  },
  silverRow: {
    backgroundColor: '#A7D8F5',
  },
  headerCell: {
    flex: 0.8,
    paddingHorizontal: 5,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  bodyCell: {
    flex: 0.8,
    paddingHorizontal: 5,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '700',
    color: '#4A3C32',
  },
  positionCell: {
    flex: 0.4,
  },
  nameCell: {
    flex: 1.55,
    textAlign: 'left',
  },
  playerName: {
    color: '#2D3441',
  },
  pointsCell: {
    color: '#A66132',
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
});

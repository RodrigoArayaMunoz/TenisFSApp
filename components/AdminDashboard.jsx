import { AntDesign, Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const PENDING_RESULTS = [
  {
    id: 'result-1',
    league: 'B',
    players: [
      { name: 'Rodrigo Araya', scores: [6, 2, 10] },
      { name: 'Felipe Soto', scores: [4, 6, 7] },
    ],
    ballsProvider: 'Rodrigo Araya',
  },
  {
    id: 'result-2',
    league: 'B',
    players: [
      { name: 'Luis Medina', scores: [6, 6, null] },
      { name: 'Alexis Urbina', scores: [3, 4, null] },
    ],
    ballsProvider: 'Alexis Urbina',
  },
  {
    id: 'result-3',
    league: 'C',
    players: [
      { name: 'Jugador Liga C 1', scores: [7, 4, 10] },
      { name: 'Jugador Liga C 2', scores: [5, 6, 8] },
    ],
    ballsProvider: 'Jugador Liga C 2',
  },
  {
    id: 'result-4',
    league: 'B',
    players: [
      { name: 'Daniel Caroca', scores: [7, 6, null] },
      { name: 'Rodolfo Hernandez', scores: [5, 4, null] },
    ],
    ballsProvider: 'Daniel Caroca',
  },
  {
    id: 'result-5',
    league: 'B',
    players: [
      { name: 'Franco Villarroel', scores: [4, 6, 10] },
      { name: 'Marcos Villenas', scores: [6, 3, 8] },
    ],
    ballsProvider: 'Marcos Villenas',
  },
  {
    id: 'result-6',
    league: 'C',
    players: [
      { name: 'Carlos Riquelme', scores: [6, 7, null] },
      { name: 'Ignacio Morales', scores: [2, 5, null] },
    ],
    ballsProvider: 'Ignacio Morales',
  },
  {
    id: 'result-7',
    league: 'B',
    players: [
      { name: 'Leonel Rojas', scores: [6, 2, 7] },
      { name: 'Jorge Labrin', scores: [3, 6, 10] },
    ],
    ballsProvider: 'Jorge Labrin',
  },
  {
    id: 'result-8',
    league: 'C',
    players: [
      { name: 'Sebastian Fuentes', scores: [6, 6, null] },
      { name: 'Pablo Carrasco', scores: [1, 4, null] },
    ],
    ballsProvider: 'Sebastian Fuentes',
  },
  {
    id: 'result-9',
    league: 'B',
    players: [
      { name: 'Francisco Arias', scores: [7, 3, 10] },
      { name: 'Bryan Barra', scores: [6, 6, 12] },
    ],
    ballsProvider: 'Francisco Arias',
  },
  {
    id: 'result-10',
    league: 'B',
    players: [
      { name: 'Felipe Retamal', scores: [6, 6, null] },
      { name: 'Ricardo Munoz', scores: [4, 2, null] },
    ],
    ballsProvider: 'Felipe Retamal',
  },
  {
    id: 'result-11',
    league: 'C',
    players: [
      { name: 'Matias Contreras', scores: [5, 6, 10] },
      { name: 'Cristobal Salazar', scores: [7, 4, 6] },
    ],
    ballsProvider: 'Cristobal Salazar',
  },
  {
    id: 'result-12',
    league: 'B',
    players: [
      { name: 'Jaime Maripangui', scores: [6, 7, null] },
      { name: 'Andres Tello', scores: [4, 5, null] },
    ],
    ballsProvider: 'Andres Tello',
  },
  {
    id: 'result-13',
    league: 'C',
    players: [
      { name: 'Nicolas Paredes', scores: [6, 3, 8] },
      { name: 'Tomas Sepulveda', scores: [4, 6, 10] },
    ],
    ballsProvider: 'Nicolas Paredes',
  },
  {
    id: 'result-14',
    league: 'B',
    players: [
      { name: 'Jose Valenzuela', scores: [6, 4, 10] },
      { name: 'Benjamin Mellado', scores: [3, 6, 7] },
    ],
    ballsProvider: 'Jose Valenzuela',
  },
  {
    id: 'result-15',
    league: 'C',
    players: [
      { name: 'Diego Herrera', scores: [6, 6, null] },
      { name: 'Martin Espinoza', scores: [4, 1, null] },
    ],
    ballsProvider: 'Martin Espinoza',
  },
  {
    id: 'result-16',
    league: 'B',
    players: [
      { name: 'Diego Lopez', scores: [7, 2, 10] },
      { name: 'Alvaro Villegas', scores: [5, 6, 4] },
    ],
    ballsProvider: 'Alvaro Villegas',
  },
  {
    id: 'result-17',
    league: 'C',
    players: [
      { name: 'Felipe Andrade', scores: [4, 6, 10] },
      { name: 'Raimundo Soto', scores: [6, 3, 8] },
    ],
    ballsProvider: 'Felipe Andrade',
  },
  {
    id: 'result-18',
    league: 'B',
    players: [
      { name: 'Matias Espinoza', scores: [6, 7, null] },
      { name: 'Diego Valenzuela', scores: [2, 5, null] },
    ],
    ballsProvider: 'Diego Valenzuela',
  },
  {
    id: 'result-19',
    league: 'C',
    players: [
      { name: 'Agustin Molina', scores: [7, 6, null] },
      { name: 'Vicente Reyes', scores: [6, 4, null] },
    ],
    ballsProvider: 'Vicente Reyes',
  },
  {
    id: 'result-20',
    league: 'B',
    players: [
      { name: 'Luis Medina', scores: [3, 6, 10] },
      { name: 'Franco Villarroel', scores: [6, 4, 12] },
    ],
    ballsProvider: 'Luis Medina',
  },
  {
    id: 'result-21',
    league: 'C',
    players: [
      { name: 'Joaquin Vera', scores: [6, 1, 10] },
      { name: 'Bruno Castillo', scores: [2, 6, 5] },
    ],
    ballsProvider: 'Joaquin Vera',
  },
  {
    id: 'result-22',
    league: 'B',
    players: [
      { name: 'Alexis Urbina', scores: [6, 6, null] },
      { name: 'Jorge Labrin', scores: [4, 3, null] },
    ],
    ballsProvider: 'Jorge Labrin',
  },
  {
    id: 'result-23',
    league: 'C',
    players: [
      { name: 'Hector Figueroa', scores: [5, 6, 10] },
      { name: 'Lucas Munoz', scores: [7, 2, 6] },
    ],
    ballsProvider: 'Lucas Munoz',
  },
];

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

  const filteredResults = useMemo(
    () =>
      activeLeague
        ? PENDING_RESULTS.filter((result) => result.league === activeLeague)
        : PENDING_RESULTS,
    [activeLeague]
  );

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

        <ScrollView
          style={styles.resultsList}
          contentContainerStyle={styles.resultsContent}
          showsVerticalScrollIndicator={false}>
          {filteredResults.map((result) => (
            <View key={result.id} style={styles.resultRow}>
              <ResultCard result={result} />

              <View style={styles.actionsColumn}>
                <Pressable style={[styles.actionButton, styles.validateButton]}>
                  <Feather name="check" size={19} color="#2F8A4D" />
                </Pressable>

                <Pressable style={[styles.actionButton, styles.rejectButton]}>
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

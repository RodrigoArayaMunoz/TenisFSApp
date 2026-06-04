import { Feather, FontAwesome } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  fetchPlayersByLeague,
  isSupabaseConfigured,
  submitPendingMatchResult,
} from '../services/resultService';

const LEAGUE_ID = 'B';

const LEAGUE_B_PLAYERS = [
  'Luis Medina',
  'Alexis Urbina',
  'Daniel Caroca',
  'Rodolfo Hernandez',
  'Franco Villarroel',
  'Marcos Villenas',
  'Leonel Rojas',
  'Jorge Labrin',
  'Francisco Arias',
  'Bryan Barra',
  'Felipe Retamal',
  'Fe\u00f1a Gonzalez',
  'Ricardo Mu\u00f1oz',
  'Jaime Maripangui',
  'Andres Tello',
  'Jose Valenzuela',
  'Benjamin Mellado',
  'Rodrigo Araya',
  'Diego Lopez',
  'Alvaro Villegas',
  'Matias Espinoza',
  'Diego Valenzuela',
];

const INITIAL_ROWS = [
  {
    id: 'playerA',
    playerId: null,
    name: '',
    sets: ['', '', ''],
  },
  {
    id: 'playerB',
    playerId: null,
    name: '',
    sets: ['', '', ''],
  },
];

const FALLBACK_PLAYERS = LEAGUE_B_PLAYERS.map((name) => ({
  id: null,
  name,
}));

const parseScore = (value) => {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return null;
  }

  const parsedValue = Number.parseInt(trimmedValue, 10);
  return Number.isNaN(parsedValue) ? null : parsedValue;
};

const getRegularSetWinner = (playerAScore, playerBScore, setNumber) => {
  if (playerAScore === null || playerBScore === null) {
    return {
      error: `Debe completar ambos marcadores del set ${setNumber}.`,
    };
  }

  if (playerAScore === playerBScore) {
    return {
      error: `El set ${setNumber} no puede terminar empatado.`,
    };
  }

  const higherScore = Math.max(playerAScore, playerBScore);
  const lowerScore = Math.min(playerAScore, playerBScore);

  const isValidSetScore =
    (higherScore === 6 && lowerScore <= 4) ||
    (higherScore === 7 && (lowerScore === 5 || lowerScore === 6));

  if (!isValidSetScore) {
    return {
      error: `El marcador del set ${setNumber} no es válido.`,
    };
  }

  return {
    winnerIndex: playerAScore > playerBScore ? 0 : 1,
  };
};

const getSuperTiebreakWinner = (playerAScore, playerBScore) => {
  if (playerAScore === null || playerBScore === null) {
    return {
      error: 'Debe completar ambos puntajes del supertiebreak.',
    };
  }

  if (playerAScore === playerBScore) {
    return {
      error: 'El supertiebreak no puede terminar empatado.',
    };
  }

  const higherScore = Math.max(playerAScore, playerBScore);
  const lowerScore = Math.min(playerAScore, playerBScore);

  if (higherScore < 10 || higherScore - lowerScore < 2) {
    return {
      error: 'El supertiebreak debe ganarse con al menos 10 puntos y 2 de diferencia.',
    };
  }

  return {
    winnerIndex: playerAScore > playerBScore ? 0 : 1,
  };
};

const calculateMatchResult = (rows) => {
  const [playerA, playerB] = rows;

  if (!playerA.name || !playerB.name) {
    return {
      error: 'Debe seleccionar a ambos jugadores.',
    };
  }

  if (playerA.name === playerB.name) {
    return {
      error: 'Los jugadores no pueden ser iguales.',
    };
  }

  const parsedSets = [0, 1, 2].map((setIndex) => [
    parseScore(playerA.sets[setIndex]),
    parseScore(playerB.sets[setIndex]),
  ]);

  const firstSetResult = getRegularSetWinner(parsedSets[0][0], parsedSets[0][1], 1);
  if (firstSetResult.error) {
    return firstSetResult;
  }

  const secondSetResult = getRegularSetWinner(parsedSets[1][0], parsedSets[1][1], 2);
  if (secondSetResult.error) {
    return secondSetResult;
  }

  const hasSuperTiebreakValues =
    parsedSets[2][0] !== null || parsedSets[2][1] !== null;

  if (firstSetResult.winnerIndex === secondSetResult.winnerIndex) {
    if (hasSuperTiebreakValues) {
      return {
        error: 'Si el partido terminó 2-0, no debe ingresar supertiebreak.',
      };
    }

    const winnerIndex = firstSetResult.winnerIndex;
    const loserIndex = winnerIndex === 0 ? 1 : 0;

    return {
      winner: rows[winnerIndex].name,
      loser: rows[loserIndex].name,
      winnerIndex,
      loserIndex,
      winnerPoints: 3,
      loserPoints: 0,
      setsScore: '2-0',
      decidedBySuperTiebreak: false,
      parsedSets,
    };
  }

  const superTiebreakResult = getSuperTiebreakWinner(
    parsedSets[2][0],
    parsedSets[2][1]
  );

  if (superTiebreakResult.error) {
    return superTiebreakResult;
  }

  const winnerIndex = superTiebreakResult.winnerIndex;
  const loserIndex = winnerIndex === 0 ? 1 : 0;

  return {
    winner: rows[winnerIndex].name,
    loser: rows[loserIndex].name,
    winnerIndex,
    loserIndex,
    winnerPoints: 2,
    loserPoints: 1,
    setsScore: '2-1',
    decidedBySuperTiebreak: true,
    parsedSets,
  };
};

const buildWhatsAppMessage = ({ rows, result, ballProvider }) => {
  const [playerA, playerB] = rows;
  const formatScore = (score) => String(score === null ? '-' : score);
  const formatPlayerLine = (player, scores) => {
    const playerLine = `${player.name}: ${scores.map(formatScore).join('-')}`;

    return player.name === result.winner ? `*${playerLine}*` : playerLine;
  };

  return [
    'Resultado Liga B',
    '',
    formatPlayerLine(
      playerA,
      result.parsedSets.map((set) => set[0])
    ),
    formatPlayerLine(
      playerB,
      result.parsedSets.map((set) => set[1])
    ),
    '',
    `*Ganador: ${result.winner}*`,
    `🎾🎾🎾 Pelotas: ${ballProvider}`,
  ].join('\n');
};

const openWhatsAppShare = async (message) => {
  const encodedMessage = encodeURIComponent(message);
  const appUrl = `whatsapp://send?text=${encodedMessage}`;
  const webUrl = `https://wa.me/?text=${encodedMessage}`;

  if (Platform.OS === 'web') {
    await Linking.openURL(webUrl);
    return;
  }

  const canOpenWhatsApp = await Linking.canOpenURL(appUrl);

  if (canOpenWhatsApp) {
    await Linking.openURL(appUrl);
    return;
  }

  await Linking.openURL(webUrl);
};

export default function RegisterResult() {
  const [rows, setRows] = useState(INITIAL_ROWS);
  const [activePickerRow, setActivePickerRow] = useState(null);
  const [playerSearch, setPlayerSearch] = useState('');
  const [ballProvider, setBallProvider] = useState('');
  const [availablePlayers, setAvailablePlayers] = useState(FALLBACK_PLAYERS);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const loadPlayers = async () => {
      if (!isSupabaseConfigured) {
        return;
      }

      try {
        const players = await fetchPlayersByLeague(LEAGUE_ID);

        if (players.length > 0) {
          setAvailablePlayers(players);
        }
      } catch {
        setAvailablePlayers(FALLBACK_PLAYERS);
      }
    };

    loadPlayers();
  }, []);

  const updatePlayer = (rowIndex, player) => {
    setRows((currentRows) =>
      currentRows.map((row, index) =>
        index === rowIndex
          ? { ...row, playerId: player.id, name: player.name }
          : row
      )
    );
  };

  const updateSet = (rowIndex, setIndex, value) => {
    const sanitizedValue = value.replace(/[^0-9]/g, '');

    setRows((currentRows) =>
      currentRows.map((row, index) =>
        index === rowIndex
          ? {
              ...row,
              sets: row.sets.map((setValue, currentSetIndex) =>
                currentSetIndex === setIndex ? sanitizedValue : setValue
              ),
            }
          : row
      )
    );
  };

  const openPlayerPicker = (rowIndex) => {
    setActivePickerRow(rowIndex);
    setPlayerSearch('');
  };

  const closePlayerPicker = () => {
    setActivePickerRow(null);
    setPlayerSearch('');
  };

  const handlePlayerSelect = (player) => {
    if (activePickerRow === null) {
      return;
    }

    if (rows[activePickerRow]?.name === ballProvider) {
      setBallProvider('');
    }

    updatePlayer(activePickerRow, player);
    closePlayerPicker();
  };

  const selectedByOtherRow =
    activePickerRow === null
      ? []
      : rows
          .filter((_, index) => index !== activePickerRow)
          .map((row) => row.name)
          .filter(Boolean);

  const query = playerSearch.trim().toLowerCase();
  const filteredPlayers = !query
    ? availablePlayers
    : availablePlayers.filter((player) =>
        player.name.toLowerCase().includes(query)
      );

  const handleSubmitResult = async () => {
    const result = calculateMatchResult(rows);

    if (result.error) {
      Alert.alert('Resultado inválido', result.error);
      return;
    }

    if (!ballProvider) {
      Alert.alert('Faltan pelotas', 'Debe seleccionar quien puso las pelotas.');
      return;
    }

    if (!isSupabaseConfigured) {
      Alert.alert(
        'Supabase no configurado',
        'Debe configurar EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_ANON_KEY para guardar resultados.'
      );
      return;
    }

    const ballProviderRow = rows.find((row) => row.name === ballProvider);
    const hasMissingPlayerIds = rows.some((row) => !row.playerId);

    if (hasMissingPlayerIds || !ballProviderRow?.playerId) {
      Alert.alert(
        'Jugadores no sincronizados',
        'Los jugadores deben existir en la tabla players de Supabase antes de enviar resultados.'
      );
      return;
    }

    const winnerRow = rows[result.winnerIndex];
    const loserRow = rows[result.loserIndex];
    const set3PlayerA = result.decidedBySuperTiebreak
      ? result.parsedSets[2][0]
      : null;
    const set3PlayerB = result.decidedBySuperTiebreak
      ? result.parsedSets[2][1]
      : null;

    setIsSubmitting(true);

    try {
      const whatsAppMessage = buildWhatsAppMessage({
        rows,
        result,
        ballProvider,
      });

      await submitPendingMatchResult({
        league_id: LEAGUE_ID,
        player_a_id: rows[0].playerId,
        player_b_id: rows[1].playerId,
        ball_provider_id: ballProviderRow.playerId,
        winner_id: winnerRow.playerId,
        loser_id: loserRow.playerId,
        winner_points: result.winnerPoints,
        loser_points: result.loserPoints,
        sets_score: result.setsScore,
        set_1_player_a: result.parsedSets[0][0],
        set_1_player_b: result.parsedSets[0][1],
        set_2_player_a: result.parsedSets[1][0],
        set_2_player_b: result.parsedSets[1][1],
        set_3_player_a: set3PlayerA,
        set_3_player_b: set3PlayerB,
        status: 'Pendiente',
      });

      setRows(INITIAL_ROWS);
      setBallProvider('');

      try {
        await openWhatsAppShare(whatsAppMessage);
      } catch {
        Alert.alert(
          'Resultado enviado',
          'El resultado quedo Pendiente, pero no se pudo abrir WhatsApp.'
        );
      }
    } catch (error) {
      Alert.alert('No se pudo guardar', error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={styles.logoSection}>
          <Image
            source={require('../assets/images/logofs.png')}
            style={styles.logo}
            contentFit="contain"
          />
        </View>

        <View style={styles.centerSection}>
          <View style={styles.scoreboardCard}>
            <Text style={styles.scoreboardTitle}>Marcador</Text>

            <View style={styles.table}>
              <View style={styles.setsHeaderRow}>
                <View style={styles.playerHeaderCell} />
                <Text style={styles.setHeaderText}>S1</Text>
                <Text style={styles.setHeaderText}>S2</Text>
                <Text style={styles.setHeaderText}>S3</Text>
              </View>

              {rows.map((row, rowIndex) => (
                <View
                  key={row.id}
                  style={[
                    styles.tableRow,
                    rowIndex === rows.length - 1 && styles.lastTableRow,
                  ]}>
                  <Pressable
                    style={styles.playerCell}
                    onPress={() => openPlayerPicker(rowIndex)}>
                    <Text
                      style={[
                        styles.playerInput,
                        !row.name && styles.playerPlaceholder,
                      ]}
                      numberOfLines={2}>
                      {row.name || 'Seleccionar'}
                    </Text>
                    <Feather name="chevron-down" size={18} color="#FFFFFF" />
                  </Pressable>

                  {row.sets.slice(0, 3).map((setValue, setIndex) => (
                    <View key={`${row.id}-set-${setIndex}`} style={styles.setCell}>
                      <TextInput
                        value={setValue}
                        onChangeText={(value) =>
                          updateSet(rowIndex, setIndex, value)
                        }
                        keyboardType="number-pad"
                        maxLength={2}
                        style={styles.scoreInput}
                        selectionColor="#3B66A7"
                      />
                    </View>
                  ))}
                </View>
              ))}
            </View>

            <View style={styles.ballsSection}>
              <Text style={styles.ballsTitle}>Pelotas</Text>

              <View style={styles.ballsOptions}>
                {rows.map((row) => {
                  const isSelected = row.name === ballProvider;
                  const isDisabled = !row.name;

                  return (
                    <Pressable
                      key={`${row.id}-balls`}
                      style={[
                        styles.ballOption,
                        isSelected && styles.ballOptionSelected,
                        isDisabled && styles.ballOptionDisabled,
                      ]}
                      onPress={() => setBallProvider(row.name)}
                      disabled={isDisabled}>
                      <View
                        style={[
                          styles.radioOuter,
                          isSelected && styles.radioOuterSelected,
                        ]}>
                        {isSelected ? <View style={styles.radioInner} /> : null}
                      </View>

                      <Text
                        style={[
                          styles.ballOptionText,
                          isSelected && styles.ballOptionTextSelected,
                        ]}
                        numberOfLines={2}>
                        {row.name || 'Seleccione jugador'}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>

          <Pressable
            style={[styles.primaryButton, isSubmitting && styles.buttonDisabled]}
            onPress={handleSubmitResult}
            disabled={isSubmitting}>
            <Text style={styles.primaryButtonText}>
              {isSubmitting ? 'Enviando...' : 'Enviar Resultado'}
            </Text>
            <FontAwesome name="whatsapp" size={24} color="#FFFFFF" />
          </Pressable>
        </View>

        <View style={styles.footerSection}>
          <Pressable
            style={styles.secondaryButton}
            onPress={() => router.replace('/login')}>
            <Feather name="arrow-left" size={22} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>Volver a menu principal</Text>
          </Pressable>
        </View>
      </ScrollView>

      <Modal
        visible={activePickerRow !== null}
        transparent
        animationType="fade"
        onRequestClose={closePlayerPicker}>
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={closePlayerPicker} />

          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Seleccionar jugador</Text>
              <Pressable hitSlop={8} onPress={closePlayerPicker}>
                <Feather name="x" size={22} color="#8C7B73" />
              </Pressable>
            </View>

            <View style={styles.searchShell}>
              <Feather name="search" size={18} color="#9A8D84" />
              <TextInput
                value={playerSearch}
                onChangeText={setPlayerSearch}
                placeholder="Buscar jugador"
                placeholderTextColor="#9A8D84"
                style={styles.searchInput}
                selectionColor="#A66132"
              />
            </View>

            <ScrollView
              style={styles.optionsList}
              contentContainerStyle={styles.optionsContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}>
              {filteredPlayers.map((player) => {
                const isDisabled = selectedByOtherRow.includes(player.name);
                const isSelected =
                  activePickerRow !== null &&
                  rows[activePickerRow]?.name === player.name;

                return (
                  <Pressable
                    key={player.id ?? player.name}
                    style={[
                      styles.optionRow,
                      isSelected && styles.optionRowSelected,
                      isDisabled && styles.optionRowDisabled,
                    ]}
                    onPress={() => handlePlayerSelect(player)}
                    disabled={isDisabled}>
                    <Text
                      style={[
                        styles.optionText,
                        isSelected && styles.optionTextSelected,
                        isDisabled && styles.optionTextDisabled,
                      ]}>
                      {player.name}
                    </Text>

                    {isSelected ? (
                      <Feather name="check" size={18} color="#A66132" />
                    ) : null}
                  </Pressable>
                );
              })}

              {filteredPlayers.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>
                    No se encontraron jugadores.
                  </Text>
                </View>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7F3EE',
  },
  container: {
    flexGrow: 1,
    backgroundColor: '#F7F3EE',
    paddingHorizontal: 24,
    paddingTop: 0,
    paddingBottom: 26,
    justifyContent: 'space-between',
  },
  logoSection: {
    flex: 0.8,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 0,
    paddingBottom: 10,
  },
  logo: {
    width: 170,
    height: 170,
  },
  centerSection: {
    flex: 1.2,
    width: '100%',
    justifyContent: 'center',
    marginBottom: 54,
  },
  scoreboardCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 16,
    shadowColor: '#9F6A3F',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.13,
    shadowRadius: 24,
    elevation: 10,
  },
  scoreboardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#8C7B73',
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  table: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#DDE4EF',
  },
  setsHeaderRow: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F6F8FB',
    borderBottomWidth: 1,
    borderBottomColor: '#DDE4EF',
  },
  playerHeaderCell: {
    flex: 2.25,
    borderRightWidth: 4,
    borderRightColor: '#D8E445',
  },
  setHeaderText: {
    flex: 0.52,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '800',
    color: '#6E7890',
  },
  tableRow: {
    flexDirection: 'row',
    minHeight: 58,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#DDE4EF',
  },
  lastTableRow: {
    borderBottomWidth: 0,
  },
  playerCell: {
    flex: 2.25,
    backgroundColor: '#355F9F',
    paddingHorizontal: 8,
    justifyContent: 'space-between',
    alignItems: 'center',
    flexDirection: 'row',
    borderRightWidth: 4,
    borderRightColor: '#D8E445',
  },
  playerInput: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    paddingVertical: 0,
    flex: 1,
    marginRight: 6,
  },
  playerPlaceholder: {
    color: '#D9E1F4',
  },
  setCell: {
    flex: 0.52,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FCFCFD',
    borderRightWidth: 1,
    borderRightColor: '#E7ECF4',
  },
  scoreInput: {
    width: '100%',
    textAlign: 'center',
    color: '#141414',
    fontSize: 18,
    fontWeight: '500',
    paddingVertical: 0,
  },
  ballsSection: {
    marginTop: 12,
  },
  ballsTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#6E5C51',
    marginBottom: 8,
  },
  ballsOptions: {
    gap: 8,
  },
  ballOption: {
    minHeight: 38,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E4D9CF',
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  ballOptionSelected: {
    borderColor: '#A66132',
    backgroundColor: '#F8EEE6',
  },
  ballOptionDisabled: {
    opacity: 0.45,
  },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#BDAA9A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: {
    borderColor: '#A66132',
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#A66132',
  },
  ballOptionText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#6E5C51',
  },
  ballOptionTextSelected: {
    color: '#8B522C',
  },
  footerSection: {
    width: '100%',
  },
  primaryButton: {
    minHeight: 60,
    borderRadius: 18,
    backgroundColor: '#2F8A4D',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 18,
    shadowColor: '#2F8A4D',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
    width: '100%',
    marginTop: 30,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  secondaryButton: {
    minHeight: 60,
    borderRadius: 18,
    backgroundColor: '#A66132',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 12,
    shadowColor: '#A66132',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
    width: '100%',
  },
  primaryButtonText: {
    fontSize: 19,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(44, 33, 24, 0.28)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCard: {
    backgroundColor: '#FDF9F3',
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 14,
    maxHeight: '72%',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.16,
    shadowRadius: 30,
    elevation: 14,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#6E5C51',
  },
  searchShell: {
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E4D9CF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 10,
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#3A312C',
    paddingVertical: 10,
  },
  optionsList: {
    maxHeight: 360,
  },
  optionsContent: {
    paddingBottom: 8,
  },
  optionRow: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8DDD1',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  optionRowSelected: {
    borderColor: '#A66132',
    backgroundColor: '#F8EEE6',
  },
  optionRowDisabled: {
    opacity: 0.45,
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#4A3C32',
  },
  optionTextSelected: {
    color: '#8B522C',
  },
  optionTextDisabled: {
    color: '#7E736B',
  },
  emptyState: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 15,
    color: '#8E847D',
  },
});

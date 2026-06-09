import { Feather, FontAwesome } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  fetchPlayersByLeague,
  isSupabaseConfigured,
  submitPendingMatchResult,
} from '../services/resultService';
import { showUserAlert } from '../utils/alerts';

const LEAGUE_ID = 'B';
const RESULT_NOTICE_DURATION = 5000;
const RESULT_REGISTERED_MESSAGE =
  'Resultado registrado, el administrador debe validar el resultado para actualizar la tabla de posiciones.';
const isWeb = Platform.OS === 'web';

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

const shouldEnableSuperTiebreak = (rows) => {
  const [playerA, playerB] = rows;
  const parsedSets = [0, 1].map((setIndex) => [
    parseScore(playerA.sets[setIndex]),
    parseScore(playerB.sets[setIndex]),
  ]);
  const firstSetResult = getRegularSetWinner(parsedSets[0][0], parsedSets[0][1], 1);
  const secondSetResult = getRegularSetWinner(parsedSets[1][0], parsedSets[1][1], 2);

  if (firstSetResult.error || secondSetResult.error) {
    return false;
  }

  return firstSetResult.winnerIndex !== secondSetResult.winnerIndex;
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

const wait = (duration) =>
  new Promise((resolve) => {
    setTimeout(resolve, duration);
  });

export default function RegisterResult() {
  const { width } = useWindowDimensions();
  const [rows, setRows] = useState(INITIAL_ROWS);
  const [activePickerRow, setActivePickerRow] = useState(null);
  const [playerSearch, setPlayerSearch] = useState('');
  const [ballProvider, setBallProvider] = useState('');
  const [availablePlayers, setAvailablePlayers] = useState(FALLBACK_PLAYERS);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResultNotice, setShowResultNotice] = useState(false);
  const isTiny = width < 360;
  const isCompact = width < 520;
  const logoSize = isTiny ? 88 : isCompact ? 108 : 140;
  const scoreBoxSize = isTiny ? 38 : isCompact ? 44 : 62;
  const whatsappIconSize = isCompact ? 30 : 38;
  const isSuperTiebreakEnabled = shouldEnableSuperTiebreak(rows);

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

    setRows((currentRows) => {
      if (setIndex === 2 && !shouldEnableSuperTiebreak(currentRows)) {
        return currentRows;
      }

      const nextRows = currentRows.map((row, index) =>
        index === rowIndex
          ? {
              ...row,
              sets: row.sets.map((setValue, currentSetIndex) =>
                currentSetIndex === setIndex ? sanitizedValue : setValue
              ),
            }
          : row
      );

      if (setIndex < 2 && !shouldEnableSuperTiebreak(nextRows)) {
        return nextRows.map((row) => ({
          ...row,
          sets: row.sets.map((setValue, currentSetIndex) =>
            currentSetIndex === 2 ? '' : setValue
          ),
        }));
      }

      return nextRows;
    });
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
      showUserAlert('Resultado invalido', result.error);
      return;
    }

    if (!ballProvider) {
      showUserAlert('Faltan pelotas', 'Debe seleccionar quien puso las pelotas.');
      return;
    }

    if (!isSupabaseConfigured) {
      showUserAlert(
        'Supabase no configurado',
        'Debe configurar EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_ANON_KEY para guardar resultados.'
      );
      return;
    }

    const ballProviderRow = rows.find((row) => row.name === ballProvider);
    const hasMissingPlayerIds = rows.some((row) => !row.playerId);

    if (hasMissingPlayerIds || !ballProviderRow?.playerId) {
      showUserAlert(
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
      setShowResultNotice(true);
      await wait(RESULT_NOTICE_DURATION);
      setShowResultNotice(false);

      try {
        await openWhatsAppShare(whatsAppMessage);
      } catch {
        showUserAlert(
          'Resultado enviado',
          'El resultado quedo Pendiente, pero no se pudo abrir WhatsApp.'
        );
      }
    } catch (error) {
      setShowResultNotice(false);
      showUserAlert('No se pudo guardar', error.message);
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
            style={[styles.logo, { width: logoSize, height: logoSize }]}
            contentFit="contain"
          />
        </View>

        <View style={styles.centerSection}>
          <View
            style={[
              styles.scoreboardCard,
              isCompact && styles.scoreboardCardCompact,
            ]}>
            <Text
              style={[
                styles.scoreboardTitle,
                isCompact && styles.scoreboardTitleCompact,
              ]}>
              Marcador
            </Text>

            <View style={styles.table}>
              <View style={styles.setsHeaderRow}>
                <View style={styles.playerHeaderCell} />
                {['S1', 'S2', 'S3'].map((setLabel) => (
                  <Text
                    key={setLabel}
                    style={[
                      styles.setHeaderText,
                      { width: scoreBoxSize },
                      isCompact && styles.setHeaderTextCompact,
                    ]}>
                    {setLabel}
                  </Text>
                  ))}
              </View>

              {rows.map((row, rowIndex) => (
                <View
                  key={row.id}
                  style={[
                    styles.tableRow,
                    isCompact && styles.tableRowCompact,
                    rowIndex === rows.length - 1 && styles.lastTableRow,
                  ]}>
                  <Pressable
                    style={[
                      styles.playerCell,
                      isCompact && styles.playerCellCompact,
                    ]}
                    onPress={() => openPlayerPicker(rowIndex)}>
                    <Text
                      style={[
                        styles.playerInput,
                        isCompact && styles.playerInputCompact,
                        !row.name && styles.playerPlaceholder,
                      ]}
                      adjustsFontSizeToFit
                      minimumFontScale={0.72}
                      numberOfLines={1}>
                      {row.name || 'Seleccionar'}
                    </Text>
                    <Feather
                      name="chevron-down"
                      size={isCompact ? 18 : 24}
                      color="#FFFFFF"
                    />
                  </Pressable>

                  {row.sets.slice(0, 3).map((setValue, setIndex) => {
                    const isSetDisabled =
                      setIndex === 2 && !isSuperTiebreakEnabled;

                    return (
                      <View
                        key={`${row.id}-set-${setIndex}`}
                        style={[
                          styles.setCell,
                          isSetDisabled && styles.setCellDisabled,
                          {
                            width: scoreBoxSize,
                            height: scoreBoxSize,
                            borderRadius: isCompact ? 16 : 20,
                          },
                        ]}>
                        <TextInput
                          value={setValue}
                          onChangeText={(value) =>
                            updateSet(rowIndex, setIndex, value)
                          }
                          editable={!isSetDisabled}
                          keyboardType="number-pad"
                          maxLength={2}
                          style={[
                            styles.scoreInput,
                            isCompact && styles.scoreInputCompact,
                            isSetDisabled && styles.scoreInputDisabled,
                          ]}
                          selectionColor="#B36843"
                        />
                      </View>
                    );
                  })}
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
                          isCompact && styles.ballOptionTextCompact,
                          isSelected && styles.ballOptionTextSelected,
                        ]}
                        numberOfLines={1}>
                        {row.name || 'Seleccione jugador'}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>

          <Pressable
            style={[
              styles.primaryButton,
              isCompact && styles.primaryButtonCompact,
              isSubmitting && styles.buttonDisabled,
            ]}
            onPress={handleSubmitResult}
            disabled={isSubmitting}>
            <Text
              style={[
                styles.primaryButtonText,
                isCompact && styles.primaryButtonTextCompact,
              ]}>
              {isSubmitting ? 'Enviando...' : 'Enviar Resultado'}
            </Text>
            <FontAwesome name="whatsapp" size={whatsappIconSize} color="#FFFFFF" />
          </Pressable>
        </View>

        <View style={styles.footerSection}>
          <Pressable
            style={[styles.secondaryButton, isCompact && styles.secondaryButtonCompact]}
            onPress={() => router.replace('/login')}>
            <Feather name="arrow-left" size={isCompact ? 30 : 38} color="#FFFFFF" />
            <Text
              style={[
                styles.primaryButtonText,
                isCompact && styles.primaryButtonTextCompact,
              ]}
              numberOfLines={1}>
              Volver a menu principal
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      {showResultNotice ? (
        <View style={styles.noticeOverlay}>
          <View style={styles.noticeCard}>
            <Feather name="check-circle" size={26} color="#05B743" />
            <Text style={styles.noticeText}>{RESULT_REGISTERED_MESSAGE}</Text>
          </View>
        </View>
      ) : null}

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
    backgroundColor: '#F8F4EF',
  },
  container: {
    flexGrow: 1,
    backgroundColor: '#F8F4EF',
    paddingHorizontal: 18,
    paddingTop: 0,
    paddingBottom: 18,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logoSection: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 10,
    paddingBottom: 16,
  },
  logo: {
    width: 170,
    height: 170,
  },
  centerSection: {
    width: '100%',
    maxWidth: 640,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreboardCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    paddingHorizontal: 22,
    paddingTop: 26,
    paddingBottom: 24,
    ...buildShadow({
      color: '#9F6A3F',
      offset: { width: 0, height: 18 },
      opacity: 0.12,
      radius: 30,
      elevation: 10,
      web: '0px 18px 30px rgba(159, 106, 63, 0.12)',
    }),
  },
  scoreboardCardCompact: {
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingTop: 20,
    paddingBottom: 18,
  },
  scoreboardTitle: {
    fontSize: 44,
    lineHeight: 50,
    fontWeight: '900',
    color: '#3B170F',
    marginBottom: 20,
    textAlign: 'center',
  },
  scoreboardTitleCompact: {
    fontSize: 30,
    lineHeight: 36,
    marginBottom: 14,
  },
  table: {
    width: '100%',
  },
  setsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#D4CDC7',
  },
  playerHeaderCell: {
    flex: 1,
    minWidth: 0,
  },
  setHeaderText: {
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '800',
    color: '#8C8A88',
  },
  setHeaderTextCompact: {
    fontSize: 17,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#D4CDC7',
  },
  tableRowCompact: {
    gap: 7,
    paddingVertical: 9,
  },
  lastTableRow: {
    borderBottomWidth: 1,
  },
  playerCell: {
    flex: 1,
    minHeight: 56,
    minWidth: 0,
    backgroundColor: '#2384D9',
    borderRadius: 14,
    paddingHorizontal: 14,
    justifyContent: 'space-between',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    ...buildShadow({
      color: '#2384D9',
      offset: { width: 0, height: 8 },
      opacity: 0.14,
      radius: 16,
      elevation: 5,
      web: '0px 8px 16px rgba(35, 132, 217, 0.14)',
    }),
  },
  playerCellCompact: {
    minHeight: 44,
    borderRadius: 12,
    paddingHorizontal: 8,
  },
  playerInput: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '800',
    paddingVertical: 0,
    flex: 1,
  },
  playerInputCompact: {
    fontSize: 12,
  },
  playerPlaceholder: {
    color: '#D9E1F4',
  },
  setCell: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 2.5,
    borderColor: '#B36843',
  },
  setCellDisabled: {
    backgroundColor: '#F2ECE7',
    borderColor: '#D6C9BE',
  },
  scoreInput: {
    width: '100%',
    height: '100%',
    textAlign: 'center',
    color: '#3B170F',
    fontSize: 24,
    fontWeight: '900',
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  scoreInputCompact: {
    fontSize: 18,
  },
  scoreInputDisabled: {
    color: '#B9ACA2',
  },
  ballsSection: {
    marginTop: 18,
  },
  ballsTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#3B170F',
    marginBottom: 10,
  },
  ballsOptions: {
    gap: 8,
  },
  ballOption: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  ballOptionDisabled: {
    opacity: 0.45,
  },
  radioOuter: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2.5,
    borderColor: '#B36843',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: {
    borderColor: '#A66132',
  },
  radioInner: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#B36843',
  },
  ballOptionText: {
    flex: 1,
    fontSize: 21,
    color: '#3B170F',
  },
  ballOptionTextCompact: {
    fontSize: 16,
  },
  ballOptionTextSelected: {
    color: '#3B170F',
  },
  footerSection: {
    width: '100%',
    maxWidth: 640,
    marginTop: 14,
  },
  primaryButton: {
    minHeight: 78,
    borderRadius: 26,
    backgroundColor: '#05B743',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 18,
    width: '100%',
    marginTop: 22,
    ...buildShadow({
      color: '#05B743',
      offset: { width: 0, height: 16 },
      opacity: 0.24,
      radius: 24,
      elevation: 8,
      web: '0px 16px 24px rgba(5, 183, 67, 0.24)',
    }),
  },
  primaryButtonCompact: {
    minHeight: 64,
    borderRadius: 22,
    gap: 12,
    marginTop: 18,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  secondaryButton: {
    minHeight: 70,
    borderRadius: 26,
    backgroundColor: '#C6673E',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 16,
    width: '100%',
    paddingHorizontal: 18,
    ...buildShadow({
      color: '#A66132',
      offset: { width: 0, height: 14 },
      opacity: 0.2,
      radius: 20,
      elevation: 8,
      web: '0px 14px 20px rgba(166, 97, 50, 0.2)',
    }),
  },
  secondaryButtonCompact: {
    minHeight: 58,
    borderRadius: 22,
    gap: 12,
  },
  primaryButtonText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  primaryButtonTextCompact: {
    fontSize: 18,
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
    ...buildShadow({
      color: '#000000',
      offset: { width: 0, height: 18 },
      opacity: 0.16,
      radius: 30,
      elevation: 14,
      web: '0px 18px 30px rgba(0, 0, 0, 0.16)',
    }),
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

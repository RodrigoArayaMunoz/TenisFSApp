import { Feather, FontAwesome } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  fetchPlayersByLeague,
  isSupabaseConfigured,
  submitPendingMatchResult,
} from '../services/resultService';
import { showUserAlert } from '../utils/alerts';

const DEFAULT_LEAGUE_ID = 'B';
const PLAYER_PICKER_LEAGUE_IDS = ['B', 'C'];
const RESULT_NOTICE_DURATION = 4500;
const WHATSAPP_FALLBACK_DELAY = 1600;
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

const INITIAL_ROWS = [
  {
    id: 'playerA',
    playerId: null,
    leagueId: null,
    name: '',
    sets: ['', '', ''],
  },
  {
    id: 'playerB',
    playerId: null,
    leagueId: null,
    name: '',
    sets: ['', '', ''],
  },
];

const normalizePlayer = (player, fallbackLeagueId = null) => ({
  id: player.id ?? null,
  leagueId: player.leagueId ?? player.league_id ?? fallbackLeagueId,
  name: player.name,
});

const mergePlayers = (leaguePlayers) => {
  const playersByKey = new Map();

  leaguePlayers.flat().forEach((player) => {
    const normalizedPlayer = normalizePlayer(player);
    const playerKey =
      normalizedPlayer.id ??
      `${normalizedPlayer.leagueId ?? 'sin-liga'}-${normalizedPlayer.name}`;

    if (!playersByKey.has(playerKey)) {
      playersByKey.set(playerKey, normalizedPlayer);
    }
  });

  return Array.from(playersByKey.values()).sort((firstPlayer, secondPlayer) =>
    firstPlayer.name.localeCompare(secondPlayer.name, 'es')
  );
};

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

  if (
    playerA.leagueId &&
    playerB.leagueId &&
    playerA.leagueId !== playerB.leagueId
  ) {
    return {
      error:
        'No se puede enviar el resultado. Los jugadores no pertenecen a la misma Liga',
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

const buildWhatsAppLinks = (message) => {
  const encodedMessage = encodeURIComponent(message);

  return {
    appUrl: `whatsapp://send?text=${encodedMessage}`,
    androidIntentUrl:
      `intent://send?text=${encodedMessage}` +
      '#Intent;scheme=whatsapp;end',
    fallbackUrl: `https://wa.me/?text=${encodedMessage}`,
  };
};

const getWhatsAppWebLaunchUrl = ({ appUrl, androidIntentUrl }) => {
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';

  return /Android/i.test(userAgent) ? androidIntentUrl : appUrl;
};

const openWhatsAppFromWeb = (links) => {
  if (typeof window === 'undefined') {
    return;
  }

  const launchUrl = getWhatsAppWebLaunchUrl(links);
  let fallbackTimeoutId;
  let openedExternalApp = false;

  const markExternalAppOpened = () => {
    openedExternalApp = true;
    cleanup();
  };

  const handleVisibilityChange = () => {
    if (typeof document !== 'undefined' && document.hidden) {
      markExternalAppOpened();
    }
  };

  const cleanup = () => {
    if (fallbackTimeoutId) {
      window.clearTimeout(fallbackTimeoutId);
      fallbackTimeoutId = null;
    }

    window.removeEventListener('blur', markExternalAppOpened);
    window.removeEventListener('pagehide', markExternalAppOpened);

    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    }
  };

  window.addEventListener('blur', markExternalAppOpened, { once: true });
  window.addEventListener('pagehide', markExternalAppOpened, { once: true });

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', handleVisibilityChange);
  }

  fallbackTimeoutId = window.setTimeout(() => {
    cleanup();

    const pageIsHidden = typeof document !== 'undefined' && document.hidden;

    if (!openedExternalApp && !pageIsHidden) {
      window.location.assign(links.fallbackUrl);
    }
  }, WHATSAPP_FALLBACK_DELAY);

  try {
    window.location.assign(launchUrl);
  } catch {
    cleanup();
    window.location.assign(links.fallbackUrl);
  }
};

const openWhatsAppShare = async (message) => {
  const links = buildWhatsAppLinks(message);

  if (Platform.OS === 'web') {
    openWhatsAppFromWeb(links);
    return;
  }

  try {
    await Linking.openURL(links.appUrl);
  } catch {
    await Linking.openURL(links.fallbackUrl);
  }
};

function FormSelector({ label, value, placeholder, onPress, disabled, scale }) {
  return (
    <View style={[styles.selectorRow, { gap: 10 * scale }]}>
      <Text style={[styles.fieldLabel, { width: 84 * scale, fontSize: 16 * scale }]}>
        {label}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={'Seleccionar ' + label.toLowerCase()}
        accessibilityValue={{ text: value || placeholder }}
        onPress={onPress}
        disabled={disabled}
        style={({ pressed }) => [
          styles.selector,
          {
            minHeight: Math.max(44, 44 * scale),
            borderRadius: 14 * scale,
            paddingHorizontal: 12 * scale,
          },
          pressed && styles.buttonPressed,
        ]}>
        <Text
          style={[
            styles.selectorText,
            { fontSize: 14 * scale },
            !value && styles.placeholderText,
          ]}
          numberOfLines={1}>
          {value || placeholder}
        </Text>
        <Feather name="chevron-down" size={18 * scale} color="#838C86" />
      </Pressable>
    </View>
  );
}

export default function RegisterResult() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const [hasMounted, setHasMounted] = useState(!isWeb);
  const [selectedLeagueId, setSelectedLeagueId] = useState('');
  const [isLeaguePickerOpen, setIsLeaguePickerOpen] = useState(false);
  const [focusedScore, setFocusedScore] = useState(null);
  const [rows, setRows] = useState(INITIAL_ROWS);
  const [activePickerRow, setActivePickerRow] = useState(null);
  const [playerSearch, setPlayerSearch] = useState('');
  const [ballProvider, setBallProvider] = useState('');
  const [availablePlayers, setAvailablePlayers] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResultNotice, setShowResultNotice] = useState(false);
  // Keep the first web render consistent with the exported HTML.
  const scale = hasMounted
    ? Math.max(0.86, Math.min(width / 390, height / 755, 1.2))
    : 1;
  const headerTopSpace = hasMounted ? Math.max(12, 66 * scale - insets.top) : 66;
  const scoreBoxHeight = Math.max(44, 44 * scale);
  const isSuperTiebreakEnabled = shouldEnableSuperTiebreak(rows);

  useEffect(() => {
    setHasMounted(true);
    const loadPlayers = async () => {
      if (!isSupabaseConfigured) {
        return;
      }

      try {
        const leaguePlayers = await Promise.all(
          PLAYER_PICKER_LEAGUE_IDS.map(async (leagueId) =>
            (await fetchPlayersByLeague(leagueId)).map((player) =>
              normalizePlayer(player, leagueId)
            )
          )
        );
        const players = mergePlayers(leaguePlayers);

        setAvailablePlayers(players);
      } catch {
        setAvailablePlayers([]);
      }
    };

    loadPlayers();
  }, []);

  useEffect(() => {
    if (!showResultNotice) {
      return undefined;
    }

    const noticeTimeoutId = setTimeout(() => {
      setShowResultNotice(false);
    }, RESULT_NOTICE_DURATION);

    return () => clearTimeout(noticeTimeoutId);
  }, [showResultNotice]);

  const updatePlayer = (rowIndex, player) => {
    setRows((currentRows) =>
      currentRows.map((row, index) =>
        index === rowIndex
          ? {
              ...row,
              playerId: player.id,
              leagueId: player.leagueId,
              name: player.name,
            }
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
    if (!selectedLeagueId) {
      return;
    }
    setActivePickerRow(rowIndex);
    setPlayerSearch('');
  };

  const closePlayerPicker = () => {
    setActivePickerRow(null);
    setPlayerSearch('');
  };

  const closePicker = () => {
    setIsLeaguePickerOpen(false);
    closePlayerPicker();
  };

  const handleLeagueSelect = (leagueId) => {
    if (leagueId !== selectedLeagueId) {
      setRows(INITIAL_ROWS);
      setBallProvider('');
      setFocusedScore(null);
    }
    setSelectedLeagueId(leagueId);
    closePicker();
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
  const filteredPlayers = availablePlayers.filter(
    (player) =>
      player.leagueId === selectedLeagueId &&
      (!query || player.name.toLowerCase().includes(query))
  );

  const handleSubmitResult = async () => {
    if (!selectedLeagueId) {
      showUserAlert('Seleccione una liga', 'Debe seleccionar la liga del partido.');
      return;
    }
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
    const matchLeagueId =
      winnerRow.leagueId ?? loserRow.leagueId ?? DEFAULT_LEAGUE_ID;
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
        league_id: matchLeagueId,
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
    <View style={styles.screen}>
      {isFocused && <StatusBar style="light" />}
      <View style={styles.frame}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : Platform.OS === 'android' ? 'height' : undefined}>
          <ScrollView
            contentContainerStyle={styles.container}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <LinearGradient
              colors={['#124F43', '#0D493B', '#1D5847']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.header, { paddingBottom: 32 * scale }]}>
              <View pointerEvents="none" style={styles.headerAccent}>
                <LinearGradient
                  colors={['rgba(193, 187, 118, 0.3)', 'rgba(193, 187, 118, 0)']}
                  style={StyleSheet.absoluteFill}
                />
              </View>
              <SafeAreaView edges={['top', 'left', 'right']}>
                <View
                  style={[
                    styles.headerRow,
                    {
                      marginTop: headerTopSpace,
                      paddingHorizontal: 16 * scale,
                      gap: 8 * scale,
                      minHeight: Math.max(44, 44 * scale),
                    },
                  ]}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Volver al menú principal"
                    onPress={() => router.replace('/login')}
                    style={({ pressed }) => [
                      styles.backButton,
                      { width: Math.max(44, 44 * scale), height: Math.max(44, 44 * scale) },
                      pressed && styles.buttonPressed,
                    ]}>
                    <Feather name="arrow-left" size={28 * scale} color="#F6F3E4" />
                  </Pressable>
                  <Text
                    accessibilityRole="header"
                    style={[styles.headerTitle, { fontSize: 26 * scale, lineHeight: 32 * scale }]}>
                    Registrar Resultado
                  </Text>
                </View>
              </SafeAreaView>
            </LinearGradient>

            <View
              style={[
                styles.body,
                {
                  marginTop: -16 * scale,
                  borderTopLeftRadius: 32 * scale,
                  borderTopRightRadius: 32 * scale,
                  paddingHorizontal: 16 * scale,
                  paddingTop: 14 * scale,
                },
              ]}>
              <SafeAreaView style={styles.content} edges={['bottom', 'left', 'right']}>
                <View
                  style={[
                    styles.scoreboardCard,
                    {
                      borderRadius: 26 * scale,
                      paddingHorizontal: 18 * scale,
                      paddingTop: 12 * scale,
                      paddingBottom: 14 * scale,
                    },
                  ]}>
                  <View style={[styles.selectors, { gap: 12 * scale }]}>
                    <FormSelector
                      label="Liga"
                      value={selectedLeagueId ? 'Liga ' + selectedLeagueId : ''}
                      placeholder="Seleccionar liga"
                      onPress={() => setIsLeaguePickerOpen(true)}
                      disabled={isSubmitting}
                      scale={scale}
                    />
                    {rows.map((row, rowIndex) => (
                      <FormSelector
                        key={row.id}
                        label={'Jugador ' + (rowIndex + 1)}
                        value={row.name}
                        placeholder="Seleccionar jugador"
                        onPress={() => openPlayerPicker(rowIndex)}
                        disabled={!selectedLeagueId || isSubmitting}
                        scale={scale}
                      />
                    ))}
                  </View>

                  <Text
                    style={[
                      styles.sectionTitle,
                      { fontSize: 16 * scale, lineHeight: 22 * scale, marginTop: 16 * scale },
                    ]}>
                    Marcador
                  </Text>
                  <View
                    style={[
                      styles.tableHeader,
                      { minHeight: 22 * scale, gap: 8 * scale },
                    ]}>
                    <View style={{ width: 104 * scale }} />
                    {['S1', 'S2', 'S3'].map((setLabel) => (
                      <Text key={setLabel} style={[styles.setHeaderText, { fontSize: 14 * scale }]}>
                        {setLabel}
                      </Text>
                    ))}
                  </View>

                  <View style={[styles.scoreRows, { gap: 10 * scale }]}>
                    {rows.map((row, rowIndex) => (
                      <View key={row.id} style={[styles.tableRow, { gap: 8 * scale }]}>
                        <Text
                          style={[
                            styles.scorePlayerLabel,
                            { width: 104 * scale, fontSize: 16 * scale },
                          ]}>
                          {'Jugador ' + (rowIndex + 1)}
                        </Text>
                        {row.sets.map((setValue, setIndex) => {
                          const isSetDisabled = setIndex === 2 && !isSuperTiebreakEnabled;
                          const scoreKey = row.id + '-set-' + setIndex;

                          return (
                            <View
                              key={scoreKey}
                              style={[
                                styles.setCell,
                                { height: scoreBoxHeight, borderRadius: 12 * scale },
                                isSetDisabled && styles.setCellDisabled,
                                focusedScore === scoreKey && styles.setCellFocused,
                              ]}>
                              <TextInput
                                accessibilityLabel={'Jugador ' + (rowIndex + 1) + ', set ' + (setIndex + 1)}
                                value={setValue}
                                onChangeText={(value) => updateSet(rowIndex, setIndex, value)}
                                onFocus={() => setFocusedScore(scoreKey)}
                                onBlur={() => setFocusedScore(null)}
                                editable={!isSetDisabled && !isSubmitting}
                                keyboardType="number-pad"
                                inputMode="numeric"
                                maxLength={2}
                                style={[
                                  styles.scoreInput,
                                  { fontSize: 20 * scale },
                                  isSetDisabled && styles.scoreInputDisabled,
                                  isWeb && styles.inputWeb,
                                ]}
                                selectionColor="#C49B74"
                              />
                            </View>
                          );
                        })}
                      </View>
                    ))}
                  </View>

                  <Text
                    style={[
                      styles.sectionTitle,
                      { fontSize: 16 * scale, lineHeight: 22 * scale, marginTop: 18 * scale },
                    ]}>
                    Pelotas
                  </Text>
                  <View
                    accessibilityRole="radiogroup"
                    accessibilityLabel="Quién aportó las pelotas"
                    style={{ marginTop: 4 * scale }}>
                    {rows.map((row, rowIndex) => {
                      const isSelected = Boolean(row.name) && row.name === ballProvider;
                      const isDisabled = !row.name || isSubmitting;
                      const playerLabel = row.name || 'Jugador ' + (rowIndex + 1);

                      return (
                        <Pressable
                          key={row.id + '-balls'}
                          accessibilityRole="radio"
                          accessibilityLabel={'Pelotas: ' + playerLabel}
                          accessibilityState={{ checked: isSelected, disabled: isDisabled }}
                          aria-checked={isSelected}
                          onPress={() => setBallProvider(row.name)}
                          disabled={isDisabled}
                          style={({ pressed }) => [
                            styles.ballOption,
                            { minHeight: Math.max(44, 44 * scale), gap: 12 * scale },
                            pressed && styles.buttonPressed,
                          ]}>
                          <View
                            style={[
                              styles.radioOuter,
                              {
                                width: 28 * scale,
                                height: 28 * scale,
                                borderRadius: 14 * scale,
                              },
                            ]}>
                            {isSelected ? (
                              <View
                                style={[
                                  styles.radioInner,
                                  {
                                    width: 18 * scale,
                                    height: 18 * scale,
                                    borderRadius: 9 * scale,
                                  },
                                ]}
                              />
                            ) : null}
                          </View>
                          <Text style={[styles.ballOptionText, { fontSize: 16 * scale }]}>
                            {playerLabel}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                <View style={{ paddingHorizontal: 10 * scale, marginTop: 14 * scale }}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={isSubmitting ? 'Guardando resultado' : 'Guardar Resultado'}
                    disabled={isSubmitting}
                    onPress={handleSubmitResult}
                    style={({ pressed }) => [
                      styles.primaryButton,
                      { borderRadius: 18 * scale },
                      pressed && styles.buttonPressed,
                      isSubmitting && styles.buttonDisabled,
                    ]}>
                    <LinearGradient
                      colors={['#259A55', '#198D50', '#16834C']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={[
                        styles.primaryButtonSurface,
                        {
                          minHeight: Math.max(44, 62 * scale),
                          borderRadius: 18 * scale,
                          gap: 14 * scale,
                          paddingVertical: 12 * scale,
                        },
                      ]}>
                      <FontAwesome name="whatsapp" size={24 * scale} color="#F3F7E7" />
                      <Text style={[styles.primaryButtonText, { fontSize: 16 * scale }]}>
                        {isSubmitting ? 'Guardando...' : 'Guardar Resultado'}
                      </Text>
                    </LinearGradient>
                  </Pressable>
                </View>
              </SafeAreaView>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        {showResultNotice ? (
          <View style={styles.noticeOverlay}>
            <View style={styles.noticeCard} accessibilityRole="alert">
              <Feather name="check-circle" size={26} color="#198D50" />
              <Text style={styles.noticeText}>{RESULT_REGISTERED_MESSAGE}</Text>
            </View>
          </View>
        ) : null}
      </View>

      <Modal
        visible={isLeaguePickerOpen || activePickerRow !== null}
        transparent
        animationType="fade"
        onRequestClose={closePicker}>
        <View style={styles.modalOverlay}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cerrar selector"
            style={styles.modalBackdrop}
            onPress={closePicker}
          />
          <View style={styles.modalCard} accessibilityViewIsModal>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} accessibilityRole="header">
                {isLeaguePickerOpen ? 'Seleccionar liga' : 'Seleccionar jugador'}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cerrar"
                style={styles.modalClose}
                onPress={closePicker}>
                <Feather name="x" size={22} color="#8C7B73" />
              </Pressable>
            </View>

            {!isLeaguePickerOpen ? (
              <View style={styles.searchShell}>
                <Feather name="search" size={18} color="#9A8D84" />
                <TextInput
                  accessibilityLabel="Buscar jugador"
                  value={playerSearch}
                  onChangeText={setPlayerSearch}
                  placeholder="Buscar jugador"
                  placeholderTextColor="#9A8D84"
                  style={[styles.searchInput, isWeb && styles.inputWeb]}
                  selectionColor="#A66132"
                />
              </View>
            ) : null}

            <ScrollView
              style={styles.optionsList}
              contentContainerStyle={styles.optionsContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}>
              {isLeaguePickerOpen ? (
                PLAYER_PICKER_LEAGUE_IDS.map((leagueId) => (
                  <Pressable
                    key={leagueId}
                    accessibilityRole="button"
                    accessibilityLabel={'Liga ' + leagueId}
                    style={[
                      styles.optionRow,
                      selectedLeagueId === leagueId && styles.optionRowSelected,
                    ]}
                    onPress={() => handleLeagueSelect(leagueId)}>
                    <Text style={styles.optionText}>{'Liga ' + leagueId}</Text>
                    {selectedLeagueId === leagueId ? (
                      <Feather name="check" size={18} color="#A66132" />
                    ) : null}
                  </Pressable>
                ))
              ) : (
                filteredPlayers.map((player) => {
                  const isDisabled = selectedByOtherRow.includes(player.name);
                  const isSelected = activePickerRow !== null && rows[activePickerRow]?.name === player.name;

                  return (
                    <Pressable
                      key={player.id ?? player.name}
                      accessibilityRole="button"
                      accessibilityLabel={player.name}
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
                      {isSelected ? <Feather name="check" size={18} color="#A66132" /> : null}
                    </Pressable>
                  );
                })
              )}
              {!isLeaguePickerOpen && filteredPlayers.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>No se encontraron jugadores.</Text>
                </View>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#EFE8D6',
  },
  frame: {
    flex: 1,
    width: '100%',
    maxWidth: 560,
    backgroundColor: '#124F43',
  },
  flex: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
  },
  header: {
    width: '100%',
    overflow: 'hidden',
  },
  headerAccent: {
    position: 'absolute',
    top: -146,
    left: 84,
    width: 280,
    height: 204,
    borderRadius: 140,
    borderWidth: 1,
    borderColor: 'rgba(213, 194, 129, 0.45)',
    overflow: 'hidden',
    transform: [{ rotate: '18deg' }],
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    color: '#F6F3E4',
    fontWeight: '600',
  },
  body: {
    flexGrow: 1,
    alignItems: 'center',
    backgroundColor: '#FAF7ED',
    paddingBottom: 64,
  },
  content: {
    width: '100%',
    maxWidth: 480,
  },
  scoreboardCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
  },
  selectors: {
    width: '100%',
  },
  selectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fieldLabel: {
    color: '#30362F',
    fontWeight: '600',
  },
  selector: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    borderWidth: 1,
    borderColor: '#ECEDEB',
    backgroundColor: '#F3F3F2',
  },
  selectorText: {
    flex: 1,
    color: '#343D35',
  },
  placeholderText: {
    color: '#818781',
  },
  sectionTitle: {
    color: '#293128',
    fontWeight: '700',
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  setHeaderText: {
    flex: 1,
    minWidth: 0,
    textAlign: 'center',
    fontWeight: '600',
    color: '#30362F',
  },
  scoreRows: {
    width: '100%',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scorePlayerLabel: {
    color: '#343B33',
  },
  setCell: {
    flex: 1,
    minWidth: 0,
    borderWidth: 2,
    borderColor: '#DDDEDA',
    backgroundColor: '#FFFEFC',
    overflow: 'hidden',
  },
  setCellDisabled: {
    backgroundColor: '#FAF8F2',
  },
  setCellFocused: {
    borderColor: '#C49B74',
  },
  scoreInput: {
    width: '100%',
    height: '100%',
    paddingVertical: 0,
    paddingHorizontal: 0,
    textAlign: 'center',
    color: '#343B33',
    fontWeight: '600',
  },
  scoreInputDisabled: {
    color: '#A9AAA4',
  },
  inputWeb: {
    outlineStyle: 'none',
  },
  ballOption: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radioOuter: {
    borderWidth: 2,
    borderColor: '#CC996F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    backgroundColor: '#CC996F',
  },
  ballOptionText: {
    flex: 1,
    color: '#343B33',
  },
  primaryButton: {
    width: '100%',
    backgroundColor: '#198D50',
    ...buildShadow({
      color: '#7D9F6B',
      offset: { width: 0, height: 5 },
      opacity: 0.15,
      radius: 10,
      elevation: 3,
      web: '0px 5px 10px rgba(125, 159, 107, 0.15)',
    }),
  },
  primaryButtonSurface: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  primaryButtonText: {
    color: '#F3F7E7',
    fontWeight: '700',
  },
  buttonPressed: {
    opacity: 0.86,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  modalClose: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
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
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
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

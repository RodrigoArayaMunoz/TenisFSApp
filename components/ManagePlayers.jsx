import { Feather } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { addPlayer, fetchLeagues, removePlayer } from '../services/adminService';
import { fetchPlayersByLeague } from '../services/resultService';

const GREEN = '#145B40';
const CLAY = '#914621';
const normalizeSearch = (value) =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es');

function ActionCard({ title, description, icon, color, tint, onPress }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={description}
      onPress={onPress}
      style={({ pressed }) => [styles.actionCard, pressed && styles.pressed]}>
      <View style={[styles.actionIcon, { backgroundColor: tint }]}>
        <Feather name={icon} size={27} color={color} accessible={false} />
      </View>
      <View style={styles.actionCopy}>
        <Text style={[styles.actionTitle, { color }]}>{title}</Text>
        <Text style={styles.actionDescription}>{description}</Text>
      </View>
      <Feather name="chevron-right" size={21} color={color} accessible={false} />
    </Pressable>
  );
}

function InlineError({ message, onRetry }) {
  if (!message) return null;

  return (
    <View style={styles.errorBox} accessibilityRole="alert" accessibilityLiveRegion="assertive">
      <Feather name="alert-circle" size={18} color={CLAY} accessible={false} />
      <View style={styles.flex}>
        <Text style={styles.errorText}>{message}</Text>
        {onRetry && (
          <Pressable
            accessibilityRole="button"
            onPress={onRetry}
            style={styles.retryButton}>
            <Text style={styles.retryText}>Reintentar</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

export default function ManagePlayers() {
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const [mode, setMode] = useState(null);
  const [leagues, setLeagues] = useState([]);
  const [leaguesLoading, setLeaguesLoading] = useState(true);
  const [leaguesError, setLeaguesError] = useState('');
  const [leagueId, setLeagueId] = useState(null);
  const [leaguePickerOpen, setLeaguePickerOpen] = useState(false);
  const [name, setName] = useState('');
  const [nameFocused, setNameFocused] = useState(false);
  const [players, setPlayers] = useState([]);
  const [playersLoading, setPlayersLoading] = useState(false);
  const [playersError, setPlayersError] = useState('');
  const [playersReload, setPlayersReload] = useState(0);
  const [search, setSearch] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [confirmRemoval, setConfirmRemoval] = useState(false);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const submittingRef = useRef(false);
  const isAdding = mode === 'add';
  const selectedLeague = leagues.find((league) => league.id === leagueId);
  const filteredPlayers = players.filter((player) =>
    normalizeSearch(player.name).includes(normalizeSearch(search.trim()))
  );
  const actionDisabled = isSubmitting || leaguesLoading || leagues.length === 0
    || (!isAdding && (!selectedPlayer || playersLoading || Boolean(playersError)));
  const actionLabel = isSubmitting ? 'Guardando…'
    : isAdding ? 'Agregar jugador'
      : confirmRemoval ? 'Sí, eliminar' : 'Eliminar jugador';

  const loadLeagues = useCallback(async () => {
    setLeaguesLoading(true);
    setLeaguesError('');
    try {
      const availableLeagues = await fetchLeagues();
      setLeagues(availableLeagues);
      if (availableLeagues.length === 0) {
        setLeaguesError('Todavía no hay ligas disponibles.');
      }
    } catch {
      setLeaguesError('No se pudieron cargar las ligas. Revisa tu conexión e intenta nuevamente.');
    } finally {
      setLeaguesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLeagues();
  }, [loadLeagues]);

  useEffect(() => {
    if (mode !== 'remove' || !leagueId) return;
    let cancelled = false;
    setPlayersLoading(true);
    setPlayersError('');

    fetchPlayersByLeague(leagueId)
      .then((leaguePlayers) => {
        if (!Array.isArray(leaguePlayers)) throw new Error('Respuesta no válida');
        if (!cancelled) setPlayers(leaguePlayers);
      })
      .catch(() => {
        if (!cancelled) {
          setPlayersError('No se pudieron cargar los jugadores. Intenta nuevamente.');
        }
      })
      .finally(() => {
        if (!cancelled) setPlayersLoading(false);
      });

    return () => { cancelled = true; };
  }, [leagueId, mode, playersReload]);

  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(() => setSuccess(''), 6000);
    return () => clearTimeout(timer);
  }, [success]);

  const openModal = (nextMode) => {
    setLeagueId(null);
    setLeaguePickerOpen(false);
    setName('');
    setNameFocused(false);
    setPlayers([]);
    setPlayersError('');
    setPlayersLoading(false);
    setSearch('');
    setSelectedPlayer(null);
    setConfirmRemoval(false);
    setFormError('');
    setSuccess('');
    setMode(nextMode);
  };

  const closeModal = () => {
    if (submittingRef.current) return;
    setMode(null);
    setLeaguePickerOpen(false);
  };

  const chooseLeague = (league) => {
    if (league.id === leagueId) {
      setLeaguePickerOpen(false);
      return;
    }
    setLeagueId(league.id);
    setLeaguePickerOpen(false);
    setPlayers([]);
    setPlayersError('');
    setPlayersLoading(mode === 'remove');
    setSelectedPlayer(null);
    setSearch('');
    setFormError('');
  };

  const submit = async () => {
    if (submittingRef.current) return;
    setFormError('');
    if (!leagueId) {
      setFormError('Selecciona una liga para continuar.');
      return;
    }
    if (isAdding && name.trim().replace(/\s+/g, ' ').length < 2) {
      setFormError('Ingresa el nombre del jugador (al menos 2 caracteres).');
      return;
    }
    if (!isAdding && !selectedPlayer) {
      setFormError('Selecciona al jugador que deseas eliminar.');
      return;
    }
    if (!isAdding && !confirmRemoval) {
      setLeaguePickerOpen(false);
      setConfirmRemoval(true);
      return;
    }

    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      const player = isAdding
        ? await addPlayer(leagueId, name)
        : await removePlayer(leagueId, selectedPlayer.id);
      setSuccess(isAdding
        ? `${player.name} se agregó a ${selectedLeague.name}.`
        : `${player.name} se eliminó de ${selectedLeague.name}.`);
      setMode(null);
    } catch (error) {
      setFormError(error.message || 'No se pudo guardar el cambio. Intenta nuevamente.');
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.screen}>
      {isFocused && <StatusBar style="light" />}
      <View style={styles.frame}>
        <LinearGradient colors={['#855335', '#713C24', '#63311E']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <SafeAreaView edges={['top', 'left', 'right']}>
            <View style={styles.header}>
              <View style={styles.headerNavigation}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Volver al administrador"
                  onPress={() => router.canGoBack() ? router.back() : router.replace('/admin-home')}
                  style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
                  <Feather name="arrow-left" size={22} color="#FFFCF4" accessible={false} />
                </Pressable>
                <Text style={styles.eyebrow}>ADMINISTRADOR</Text>
                <View style={styles.headerBadge}>
                  <Feather name="users" size={22} color="#FFF2D6" accessible={false} />
                </View>
              </View>
              <Text accessibilityRole="header" style={styles.title}>Gestionar jugadores</Text>
              <Text style={styles.subtitle}>Todo listo para el próximo partido.</Text>
            </View>
          </SafeAreaView>
        </LinearGradient>

        <LinearGradient colors={['#FAF8F1', '#F5F0E2']} style={styles.sheet}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 24) }]}>
            <View style={styles.contentInner}>
              <Text style={styles.sectionTitle}>¿Qué deseas hacer?</Text>
              <Text style={styles.sectionDescription}>Administra los jugadores de tus ligas.</Text>
              <View>
                <ActionCard
                  title="Agregar Jugadores"
                  description="Inscribe un jugador en su liga."
                  icon="user-plus"
                  color={GREEN}
                  tint="#E8F1E8"
                  onPress={() => openModal('add')}
                />
              </View>
              <View>
                <ActionCard
                  title="Eliminar Jugadores"
                  description="Quita un jugador de una liga."
                  icon="user-minus"
                  color={CLAY}
                  tint="#FAEDE3"
                  onPress={() => openModal('remove')}
                />
              </View>
              {success ? (
                <View style={styles.successBox} accessibilityRole="alert" accessibilityLiveRegion="polite">
                  <Feather name="check-circle" size={22} color={GREEN} accessible={false} />
                  <Text style={styles.successText}>{success}</Text>
                </View>
              ) : null}
              <View style={styles.hint}>
                <Feather name="info" size={17} color="#92806D" accessible={false} />
                <Text style={styles.hintText}>Los cambios se reflejarán en la liga correspondiente.</Text>
              </View>
            </View>
            <View style={styles.footer}>
              <View style={styles.footerLine} />
              <Text style={styles.footerText}>ACADEMIA DE TENIS FS</Text>
              <View style={styles.footerLine} />
            </View>
          </ScrollView>
        </LinearGradient>
      </View>

      <Modal
        visible={mode !== null}
        transparent
        animationType="fade"
        accessibilityLabel={confirmRemoval ? 'Confirmar eliminación' : isAdding ? 'Agregar jugador' : 'Eliminar jugador'}
        onRequestClose={closeModal}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : Platform.OS === 'android' ? 'height' : undefined}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cerrar ventana"
            disabled={isSubmitting}
            onPress={closeModal}
            style={StyleSheet.absoluteFill}
          />
          <SafeAreaView edges={['top', 'bottom']} style={styles.modalSafeArea} pointerEvents="box-none">
            <View
              style={styles.modalCard}
              accessibilityViewIsModal>
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.modalContent}>
                <View style={styles.modalTopRow}>
                  <View style={[styles.modalIcon, !isAdding && styles.modalIconClay]}>
                    <Feather name={isAdding ? 'user-plus' : confirmRemoval ? 'trash-2' : 'user-minus'} size={25} color={isAdding ? GREEN : CLAY} accessible={false} />
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Cerrar"
                    disabled={isSubmitting}
                    onPress={closeModal}
                    style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}>
                    <Feather name="x" size={22} color="#89776B" accessible={false} />
                  </Pressable>
                </View>
                <Text accessibilityRole="header" style={styles.modalTitle}>
                  {confirmRemoval ? '¿Eliminar jugador?' : isAdding ? 'Agregar jugador' : 'Eliminar jugador'}
                </Text>
                <Text style={styles.modalDescription}>
                  {confirmRemoval
                    ? 'Confirma que deseas quitar a este jugador de la liga.'
                    : isAdding
                      ? 'Selecciona su liga e ingresa su nombre.'
                      : 'Selecciona una liga y busca al jugador.'}
                </Text>

                {confirmRemoval ? (
                  <>
                    <View style={styles.confirmPlayer}>
                      <View style={styles.playerAvatar}>
                        <Feather name="user" size={23} color={GREEN} accessible={false} />
                      </View>
                      <View style={styles.flex}>
                        <Text style={styles.confirmName}>{selectedPlayer?.name}</Text>
                        <Text style={styles.playerLeague}>{selectedLeague?.name}</Text>
                      </View>
                    </View>
                    <View style={styles.confirmHint}>
                      <Feather name="info" size={18} color={CLAY} accessible={false} />
                      <Text style={styles.confirmHintText}>Sus resultados registrados se conservarán.</Text>
                    </View>
                  </>
                ) : (
                  <>
                    <Text style={styles.fieldLabel}>Liga</Text>
                    <Pressable
                      accessibilityRole="combobox"
                      accessibilityLabel="Liga"
                      accessibilityValue={{ text: selectedLeague?.name ?? 'Selecciona una liga' }}
                      accessibilityState={{ expanded: leaguePickerOpen, disabled: leaguesLoading || isSubmitting || leagues.length === 0 }}
                      disabled={leaguesLoading || isSubmitting || leagues.length === 0}
                      onPress={() => setLeaguePickerOpen((open) => !open)}
                      style={[styles.inputShell, leaguePickerOpen && styles.inputFocused]}>
                      <Feather name="award" size={20} color="#C58A32" accessible={false} />
                      <Text style={[styles.selectorText, !selectedLeague && styles.placeholder]}>
                        {leaguesLoading ? 'Cargando ligas…' : selectedLeague?.name ?? 'Selecciona una liga'}
                      </Text>
                      {leaguesLoading
                        ? <ActivityIndicator size="small" color={GREEN} />
                        : <Feather name={leaguePickerOpen ? 'chevron-up' : 'chevron-down'} size={19} color="#807D71" accessible={false} />}
                    </Pressable>
                    <InlineError message={leaguesError} onRetry={loadLeagues} />
                    {leaguePickerOpen && (
                      <ScrollView style={styles.leagueOptions} nestedScrollEnabled keyboardShouldPersistTaps="handled" accessibilityRole="list">
                        {leagues.map((league) => (
                          <Pressable
                            key={league.id}
                            accessibilityRole="button"
                            accessibilityLabel={league.name}
                            accessibilityState={{ selected: league.id === leagueId }}
                            onPress={() => chooseLeague(league)}
                            style={({ pressed }) => [styles.leagueOption, league.id === leagueId && styles.optionSelected, pressed && styles.pressed]}>
                            <Text style={styles.leagueOptionText}>{league.name}</Text>
                            {league.id === leagueId && <Feather name="check" size={19} color={GREEN} accessible={false} />}
                          </Pressable>
                        ))}
                      </ScrollView>
                    )}

                    {isAdding ? (
                      <>
                        <Text style={styles.fieldLabel}>Nombre del jugador</Text>
                        <View style={[styles.inputShell, nameFocused && styles.inputFocused]}>
                          <Feather name="user" size={20} color="#8A9487" accessible={false} />
                          <TextInput
                            accessibilityLabel="Nombre del jugador"
                            placeholder="Ej. Nicolás González"
                            placeholderTextColor="#9C9F93"
                            value={name}
                            onChangeText={(value) => { setName(value); setFormError(''); }}
                            onFocus={() => { setNameFocused(true); setLeaguePickerOpen(false); }}
                            onBlur={() => setNameFocused(false)}
                            autoCapitalize="words"
                            autoCorrect={false}
                            maxLength={80}
                            returnKeyType="done"
                            onSubmitEditing={submit}
                            editable={!isSubmitting}
                            selectionColor={GREEN}
                            style={styles.textInput}
                          />
                        </View>
                      </>
                    ) : leagueId ? (
                      <>
                        <Text style={styles.fieldLabel}>Jugador</Text>
                        <View style={styles.inputShell}>
                          <Feather name="search" size={19} color="#8A9487" accessible={false} />
                          <TextInput
                            accessibilityLabel="Buscar jugador"
                            placeholder="Buscar por nombre"
                            placeholderTextColor="#9C9F93"
                            value={search}
                            onChangeText={setSearch}
                            onFocus={() => setLeaguePickerOpen(false)}
                            editable={!isSubmitting}
                            selectionColor={GREEN}
                            style={styles.textInput}
                          />
                        </View>
                        {playersLoading ? (
                          <View style={styles.listNotice} accessibilityRole="progressbar" accessibilityLabel="Cargando jugadores">
                            <ActivityIndicator color={GREEN} />
                            <Text style={styles.listNoticeText}>Cargando jugadores…</Text>
                          </View>
                        ) : playersError ? (
                          <InlineError message={playersError} onRetry={() => setPlayersReload((value) => value + 1)} />
                        ) : (
                          <ScrollView style={styles.playersList} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                            {filteredPlayers.map((player) => (
                              <Pressable
                                key={player.id}
                                accessibilityRole="radio"
                                accessibilityLabel={player.name}
                                accessibilityState={{ checked: selectedPlayer?.id === player.id }}
                                onPress={() => { setSelectedPlayer(player); setFormError(''); }}
                                style={({ pressed }) => [styles.playerOption, selectedPlayer?.id === player.id && styles.optionSelected, pressed && styles.pressed]}>
                                <Feather name="user" size={18} color={GREEN} accessible={false} />
                                <Text style={styles.playerOptionText}>{player.name}</Text>
                                <Feather name={selectedPlayer?.id === player.id ? 'check-circle' : 'circle'} size={20} color={selectedPlayer?.id === player.id ? GREEN : '#CCCDBF'} accessible={false} />
                              </Pressable>
                            ))}
                            {filteredPlayers.length === 0 && (
                              <View style={styles.listNotice}>
                                <Feather name="users" size={24} color="#9B9B8D" accessible={false} />
                                <Text style={styles.listNoticeText}>
                                  {players.length === 0 ? 'No hay jugadores en esta liga.' : 'No se encontraron jugadores.'}
                                </Text>
                              </View>
                            )}
                          </ScrollView>
                        )}
                      </>
                    ) : null}
                  </>
                )}

                <InlineError message={formError} />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={actionLabel}
                  accessibilityState={{ disabled: actionDisabled, busy: isSubmitting }}
                  disabled={actionDisabled}
                  onPress={submit}
                  style={({ pressed }) => [styles.primaryButton, !isAdding && styles.dangerButton, pressed && styles.pressed, actionDisabled && styles.disabled]}>
                  {isSubmitting
                    ? <ActivityIndicator color="#FFFCF4" size="small" />
                    : <Feather name={isAdding ? 'user-plus' : confirmRemoval ? 'trash-2' : 'user-minus'} size={20} color="#FFFCF4" accessible={false} />}
                  <Text style={styles.primaryButtonText}>{actionLabel}</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  disabled={isSubmitting}
                  onPress={confirmRemoval ? () => { setConfirmRemoval(false); setFormError(''); } : closeModal}
                  style={({ pressed }) => [styles.cancelButton, pressed && styles.pressed, isSubmitting && styles.disabled]}>
                  <Text style={styles.cancelText}>{confirmRemoval ? 'Volver' : 'Cancelar'}</Text>
                </Pressable>
              </ScrollView>
            </View>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, alignItems: 'center', backgroundColor: '#F5F0E2' },
  frame: { flex: 1, width: '100%', maxWidth: 560, backgroundColor: '#713C24' },
  header: { paddingHorizontal: 24, paddingTop: Platform.OS === 'web' ? 28 : 12, paddingBottom: 50 },
  headerNavigation: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 23 },
  backButton: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255, 252, 244, 0.1)' },
  eyebrow: { flex: 1, color: '#E9D5BE', fontSize: 11, fontWeight: '700', letterSpacing: 1.7 },
  headerBadge: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255, 242, 214, 0.25)', backgroundColor: 'rgba(255, 242, 214, 0.08)' },
  title: { color: '#FFFCF4', fontWeight: '700', fontSize: 28, lineHeight: 35, letterSpacing: -0.7 },
  subtitle: { color: '#EBDACB', fontSize: 14, lineHeight: 21, marginTop: 7 },
  sheet: { flex: 1, marginTop: -25, borderTopLeftRadius: 30, borderTopRightRadius: 30, overflow: 'hidden' },
  content: { flexGrow: 1, paddingTop: 30, paddingHorizontal: 20, alignItems: 'center' },
  contentInner: { width: '100%', maxWidth: 440 },
  sectionTitle: { color: '#303D30', fontSize: 21, lineHeight: 28, fontWeight: '700', marginHorizontal: 3 },
  sectionDescription: { color: '#858273', fontSize: 14, lineHeight: 21, marginTop: 6, marginBottom: 24, marginHorizontal: 3 },
  actionCard: {
    minHeight: 114, padding: 18, borderRadius: 24, backgroundColor: '#FFFEFB', flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16,
    borderWidth: 1, borderColor: '#FFFFFF',
    ...Platform.select({
      web: { boxShadow: '0px 6px 22px rgba(104, 77, 40, 0.045)' },
      default: { shadowColor: '#684D28', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.045, shadowRadius: 14, elevation: 2 },
    }),
  },
  actionIcon: { width: 55, height: 59, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  actionCopy: { flex: 1, minWidth: 0 },
  actionTitle: { fontSize: 17, lineHeight: 23, fontWeight: '700', letterSpacing: -0.3 },
  actionDescription: { fontSize: 12, lineHeight: 18, color: '#8C887A', marginTop: 5 },
  hint: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, marginTop: 9, paddingHorizontal: 8 },
  hintText: { flex: 1, color: '#92806D', fontSize: 12, lineHeight: 18 },
  successBox: { flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: '#E7F1E5', borderWidth: 1, borderColor: '#CEDFCB', borderRadius: 18, padding: 16, marginBottom: 12 },
  successText: { flex: 1, fontSize: 14, lineHeight: 21, fontWeight: '600', color: GREEN },
  footer: { flex: 1, width: '100%', maxWidth: 300, flexDirection: 'row', alignItems: 'flex-end', gap: 13, paddingTop: 55 },
  footerLine: { flex: 1, height: 1, backgroundColor: '#E1D8C6', marginBottom: 7 },
  footerText: { fontSize: 9, lineHeight: 15, fontWeight: '600', color: '#A89B83', letterSpacing: 1.5 },
  pressed: { opacity: 0.8, transform: [{ scale: 0.99 }] },
  disabled: { opacity: 0.45 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(40, 33, 23, 0.54)', justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 16 },
  modalSafeArea: { width: '100%', maxWidth: 440, alignSelf: 'center', maxHeight: '100%' },
  modalCard: {
    maxHeight: '100%', width: '100%', backgroundColor: '#FFFCF5', borderRadius: 28, overflow: 'hidden',
    ...Platform.select({
      web: { boxShadow: '0px 24px 80px rgba(40, 24, 13, 0.24)' },
      default: { shadowColor: '#28180D', shadowOffset: { width: 0, height: 18 }, shadowOpacity: 0.24, shadowRadius: 30, elevation: 16 },
    }),
  },
  modalContent: { padding: 24, paddingBottom: 12 },
  modalTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 17 },
  modalIcon: { width: 52, height: 52, borderRadius: 18, backgroundColor: '#E8F1E8', alignItems: 'center', justifyContent: 'center' },
  modalIconClay: { backgroundColor: '#FAEDE3' },
  closeButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22 },
  modalTitle: { fontSize: 25, lineHeight: 32, fontWeight: '700', color: '#303D30', letterSpacing: -0.6 },
  modalDescription: { fontSize: 14, lineHeight: 21, color: '#8A897B', marginTop: 6, marginBottom: 9 },
  fieldLabel: { fontSize: 13, lineHeight: 19, fontWeight: '600', color: '#4B5547', marginTop: 19, marginBottom: 9 },
  inputShell: { flexDirection: 'row', alignItems: 'center', gap: 11, minHeight: 54, paddingHorizontal: 15, borderWidth: 1, borderColor: '#E2E3D7', borderRadius: 15, backgroundColor: '#FFFFFF' },
  inputFocused: { borderColor: '#739B7B', backgroundColor: '#FDFEFA' },
  selectorText: { flex: 1, fontSize: 15, lineHeight: 22, color: '#364936', paddingVertical: 14 },
  placeholder: { color: '#9C9F93' },
  textInput: { flex: 1, minWidth: 0, fontSize: 15, color: '#364936', minHeight: 52, paddingVertical: 12, ...Platform.select({ web: { outlineStyle: 'none' } }) },
  leagueOptions: { maxHeight: 152, marginTop: 7, padding: 5, borderWidth: 1, borderColor: '#E2E3D7', borderRadius: 15, backgroundColor: '#FFFFFF' },
  leagueOption: { minHeight: 48, paddingHorizontal: 13, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  leagueOptionText: { flex: 1, fontSize: 15, fontWeight: '500', color: '#364936', paddingVertical: 12 },
  optionSelected: { backgroundColor: '#EDF3E9' },
  primaryButton: { minHeight: 54, borderRadius: 16, backgroundColor: GREEN, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 11, paddingHorizontal: 16, paddingVertical: 14, marginTop: 27 },
  dangerButton: { backgroundColor: CLAY },
  primaryButtonText: { color: '#FFFCF4', fontWeight: '700', fontSize: 15, lineHeight: 22 },
  cancelButton: { minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  cancelText: { color: '#8A887A', fontSize: 14, fontWeight: '500' },
  errorBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, borderRadius: 13, padding: 12, marginTop: 12, backgroundColor: '#FAEDE3' },
  errorText: { color: '#853E24', fontSize: 13, lineHeight: 19 },
  retryButton: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
  retryText: { fontSize: 13, fontWeight: '700', color: CLAY, textDecorationLine: 'underline' },
  playersList: { maxHeight: 174, marginTop: 10, borderWidth: 1, borderColor: '#E5E5DA', borderRadius: 14, backgroundColor: '#FFFFFF' },
  playerOption: { flexDirection: 'row', alignItems: 'center', gap: 11, minHeight: 52, paddingHorizontal: 13, paddingVertical: 12 },
  playerOptionText: { flex: 1, fontSize: 14, lineHeight: 20, color: '#364936' },
  listNotice: { minHeight: 98, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 16 },
  listNoticeText: { fontSize: 13, lineHeight: 19, color: '#8A897B', textAlign: 'center' },
  confirmPlayer: { marginTop: 20, borderRadius: 18, backgroundColor: '#F1F3E9', padding: 17, flexDirection: 'row', alignItems: 'center', gap: 14 },
  playerAvatar: { width: 46, height: 46, borderRadius: 16, backgroundColor: '#E0EBD9', alignItems: 'center', justifyContent: 'center' },
  confirmName: { color: '#364936', fontSize: 16, lineHeight: 23, fontWeight: '700' },
  playerLeague: { color: '#8A897B', fontSize: 13, lineHeight: 20, marginTop: 3 },
  confirmHint: { flexDirection: 'row', gap: 9, alignItems: 'flex-start', marginTop: 17, paddingHorizontal: 3 },
  confirmHintText: { flex: 1, fontSize: 13, lineHeight: 19, color: '#8A7966' },
});

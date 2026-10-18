import { Feather, FontAwesome } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { fetchLeagues } from '../services/adminService';
import { buildFixtureWhatsAppMessage, createFixtureRequest, formatFixtureDate, submitFixture } from '../services/fixtureService';
import { fetchPlayersByLeague } from '../services/resultService';
import { openWhatsAppShare } from '../utils/whatsapp';
import FixtureSchedulePicker from './FixtureSchedulePicker';

const GREEN = '#145B40';
const normalize = (value) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es');

function SelectField({ label, value, placeholder, icon, disabled, loading, compact = false, onPress }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Seleccionar ${label.toLowerCase()}`}
        accessibilityValue={{ text: value || placeholder }}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onPress}
        style={({ pressed }) => [styles.select, value && styles.selectFilled, disabled && styles.disabled, pressed && styles.pressed]}>
        <Feather accessible={false} name={icon} size={18} color={value ? GREEN : '#958775'} />
        <Text style={[styles.selectText, compact && styles.compactText, !value && styles.placeholder]}>{value || placeholder}</Text>
        {loading ? <ActivityIndicator size="small" color={GREEN} /> : !compact && <Feather accessible={false} name="chevron-down" size={16} color="#8B9787" />}
      </Pressable>
    </View>
  );
}

function ErrorNotice({ message, onRetry }) {
  if (!message) return null;
  return (
    <View accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.error}>
      <Feather accessible={false} name="alert-circle" size={18} color="#914621" />
      <View style={styles.flex}>
        <Text style={styles.errorText}>{message}</Text>
        {onRetry && <Pressable accessibilityRole="button" onPress={onRetry} style={styles.retry}><Text style={styles.retryText}>Reintentar</Text></Pressable>}
      </View>
    </View>
  );
}

export default function CreateFixture() {
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const [leagues, setLeagues] = useState([]);
  const [leaguesLoading, setLeaguesLoading] = useState(true);
  const [leaguesError, setLeaguesError] = useState('');
  const [leagueId, setLeagueId] = useState(null);
  const [players, setPlayers] = useState([]);
  const [playersLoading, setPlayersLoading] = useState(false);
  const [playersError, setPlayersError] = useState('');
  const [playersReload, setPlayersReload] = useState(0);
  const [playerAId, setPlayerAId] = useState(null);
  const [playerBId, setPlayerBId] = useState(null);
  const [matchDate, setMatchDate] = useState('');
  const [matchTime, setMatchTime] = useState('');
  const [picker, setPicker] = useState(null);
  const [search, setSearch] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(null);
  const [shareError, setShareError] = useState(false);
  const submittingRef = useRef(false);
  const requestRef = useRef(null);
  const selectedLeague = leagues.find((league) => league.id === leagueId);
  const playerA = players.find((player) => player.id === playerAId);
  const playerB = players.find((player) => player.id === playerBId);
  const playersDisabled = saving || !selectedLeague || playersLoading || Boolean(playersError) || players.length < 2;
  const saveDisabled = saving || leaguesLoading || playersDisabled || !playerA || !playerB || !matchDate || !matchTime;

  const loadLeagues = useCallback(async () => {
    setLeaguesLoading(true);
    setLeaguesError('');
    try {
      const available = await fetchLeagues();
      setLeagues(available);
      if (!available.length) setLeaguesError('Todavía no hay ligas disponibles.');
    } catch {
      setLeaguesError('No se pudieron cargar las ligas. Revisa tu conexión e intenta nuevamente.');
    } finally {
      setLeaguesLoading(false);
    }
  }, []);

  useEffect(() => { loadLeagues(); }, [loadLeagues]);

  useEffect(() => {
    if (!leagueId) return;
    let cancelled = false;
    setPlayersLoading(true);
    setPlayersError('');
    setPlayers([]);
    setPlayerAId(null);
    setPlayerBId(null);
    fetchPlayersByLeague(leagueId)
      .then((available) => {
        if (!Array.isArray(available)) throw new Error('Respuesta no válida');
        if (!cancelled) setPlayers(available.filter((player) => player.league_id === leagueId && player.active !== false));
      })
      .catch(() => {
        if (!cancelled) setPlayersError('No se pudieron cargar los jugadores. Intenta nuevamente.');
      })
      .finally(() => { if (!cancelled) setPlayersLoading(false); });
    return () => { cancelled = true; };
  }, [leagueId, playersReload]);

  const formChanged = () => {
    setFormError('');
    setSuccess(null);
    setShareError(false);
    requestRef.current = null;
  };
  const openPicker = (type) => { setSearch(''); setPicker(type); };
  const selectOption = (option) => {
    formChanged();
    if (picker === 'league') {
      if (option.id !== leagueId) {
        setLeagueId(option.id);
        setPlayers([]);
        setPlayerAId(null);
        setPlayerBId(null);
        setPlayersError('');
        setPlayersLoading(true);
      }
    } else if (picker === 'playerA') {
      setPlayerAId(option.id);
    } else {
      setPlayerBId(option.id);
    }
    setPicker(null);
  };
  const shareMatch = async (message) => {
    try {
      await openWhatsAppShare(message);
      setShareError(false);
    } catch {
      setShareError(true);
    }
  };
  const saveMatch = async () => {
    if (submittingRef.current) return;
    setFormError('');
    let request;
    let message;
    try {
      request = requestRef.current || createFixtureRequest({ leagueId, playerA, playerB, matchDate, matchTime });
      message = buildFixtureWhatsAppMessage({ league: selectedLeague, playerA, playerB, matchDate, matchTime });
    } catch (error) {
      setFormError(error.message);
      return;
    }
    requestRef.current = request;
    submittingRef.current = true;
    setSaving(true);
    try {
      await submitFixture(request);
      requestRef.current = null;
      setSuccess({ message, title: `${playerA.name} vs ${playerB.name}`, details: `${selectedLeague.name} · ${formatFixtureDate(matchDate, { month: 'short' })} · ${matchTime} hrs.` });
      setPlayerAId(null);
      setPlayerBId(null);
      setMatchDate('');
      setMatchTime('');
      await shareMatch(message);
    } catch (error) {
      setFormError(error.message || 'No se pudo guardar el partido. Intenta nuevamente.');
    } finally {
      submittingRef.current = false;
      setSaving(false);
    }
  };

  const optionPickerOpen = ['league', 'playerA', 'playerB'].includes(picker);
  const options = (picker === 'league' ? leagues : players.filter((player) => player.id !== (picker === 'playerA' ? playerBId : playerAId)))
    .filter((option) => normalize(option.name).includes(normalize(search.trim())));
  const selectedOptionId = picker === 'league' ? leagueId : picker === 'playerA' ? playerAId : playerBId;
  const pickerTitle = picker === 'league' ? 'Seleccionar liga' : picker === 'playerA' ? 'Seleccionar jugador 1' : 'Seleccionar jugador 2';

  return (
    <View style={styles.screen}>
      {isFocused && <StatusBar style="light" />}
      <View style={styles.frame}>
        <LinearGradient colors={['#855335', '#713C24', '#63311E']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <SafeAreaView edges={['top', 'left', 'right']}>
            <View style={styles.header}>
              <View style={styles.headerNavigation}>
                <Pressable accessibilityRole="button" accessibilityLabel="Volver al administrador" disabled={saving} onPress={() => router.canGoBack() ? router.back() : router.replace('/admin-home')} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
                  <Feather accessible={false} name="arrow-left" size={22} color="#FFFCF4" />
                </Pressable>
                <Text style={styles.eyebrow}>ADMINISTRADOR</Text>
                <View style={styles.headerBadge}><Feather accessible={false} name="calendar" size={22} color="#FFF2D6" /></View>
              </View>
              <Text accessibilityRole="header" style={styles.title}>Crear Fixture</Text>
              <Text style={styles.subtitle}>El próximo encuentro empieza aquí.</Text>
            </View>
          </SafeAreaView>
        </LinearGradient>

        <LinearGradient colors={['#FAF8F1', '#F5F0E2']} style={styles.sheet}>
          <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 24) }]}>
              <View style={styles.contentInner}>
                <View style={styles.formCard}>
                  <View style={styles.cardHeading}>
                    <View style={styles.cardIcon}><Feather accessible={false} name="calendar" size={22} color={GREEN} /></View>
                    <View style={styles.flex}><Text style={styles.cardTitle}>Nuevo partido</Text><Text style={styles.cardDescription}>Organiza el encuentro de tu liga.</Text></View>
                  </View>
                  <SelectField label="Liga" value={selectedLeague?.name} placeholder="Seleccionar liga" icon="award" loading={leaguesLoading} disabled={saving || leaguesLoading || !leagues.length} onPress={() => openPicker('league')} />
                  <ErrorNotice message={leaguesError} onRetry={loadLeagues} />
                  <View style={styles.scheduleRow}>
                    <SelectField label="Fecha" value={matchDate ? formatFixtureDate(matchDate, { month: 'short', year: undefined }) : ''} placeholder="Elegir fecha" icon="calendar" compact disabled={saving} onPress={() => openPicker('date')} />
                    <SelectField label="Hora" value={matchTime ? `${matchTime} hrs.` : ''} placeholder="Elegir hora" icon="clock" compact disabled={saving} onPress={() => openPicker('time')} />
                  </View>
                  <View style={styles.divider} />
                  <SelectField label="Jugador 1" value={playerA?.name} placeholder="Seleccionar jugador" icon="user" loading={playersLoading} disabled={playersDisabled} onPress={() => openPicker('playerA')} />
                  <View style={styles.versus}><View style={styles.versusLine} /><Text style={styles.versusText}>VS</Text><View style={styles.versusLine} /></View>
                  <SelectField label="Jugador 2" value={playerB?.name} placeholder="Seleccionar jugador" icon="user" disabled={playersDisabled} onPress={() => openPicker('playerB')} />
                  <ErrorNotice message={playersError} onRetry={() => setPlayersReload((value) => value + 1)} />
                  <View style={styles.leagueHint}>
                    <Feather accessible={false} name="info" size={15} color="#829077" />
                    <Text style={styles.hintText}>{!leagueId ? 'Selecciona una liga para ver sus jugadores.' : !playersLoading && !playersError && players.length < 2 ? 'Esta liga necesita al menos dos jugadores activos.' : 'Ambos jugadores deben pertenecer a la misma liga.'}</Text>
                  </View>
                  <ErrorNotice message={formError} />
                  <Pressable accessibilityRole="button" accessibilityLabel="Agregar Partido" accessibilityState={{ disabled: saveDisabled, busy: saving }} disabled={saveDisabled} onPress={saveMatch} style={({ pressed }) => [styles.addButton, saveDisabled && styles.disabled, pressed && styles.pressed]}>
                    <LinearGradient colors={['#239552', '#117840', '#106A39']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.addSurface}>
                      {saving ? <ActivityIndicator color="#FFFFFF" /> : <Feather accessible={false} name="plus-circle" size={22} color="#FFFFFF" />}
                      <Text style={styles.addLabel}>{saving ? 'Guardando partido…' : 'Agregar Partido'}</Text>
                    </LinearGradient>
                  </Pressable>
                  <View style={styles.shareHint}><FontAwesome accessible={false} name="whatsapp" size={16} color="#78906B" /><Text style={styles.shareHintText}>Al guardar, comparte el partido por WhatsApp.</Text></View>
                </View>
                {success && <View accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.success}>
                  <View style={styles.successHeading}><Feather accessible={false} name="check-circle" size={22} color={GREEN} /><Text style={styles.successTitle}>¡Partido agregado!</Text></View>
                  <Text style={styles.successMatch}>{success.title}</Text>
                  <Text style={styles.successDetails}>{success.details}</Text>
                  {shareError && <Text style={styles.errorText}>El partido quedó guardado. No se pudo abrir WhatsApp; puedes reintentar aquí.</Text>}
                  <Pressable accessibilityRole="button" accessibilityLabel="Compartir partido por WhatsApp" onPress={() => shareMatch(success.message)} style={styles.shareButton}><FontAwesome accessible={false} name="whatsapp" size={18} color={GREEN} /><Text style={styles.shareButtonText}>Compartir por WhatsApp</Text></Pressable>
                </View>}
              </View>
              <View style={styles.footer}><View style={styles.footerLine} /><Text style={styles.footerText}>ACADEMIA DE TENIS FS</Text><View style={styles.footerLine} /></View>
            </ScrollView>
          </KeyboardAvoidingView>
        </LinearGradient>
      </View>

      <Modal visible={optionPickerOpen} transparent animationType="fade" onRequestClose={() => setPicker(null)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable accessible={false} onPress={() => setPicker(null)} style={StyleSheet.absoluteFill} />
          <SafeAreaView edges={['top', 'bottom']} style={styles.modalSafe} pointerEvents="box-none">
            <View accessibilityViewIsModal style={styles.pickerCard}>
              <View style={styles.pickerHeader}><Text accessibilityRole="header" style={styles.pickerTitle}>{pickerTitle}</Text><Pressable accessibilityRole="button" accessibilityLabel="Cerrar selector" onPress={() => setPicker(null)} style={styles.closeButton}><Feather accessible={false} name="x" size={22} color="#713C24" /></Pressable></View>
              {picker !== 'league' && <Text style={styles.pickerLeague}>{selectedLeague?.name}</Text>}
              <View style={styles.search}><Feather accessible={false} name="search" size={18} color="#958775" /><TextInput accessibilityLabel={picker === 'league' ? 'Buscar liga' : 'Buscar jugador'} placeholder={picker === 'league' ? 'Buscar liga' : 'Buscar jugador'} placeholderTextColor="#958775" value={search} onChangeText={setSearch} style={styles.searchInput} autoCorrect={false} /></View>
              <ScrollView keyboardShouldPersistTaps="handled" style={styles.options}>
                {options.map((option) => <Pressable key={option.id} accessibilityRole="button" accessibilityLabel={option.name} accessibilityState={{ selected: option.id === selectedOptionId }} onPress={() => selectOption(option)} style={({ pressed }) => [styles.option, option.id === selectedOptionId && styles.optionSelected, pressed && styles.pressed]}><Feather accessible={false} name={picker === 'league' ? 'award' : 'user'} size={18} color={GREEN} /><Text style={styles.optionName}>{option.name}</Text>{option.id === selectedOptionId && <Feather accessible={false} name="check" size={18} color={GREEN} />}</Pressable>)}
                {!options.length && <Text style={styles.noOptions}>No hay coincidencias.</Text>}
              </ScrollView>
            </View>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
      {['date', 'time'].includes(picker) && <FixtureSchedulePicker mode={picker} value={picker === 'date' ? matchDate : matchTime} onClose={() => setPicker(null)} onConfirm={(value) => { formChanged(); if (picker === 'date') setMatchDate(value); else setMatchTime(value); setPicker(null); }} />}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', backgroundColor: '#F5F0E2' },
  frame: { flex: 1, width: '100%', maxWidth: 560, backgroundColor: '#713C24' },
  flex: { flex: 1, minWidth: 0 },
  header: { paddingHorizontal: 24, paddingTop: Platform.OS === 'web' ? 26 : 12, paddingBottom: 46 },
  headerNavigation: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 },
  backButton: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255, 252, 244, 0.1)', alignItems: 'center', justifyContent: 'center' },
  eyebrow: { flex: 1, color: '#E6CDB5', fontSize: 10, fontWeight: '700', letterSpacing: 2 },
  headerBadge: { width: 44, height: 44, borderRadius: 16, backgroundColor: 'rgba(255, 241, 213, 0.12)', alignItems: 'center', justifyContent: 'center' },
  title: { color: '#FFFCF4', fontSize: 29, fontWeight: '700' },
  subtitle: { color: '#EBDACB', fontSize: 14, lineHeight: 20, marginTop: 6 },
  sheet: { flex: 1, marginTop: -24, borderTopLeftRadius: 30, borderTopRightRadius: 30, overflow: 'hidden' },
  content: { flexGrow: 1, paddingTop: 20, paddingHorizontal: 18, alignItems: 'center', gap: 28 },
  contentInner: { width: '100%', maxWidth: 440, gap: 16 },
  formCard: { borderRadius: 24, backgroundColor: '#FFFFFF', padding: 20, gap: 16, borderWidth: 1, borderColor: '#F0EBDF' },
  cardHeading: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  cardIcon: { width: 46, height: 46, borderRadius: 15, backgroundColor: '#EAF1E4', alignItems: 'center', justifyContent: 'center' },
  cardTitle: { color: '#30372B', fontSize: 19, fontWeight: '700' },
  cardDescription: { color: '#918671', fontSize: 12, lineHeight: 17, marginTop: 3 },
  field: { flex: 1, gap: 8, minWidth: 0 },
  fieldLabel: { color: '#3A4234', fontSize: 13, fontWeight: '700' },
  select: { minHeight: 52, borderRadius: 13, borderWidth: 1, borderColor: '#EAE8E1', backgroundColor: '#F8F8F4', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 11, paddingVertical: 12, gap: 8 },
  selectFilled: { backgroundColor: '#F4F8EF', borderColor: '#D6E3CC' },
  selectText: { flex: 1, minWidth: 0, color: GREEN, fontSize: 13, lineHeight: 18, fontWeight: '600' },
  compactText: { fontSize: 12 },
  placeholder: { color: '#918C80', fontWeight: '400' },
  scheduleRow: { flexDirection: 'row', gap: 12 },
  divider: { height: 1, backgroundColor: '#F0EBDF', marginVertical: 2 },
  versus: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginVertical: -8 },
  versusLine: { width: 24, height: 1, backgroundColor: '#E5E7DC' },
  versusText: { color: '#A8AE99', fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  leagueHint: { flexDirection: 'row', alignItems: 'flex-start', gap: 7 },
  hintText: { flex: 1, color: '#829077', fontSize: 11, lineHeight: 16 },
  addButton: { borderRadius: 16, overflow: 'hidden', backgroundColor: GREEN },
  addSurface: { minHeight: 54, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  addLabel: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  shareHint: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: -5 },
  shareHintText: { color: '#8D967E', fontSize: 10, lineHeight: 15, flexShrink: 1 },
  error: { borderRadius: 13, padding: 12, backgroundColor: '#FAEDE4', flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  errorText: { color: '#914621', fontSize: 12, lineHeight: 18 },
  retry: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' },
  retryText: { color: '#914621', fontWeight: '700', fontSize: 13 },
  success: { backgroundColor: '#EDF5E8', borderWidth: 1, borderColor: '#D6E5CB', padding: 18, borderRadius: 20, gap: 9 },
  successHeading: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  successTitle: { color: GREEN, fontSize: 16, fontWeight: '700' },
  successMatch: { color: '#34492C', fontSize: 14, fontWeight: '600' },
  successDetails: { color: '#7C896B', fontSize: 12, lineHeight: 18 },
  shareButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 7, alignSelf: 'flex-start' },
  shareButtonText: { color: GREEN, fontSize: 13, fontWeight: '700' },
  footer: { flex: 1, width: '100%', maxWidth: 380, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 10, minHeight: 20 },
  footerLine: { flex: 1, height: 1, backgroundColor: '#DED7C6', marginBottom: 6 },
  footerText: { color: '#AA9B80', fontSize: 9, fontWeight: '600', letterSpacing: 1.3 },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(48, 28, 16, 0.45)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modalSafe: { width: '100%', maxWidth: 420, maxHeight: '90%' },
  pickerCard: { backgroundColor: '#FFFCF5', borderRadius: 26, padding: 20, flexShrink: 1, gap: 12 },
  pickerHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pickerTitle: { flex: 1, color: '#342F26', fontSize: 19, fontWeight: '700' },
  closeButton: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  pickerLeague: { color: GREEN, fontWeight: '600', fontSize: 13, marginTop: -8 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F1EEE5', borderRadius: 13, paddingHorizontal: 12 },
  searchInput: { flex: 1, minWidth: 0, minHeight: 46, color: '#34492C', fontSize: 14, paddingVertical: 12 },
  options: { maxHeight: 350 },
  option: { minHeight: 52, paddingHorizontal: 12, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 13 },
  optionSelected: { backgroundColor: '#EAF1E4' },
  optionName: { flex: 1, color: '#34492C', fontSize: 14, lineHeight: 20 },
  noOptions: { color: '#918671', fontSize: 14, padding: 20, textAlign: 'center' },
});

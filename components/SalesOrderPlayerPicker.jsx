import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fetchActivePlayers } from '../services/resultService';

const GREEN = '#145B40';
const normalizeSearch = (value) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').trim();
const leagueLabel = (player) => player.league?.name || `Liga ${player.league_id}`;

export default function SalesOrderPlayerPicker({ initialPlayerId, totalLabel, submitting = false, submitError = '', onClose, onConfirm }) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const panelRef = useRef(null);
  const closeRef = useRef(null);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(initialPlayerId || null);
  const selectedPlayer = players.find((player) => player.id === selectedId);
  const query = normalizeSearch(search);
  const filteredPlayers = players.filter((player) => normalizeSearch(`${player.name} ${leagueLabel(player)}`).includes(query));
  const confirmDisabled = !selectedPlayer || loading || Boolean(error) || submitting;

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    setLoading(true);
    setError('');
    fetchActivePlayers({ signal: controller.signal })
      .then((availablePlayers) => {
        if (!cancelled) setPlayers(availablePlayers);
      })
      .catch(() => {
        if (!cancelled) setError('No se pudieron cargar los jugadores. Revisa tu conexión e intenta nuevamente.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [reload]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const previousFocus = document.activeElement;
    closeRef.current?.focus();
    const handleTab = (event) => {
      if (event.key !== 'Tab') return;
      const controls = Array.from(panelRef.current?.querySelectorAll('input, button, [tabindex="0"]') || [])
        .filter((control) => !control.disabled && control.getAttribute('aria-disabled') !== 'true');
      if (!controls.length) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && (document.activeElement === first || !panelRef.current?.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !panelRef.current?.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleTab);
    return () => {
      document.removeEventListener('keydown', handleTab);
      previousFocus?.focus?.();
    };
  }, []);

  return (
    <View style={styles.overlay}>
      <Pressable accessible={false} disabled={submitting} onPress={onClose} style={styles.backdrop} />
      <KeyboardAvoidingView
        pointerEvents="box-none"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[styles.popupPosition, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}>
        <View
          ref={panelRef}
          role="dialog"
          aria-modal
          accessibilityViewIsModal
          accessibilityLabel="Seleccionar jugador para el pedido"
          style={[styles.panel, { height: Math.min(620, height - insets.top - insets.bottom - 32) }]}>
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text accessibilityRole="header" style={styles.title}>Seleccionar jugador</Text>
              <Text style={styles.subtitle}>Elige un jugador de cualquier liga.</Text>
            </View>
            <Pressable ref={closeRef} accessibilityRole="button" accessibilityLabel="Cerrar selección de jugador" accessibilityState={{ disabled: submitting }} disabled={submitting} onPress={onClose} style={({ pressed }) => [styles.closeButton, (pressed || submitting) && styles.pressed]}>
              <Feather accessible={false} name="x" size={21} color="#713C24" />
            </Pressable>
          </View>

          <View style={styles.searchField}>
            <Feather accessible={false} name="search" size={18} color="#8B7B65" />
            <TextInput
              accessibilityLabel="Buscar jugador para el pedido"
              placeholder="Buscar por nombre o liga"
              placeholderTextColor="#948873"
              value={search}
              editable={!submitting}
              onChangeText={setSearch}
              autoCorrect={false}
              returnKeyType="done"
              selectionColor={GREEN}
              style={styles.searchInput}
            />
            {search ? (
              <Pressable accessibilityRole="button" accessibilityLabel="Limpiar búsqueda de jugadores" disabled={submitting} onPress={() => setSearch('')} hitSlop={8} style={styles.clearSearch}>
                <Feather accessible={false} name="x-circle" size={17} color="#8B7B65" />
              </Pressable>
            ) : null}
          </View>

          {loading ? (
            <View style={styles.listNotice} accessibilityRole="progressbar" accessibilityLabel="Cargando jugadores">
              <ActivityIndicator color={GREEN} />
              <Text style={styles.noticeText}>Cargando jugadores…</Text>
            </View>
          ) : error ? (
            <View style={styles.listNotice}>
              <Feather accessible={false} name="wifi-off" size={28} color="#9A4B2A" />
              <Text accessibilityRole="alert" style={styles.noticeText}>{error}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Reintentar carga de jugadores" onPress={() => setReload((value) => value + 1)} style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}>
                <Text style={styles.retryLabel}>Reintentar</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <Text accessibilityLiveRegion="polite" style={styles.resultCount}>{filteredPlayers.length} {filteredPlayers.length === 1 ? 'jugador disponible' : 'jugadores disponibles'}</Text>
              <View role="radiogroup" accessibilityLabel="Jugadores disponibles" style={styles.playerList}>
                <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.playerListContent}>
                  {filteredPlayers.map((player) => {
                    const selected = player.id === selectedId;
                    return (
                      <Pressable
                        key={player.id}
                        accessibilityRole="radio"
                        accessibilityLabel={`${player.name}, ${leagueLabel(player)}`}
                        accessibilityState={{ checked: selected, disabled: submitting }}
                        aria-checked={selected}
                        disabled={submitting}
                        onPress={() => setSelectedId(player.id)}
                        style={({ pressed }) => [styles.playerRow, selected && styles.playerSelected, pressed && styles.pressed]}>
                        <View style={[styles.avatar, selected && styles.avatarSelected]}>
                          <Text style={[styles.initials, selected && styles.initialsSelected]}>{player.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toLocaleUpperCase('es')}</Text>
                        </View>
                        <View style={styles.playerInfo}>
                          <Text style={styles.playerName}>{player.name}</Text>
                          <Text style={styles.playerLeague}>{leagueLabel(player)}</Text>
                        </View>
                        <Feather accessible={false} name={selected ? 'check-circle' : 'circle'} size={20} color={selected ? GREEN : '#C7C9BA'} />
                      </Pressable>
                    );
                  })}
                  {filteredPlayers.length === 0 && (
                    <View style={styles.emptyList}>
                      <Feather accessible={false} name="users" size={30} color="#948873" />
                      <Text style={styles.noticeText}>{players.length ? 'No encontramos jugadores con esa búsqueda.' : 'Todavía no hay jugadores activos disponibles.'}</Text>
                    </View>
                  )}
                </ScrollView>
              </View>
            </>
          )}

          <View style={styles.footer}>
            {submitError ? <Text accessibilityRole="alert" style={styles.submitError}>{submitError}</Text> : null}
            <View style={styles.summaryRow}>
              <View style={styles.selectionInfo}>
                <Text style={styles.selectionLabel}>{selectedPlayer ? 'Jugador seleccionado' : 'Selecciona un jugador'}</Text>
                {selectedPlayer && <Text style={styles.selectedName}>{selectedPlayer.name}</Text>}
              </View>
              <Text style={styles.total}>{totalLabel}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Confirmar Pedido"
              accessibilityState={{ disabled: confirmDisabled, busy: submitting }}
              disabled={confirmDisabled}
              onPress={() => onConfirm(selectedPlayer)}
              style={({ pressed }) => [styles.confirmButton, (pressed || confirmDisabled) && styles.pressed]}>
              <LinearGradient colors={['#27804D', '#145B40']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.confirmSurface}>
                {submitting ? <ActivityIndicator color="#FFFCF4" size="small" /> : <Feather accessible={false} name="check" size={20} color="#FFFCF4" />}
                <Text style={styles.confirmLabel}>{submitting ? 'Guardando pedido…' : 'Confirmar Pedido'}</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, zIndex: 10 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(43, 30, 20, 0.45)' },
  popupPosition: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16 },
  panel: { width: '100%', maxWidth: 440, maxHeight: '100%', flexShrink: 1, padding: 20, borderRadius: 26, backgroundColor: '#FFFCF5' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  headerText: { flex: 1, minWidth: 0 },
  title: { fontSize: 20, lineHeight: 26, fontWeight: '700', color: '#30261D' },
  subtitle: { fontSize: 12, lineHeight: 18, color: '#89785F', marginTop: 4 },
  closeButton: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#F3EBDC', alignItems: 'center', justifyContent: 'center' },
  searchField: { minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: 9, borderWidth: 1, borderColor: '#E4DDCD', borderRadius: 14, paddingHorizontal: 12, backgroundColor: '#FFFFFF' },
  searchInput: { flex: 1, minWidth: 0, height: 44, fontSize: 13, color: '#34412F', ...Platform.select({ web: { outlineStyle: 'none' } }) },
  clearSearch: { minWidth: 24, minHeight: 36, alignItems: 'center', justifyContent: 'center' },
  resultCount: { fontSize: 11, lineHeight: 16, color: '#89785F', marginTop: 12, marginBottom: 8 },
  playerList: { flex: 1, minHeight: 0 },
  playerListContent: { gap: 8, paddingBottom: 6 },
  playerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 66, padding: 11, borderWidth: 1, borderColor: '#EBE4D8', borderRadius: 15, backgroundColor: '#FFFFFF' },
  playerSelected: { borderColor: '#84A97C', backgroundColor: '#EBF3E5' },
  avatar: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F2EADB' },
  avatarSelected: { backgroundColor: GREEN },
  initials: { fontSize: 12, fontWeight: '700', color: '#8B5937' },
  initialsSelected: { color: '#FFFCF4' },
  playerInfo: { flex: 1, minWidth: 0 },
  playerName: { fontSize: 13, lineHeight: 19, fontWeight: '600', color: '#34412F' },
  playerLeague: { fontSize: 11, lineHeight: 16, color: '#89785F', marginTop: 2 },
  listNotice: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 14, paddingVertical: 20 },
  noticeText: { fontSize: 13, lineHeight: 20, color: '#89785F', textAlign: 'center' },
  retryButton: { minHeight: 44, borderRadius: 12, paddingHorizontal: 20, justifyContent: 'center', backgroundColor: '#E6EDDD' },
  retryLabel: { fontSize: 13, fontWeight: '600', color: GREEN },
  emptyList: { paddingVertical: 35, paddingHorizontal: 10, alignItems: 'center', gap: 14 },
  footer: { borderTopWidth: 1, borderTopColor: '#EAE2D1', paddingTop: 14, marginTop: 12, gap: 14 },
  submitError: { fontSize: 12, lineHeight: 18, color: '#9A4B2A' },
  summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  selectionInfo: { flex: 1, minWidth: 0 },
  selectionLabel: { fontSize: 11, lineHeight: 16, color: '#89785F' },
  selectedName: { fontSize: 13, lineHeight: 19, fontWeight: '600', color: GREEN, marginTop: 2 },
  total: { fontSize: 20, lineHeight: 26, color: '#713C24', fontWeight: '700', flexShrink: 1 },
  confirmButton: { borderRadius: 15, overflow: 'hidden', backgroundColor: GREEN },
  confirmSurface: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, paddingHorizontal: 12, paddingVertical: 14 },
  confirmLabel: { fontSize: 14, lineHeight: 21, fontWeight: '700', color: '#FFFCF4' },
  pressed: { opacity: 0.55 },
});

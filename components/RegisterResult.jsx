import { Feather, FontAwesome } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
    name: '',
    sets: ['', '', ''],
  },
  {
    id: 'playerB',
    name: '',
    sets: ['', '', ''],
  },
];

export default function RegisterResult() {
  const [rows, setRows] = useState(INITIAL_ROWS);
  const [activePickerRow, setActivePickerRow] = useState(null);
  const [playerSearch, setPlayerSearch] = useState('');

  const updateName = (rowIndex, value) => {
    setRows((currentRows) =>
      currentRows.map((row, index) =>
        index === rowIndex ? { ...row, name: value } : row
      )
    );
  };

  const updateSet = (rowIndex, setIndex, value) => {
    setRows((currentRows) =>
      currentRows.map((row, index) =>
        index === rowIndex
          ? {
              ...row,
              sets: row.sets.map((setValue, currentSetIndex) =>
                currentSetIndex === setIndex ? value : setValue
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

  const handlePlayerSelect = (playerName) => {
    if (activePickerRow === null) {
      return;
    }

    updateName(activePickerRow, playerName);
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
    ? LEAGUE_B_PLAYERS
    : LEAGUE_B_PLAYERS.filter((player) => player.toLowerCase().includes(query));

  const handleSubmitResult = () => {
    const hasAnyScore = rows.some((row) =>
      row.sets.some((setValue) => setValue.trim().length > 0)
    );

    if (!hasAnyScore) {
      Alert.alert('Debe registrar resultados en el marcador');
      return;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
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
                      numberOfLines={1}>
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
          </View>

          <Pressable style={styles.primaryButton} onPress={handleSubmitResult}>
            <Text style={styles.primaryButtonText}>Enviar Resultado</Text>
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
      </View>

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
                const isDisabled = selectedByOtherRow.includes(player);
                const isSelected =
                  activePickerRow !== null && rows[activePickerRow]?.name === player;

                return (
                  <Pressable
                    key={player}
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
                      {player}
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
    flex: 1,
    backgroundColor: '#F7F3EE',
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 26,
    justifyContent: 'space-between',
  },
  logoSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 16,
    paddingBottom: 22,
  },
  logo: {
    width: 170,
    height: 170,
  },
  centerSection: {
    flex: 1.2,
    width: '100%',
    justifyContent: 'center',
    marginBottom: 130,
  },
  scoreboardCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 22,
    shadowColor: '#9F6A3F',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.13,
    shadowRadius: 24,
    elevation: 10,
  },
  scoreboardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#8C7B73',
    marginBottom: 16,
    letterSpacing: 0.3,
  },
  table: {
    width: '100%',
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#DDE4EF',
  },
  tableRow: {
    flexDirection: 'row',
    minHeight: 74,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#DDE4EF',
  },
  lastTableRow: {
    borderBottomWidth: 0,
  },
  playerCell: {
    flex: 1.6,
    backgroundColor: '#355F9F',
    paddingHorizontal: 10,
    justifyContent: 'space-between',
    alignItems: 'center',
    flexDirection: 'row',
    borderRightWidth: 4,
    borderRightColor: '#D8E445',
  },
  playerInput: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    paddingVertical: 0,
    flex: 1,
    marginRight: 8,
  },
  playerPlaceholder: {
    color: '#D9E1F4',
  },
  setCell: {
    flex: 0.7,
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
    fontSize: 22,
    fontWeight: '500',
    paddingVertical: 0,
  },
  footerSection: {
    width: '100%',
  },
  primaryButton: {
    minHeight: 60,
    borderRadius: 18,
    backgroundColor: '#A66132',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 18,
    shadowColor: '#A66132',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
    width: '100%',
    marginTop: 30,
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
    fontSize: 24,
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

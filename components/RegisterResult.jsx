import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const INITIAL_ROWS = [
  {
    id: 'playerA',
    name: 'Federer',
    sets: ['6', '7', '6'],
  },
  {
    id: 'playerB',
    name: 'Nadal',
    sets: ['4', '5', '7'],
  },
];

export default function RegisterResult() {
  const [rows, setRows] = useState(INITIAL_ROWS);

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
                  <View style={styles.playerCell}>
                    <TextInput
                      value={row.name}
                      onChangeText={(value) => updateName(rowIndex, value)}
                      placeholder="Jugador"
                      placeholderTextColor="#D9E1F4"
                      style={styles.playerInput}
                      selectionColor="#FFFFFF"
                    />
                  </View>

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

          <Pressable style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Enviar Resultado</Text>
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
    paddingHorizontal: 12,
    justifyContent: 'center',
    borderRightWidth: 4,
    borderRightColor: '#D8E445',
  },
  playerInput: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    paddingVertical: 0,
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
});

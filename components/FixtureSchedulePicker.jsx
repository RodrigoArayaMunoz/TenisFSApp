import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { formatFixtureDate, getChileSchedule } from '../services/fixtureService';

const GREEN = '#145B40';
const pad = (value) => String(value).padStart(2, '0');
const HOURS = Array.from({ length: 24 }, (_, index) => pad(index));
const MINUTES = Array.from({ length: 60 }, (_, index) => pad(index));

function TimeColumn({ label, values, value, onChange }) {
  return (
    <View style={styles.timeColumn}>
      <Text style={styles.columnLabel}>{label}</Text>
      <FlatList
        style={styles.timeList}
        data={values}
        keyExtractor={(item) => item}
        initialScrollIndex={Math.max(0, values.indexOf(value) - 2)}
        getItemLayout={(_data, index) => ({ length: 44, offset: 44 * index, index })}
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${label}: ${item}`}
            accessibilityState={{ selected: item === value }}
            onPress={() => onChange(item)}
            style={[styles.timeOption, item === value && styles.selected]}>
            <Text style={[styles.timeText, item === value && styles.selectedText]}>{item}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

// Mounted only while open so each new selection starts from the current value.
export default function FixtureSchedulePicker({ mode, value, onConfirm, onClose }) {
  const today = getChileSchedule().date;
  const [selectedDate, setSelectedDate] = useState(mode === 'date' && value ? value : today);
  const [month, setMonth] = useState(() => new Date(`${selectedDate.slice(0, 7)}-01T12:00:00Z`));
  const [hour, setHour] = useState(mode === 'time' && value ? value.slice(0, 2) : '18');
  const [minute, setMinute] = useState(mode === 'time' && value ? value.slice(3, 5) : '00');
  const year = month.getUTCFullYear();
  const monthIndex = month.getUTCMonth();
  const firstDay = (month.getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const cells = Array.from({ length: Math.ceil((firstDay + daysInMonth) / 7) * 7 }, (_, index) => {
    const day = index - firstDay + 1;
    return day > 0 && day <= daysInMonth ? `${year}-${pad(monthIndex + 1)}-${pad(day)}` : null;
  });
  const previousDisabled = `${year}-${pad(monthIndex + 1)}` <= today.slice(0, 7);
  const changeMonth = (offset) => setMonth(new Date(Date.UTC(year, monthIndex + offset, 1, 12)));

  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable accessible={false} onPress={onClose} style={StyleSheet.absoluteFill} />
        <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea} pointerEvents="box-none">
          <View accessibilityViewIsModal style={styles.card}>
            <View style={styles.header}>
              <Text accessibilityRole="header" style={styles.title}>{mode === 'date' ? 'Seleccionar fecha' : 'Seleccionar hora'}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Cerrar selector" onPress={onClose} style={styles.iconButton}>
                <Feather accessible={false} name="x" size={22} color="#713C24" />
              </Pressable>
            </View>
            {mode === 'date' ? (
              <>
                <View style={styles.monthHeader}>
                  <Pressable accessibilityRole="button" accessibilityLabel="Mes anterior" accessibilityState={{ disabled: previousDisabled }} disabled={previousDisabled} onPress={() => changeMonth(-1)} style={[styles.iconButton, previousDisabled && styles.disabled]}>
                    <Feather accessible={false} name="chevron-left" size={22} color={GREEN} />
                  </Pressable>
                  <Text style={styles.monthTitle}>{formatFixtureDate(`${year}-${pad(monthIndex + 1)}-01`, { day: undefined })}</Text>
                  <Pressable accessibilityRole="button" accessibilityLabel="Mes siguiente" onPress={() => changeMonth(1)} style={styles.iconButton}>
                    <Feather accessible={false} name="chevron-right" size={22} color={GREEN} />
                  </Pressable>
                </View>
                <View style={styles.calendar}>
                  {['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'].map((day) => <View key={day} style={styles.weekDay}><Text style={styles.weekDayText}>{day}</Text></View>)}
                  {cells.map((date, index) => {
                    const disabled = !date || date < today;
                    return (
                      <View key={date || `empty-${index}`} style={styles.dayCell}>
                        {date && <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={formatFixtureDate(date)}
                          accessibilityState={{ selected: date === selectedDate, disabled }}
                          disabled={disabled}
                          onPress={() => setSelectedDate(date)}
                          style={[styles.dayButton, date === today && styles.today, date === selectedDate && styles.selected, disabled && styles.disabled]}>
                          <Text style={[styles.dayText, date === selectedDate && styles.selectedText]}>{Number(date.slice(-2))}</Text>
                        </Pressable>}
                      </View>
                    );
                  })}
                </View>
              </>
            ) : (
              <>
                <Text style={styles.timeHint}>Hora de Chile · formato de 24 horas</Text>
                <View style={styles.timeColumns}>
                  <TimeColumn label="Hora" values={HOURS} value={hour} onChange={setHour} />
                  <Text style={styles.colon}>:</Text>
                  <TimeColumn label="Minutos" values={MINUTES} value={minute} onChange={setMinute} />
                </View>
                <Text accessibilityLiveRegion="polite" style={styles.timePreview}>{hour}:{minute} hrs.</Text>
              </>
            )}
            <Pressable accessibilityRole="button" accessibilityLabel={mode === 'date' ? 'Confirmar fecha' : 'Confirmar hora'} onPress={() => onConfirm(mode === 'date' ? selectedDate : `${hour}:${minute}`)} style={({ pressed }) => [styles.confirm, pressed && styles.disabled]}>
              <Feather accessible={false} name="check" size={19} color="#FFFFFF" />
              <Text style={styles.confirmText}>{mode === 'date' ? 'Confirmar fecha' : 'Confirmar hora'}</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(48, 28, 16, 0.45)', justifyContent: 'center', alignItems: 'center', padding: 18 },
  safeArea: { width: '100%', maxWidth: 400 },
  card: { backgroundColor: '#FFFCF5', borderRadius: 26, padding: 18, gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flex: 1, fontSize: 19, fontWeight: '700', color: '#342F26' },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 14 },
  monthHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  monthTitle: { fontSize: 16, fontWeight: '700', color: GREEN, textTransform: 'capitalize' },
  calendar: { flexDirection: 'row', flexWrap: 'wrap' },
  weekDay: { width: `${100 / 7}%`, height: 30, alignItems: 'center', justifyContent: 'center' },
  weekDayText: { color: '#8D806F', fontSize: 12, fontWeight: '600' },
  dayCell: { width: `${100 / 7}%`, height: 44, alignItems: 'center', justifyContent: 'center' },
  dayButton: { width: '100%', maxWidth: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 14 },
  dayText: { fontSize: 15, color: '#34362F', fontWeight: '500' },
  today: { borderWidth: 1, borderColor: '#B4CDB7' },
  selected: { backgroundColor: GREEN },
  selectedText: { color: '#FFFFFF', fontWeight: '700' },
  disabled: { opacity: 0.3 },
  timeHint: { color: '#8D806F', fontSize: 13 },
  timeColumns: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  timeColumn: { flex: 1, maxWidth: 120 },
  columnLabel: { fontSize: 13, color: GREEN, textAlign: 'center', marginBottom: 10, fontWeight: '700' },
  timeList: { height: 220, backgroundColor: '#F3EEE2', borderRadius: 16 },
  timeOption: { height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 14, marginHorizontal: 5 },
  timeText: { fontSize: 21, color: '#615C50' },
  colon: { fontSize: 26, color: GREEN, fontWeight: '700' },
  timePreview: { color: GREEN, textAlign: 'center', fontSize: 22, fontWeight: '700', paddingVertical: 8 },
  confirm: { minHeight: 50, borderRadius: 16, backgroundColor: GREEN, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8 },
  confirmText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});

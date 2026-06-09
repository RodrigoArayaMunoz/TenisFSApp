import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { isSupabaseConfigured, verifyAdminKey } from '../services/adminService';
import { showUserAlert } from '../utils/alerts';

const KEY_LENGTH = 4;
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

export default function AdminKey() {
  const [digits, setDigits] = useState(Array(KEY_LENGTH).fill(''));
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [isValidating, setIsValidating] = useState(false);
  const inputRefs = useRef([]);

  useEffect(() => {
    const focusTimer = setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 250);

    return () => clearTimeout(focusTimer);
  }, []);

  const updateDigit = (index, value) => {
    const sanitizedValue = value.replace(/[^0-9]/g, '').slice(-1);

    setDigits((currentDigits) =>
      currentDigits.map((digit, currentIndex) =>
        currentIndex === index ? sanitizedValue : digit
      )
    );

    if (sanitizedValue && index < KEY_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (index, key) => {
    if (key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const clearKey = () => {
    setDigits(Array(KEY_LENGTH).fill(''));
    inputRefs.current[0]?.focus();
  };

  const handleAdminAccess = async () => {
    const adminKey = digits.join('');

    if (adminKey.length < KEY_LENGTH) {
      showUserAlert('Clave incompleta', 'Debe ingresar los 4 numeros de la clave.');
      return;
    }

    if (!isSupabaseConfigured) {
      showUserAlert(
        'Supabase no configurado',
        'Agrega EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_ANON_KEY para validar la clave.'
      );
      return;
    }

    setIsValidating(true);

    try {
      const isValidAdmin = await verifyAdminKey(adminKey);

      if (!isValidAdmin) {
        showUserAlert('Clave incorrecta', 'La clave ingresada no corresponde.');
        clearKey();
        return;
      }

      router.push('/admin-dashboard');
    } catch (error) {
      showUserAlert('Error de validacion', error.message);
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.courtBackground}>
        <View style={[styles.courtLine, styles.netLine]} />
        <View style={[styles.courtLine, styles.topBaseline]} />
        <View style={[styles.courtLine, styles.middleBaseline]} />
        <View style={[styles.courtLine, styles.bottomBaseline]} />
        <View style={[styles.courtLine, styles.leftSideline]} />
        <View style={[styles.courtLine, styles.centerSideline]} />
        <View style={[styles.courtLine, styles.rightSideline]} />
        <View style={styles.netMesh} />
      </View>

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
          <Text style={styles.title}>Ingrese su PIN de Administrador</Text>

          <View style={styles.keyRow}>
            {digits.map((digit, index) => (
              <TextInput
                key={`admin-key-${index}`}
                ref={(input) => {
                  inputRefs.current[index] = input;
                }}
                value={digit ? '*' : ''}
                onChangeText={(value) => updateDigit(index, value)}
                onKeyPress={({ nativeEvent }) =>
                  handleKeyPress(index, nativeEvent.key)
                }
                onFocus={() => setFocusedIndex(index)}
                keyboardType="number-pad"
                maxLength={1}
                selectTextOnFocus
                style={[
                  styles.keyInput,
                  focusedIndex === index && styles.keyInputActive,
                  Platform.OS === 'web' && styles.keyInputWeb,
                ]}
                textAlign="center"
                selectionColor="#2F8A4D"
              />
            ))}
          </View>

          <Pressable
            style={[styles.adminButton, isValidating && styles.buttonDisabled]}
            onPress={handleAdminAccess}
            disabled={isValidating}>
            <Feather name="check-circle" size={24} color="#FFFFFF" />
            <Text style={styles.adminButtonText}>
              {isValidating ? 'Validando...' : 'Ingresar'}
            </Text>
          </Pressable>
        </View>

        <View style={styles.footerSection}>
          <Pressable
            style={styles.secondaryButton}
            onPress={() => router.replace('/login')}>
            <Feather name="home" size={26} color="#FFFFFF" />
            <Text style={styles.secondaryButtonText}>Volver al menu principal</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F4EF',
  },
  courtBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#F8F4EF',
    overflow: 'hidden',
    pointerEvents: 'none',
  },
  courtLine: {
    position: 'absolute',
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.78)',
    borderRadius: 99,
    ...buildShadow({
      color: '#FFFFFF',
      offset: { width: 0, height: 0 },
      opacity: 0.55,
      radius: 8,
      elevation: 0,
      web: '0px 0px 8px rgba(255, 255, 255, 0.55)',
    }),
  },
  netLine: {
    top: '26%',
    left: '-18%',
    width: '138%',
    height: 1,
    backgroundColor: 'rgba(162, 123, 92, 0.1)',
    transform: [{ rotate: '-7deg' }],
  },
  topBaseline: {
    top: '36%',
    left: '-10%',
    width: '126%',
    transform: [{ rotate: '-7deg' }],
  },
  middleBaseline: {
    top: '67%',
    left: '-8%',
    width: '124%',
    transform: [{ rotate: '14deg' }],
  },
  bottomBaseline: {
    bottom: '13%',
    left: '-20%',
    width: '142%',
    transform: [{ rotate: '-17deg' }],
  },
  leftSideline: {
    top: '33%',
    left: '10%',
    width: '86%',
    transform: [{ rotate: '63deg' }],
  },
  centerSideline: {
    top: '51%',
    left: '31%',
    width: '88%',
    transform: [{ rotate: '63deg' }],
  },
  rightSideline: {
    top: '43%',
    right: '-28%',
    width: '98%',
    transform: [{ rotate: '63deg' }],
  },
  netMesh: {
    position: 'absolute',
    top: '25%',
    left: '-14%',
    width: '132%',
    height: 122,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(136, 119, 106, 0.08)',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    transform: [{ rotate: '-7deg' }],
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 24,
    justifyContent: 'space-between',
  },
  logoSection: {
    flex: 0.95,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 18,
    paddingBottom: 16,
  },
  logo: {
    width: 230,
    height: 230,
  },
  centerSection: {
    flex: 1.15,
    alignItems: 'center',
    justifyContent: 'flex-start',
    width: '100%',
  },
  title: {
    maxWidth: 430,
    fontSize: 36,
    lineHeight: 42,
    fontWeight: '900',
    color: '#3B170F',
    marginBottom: 38,
    textAlign: 'center',
  },
  keyRow: {
    width: '100%',
    maxWidth: 430,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  keyInput: {
    flex: 1,
    maxWidth: 78,
    height: 76,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderWidth: 2,
    borderColor: '#D8CEC4',
    color: '#3B170F',
    fontSize: 34,
    fontWeight: '900',
    ...buildShadow({
      color: '#9F6A3F',
      offset: { width: 0, height: 10 },
      opacity: 0.08,
      radius: 18,
      elevation: 4,
      web: '0px 10px 18px rgba(159, 106, 63, 0.08)',
    }),
  },
  keyInputActive: {
    borderColor: '#10A842',
    ...buildShadow({
      color: '#11B74B',
      offset: { width: 0, height: 12 },
      opacity: 0.3,
      radius: 18,
      elevation: 8,
      web: '0px 12px 18px rgba(17, 183, 75, 0.3)',
    }),
  },
  keyInputWeb: {
    textAlign: 'center',
    paddingHorizontal: 0,
  },
  adminButton: {
    minHeight: 70,
    borderRadius: 22,
    backgroundColor: '#05B743',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 18,
    marginTop: 30,
    width: '100%',
    maxWidth: 430,
    ...buildShadow({
      color: '#05B743',
      offset: { width: 0, height: 14 },
      opacity: 0.25,
      radius: 20,
      elevation: 6,
      web: '0px 14px 20px rgba(5, 183, 67, 0.25)',
    }),
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  adminButtonText: {
    fontSize: 25,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  footerSection: {
    width: '100%',
  },
  secondaryButton: {
    minHeight: 66,
    borderRadius: 20,
    backgroundColor: '#7A3D1C',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    paddingHorizontal: 18,
    ...buildShadow({
      color: '#7A3D1C',
      offset: { width: 0, height: 10 },
      opacity: 0.2,
      radius: 18,
      elevation: 7,
      web: '0px 10px 18px rgba(122, 61, 28, 0.2)',
    }),
  },
  secondaryButtonText: {
    fontSize: 20,
    fontWeight: '500',
    color: '#FFFFFF',
  },
});

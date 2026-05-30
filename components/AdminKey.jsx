import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { isSupabaseConfigured, verifyAdminKey } from '../services/adminService';

const KEY_LENGTH = 4;

export default function AdminKey() {
  const [digits, setDigits] = useState(Array(KEY_LENGTH).fill(''));
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
      Alert.alert('Clave incompleta', 'Debe ingresar los 4 numeros de la clave.');
      return;
    }

    if (!isSupabaseConfigured) {
      Alert.alert(
        'Supabase no configurado',
        'Agrega EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_ANON_KEY para validar la clave.'
      );
      return;
    }

    setIsValidating(true);

    try {
      const isValidAdmin = await verifyAdminKey(adminKey);

      if (!isValidAdmin) {
        Alert.alert('Clave incorrecta', 'La clave ingresada no corresponde.');
        clearKey();
        return;
      }

      router.push('/admin-dashboard');
    } catch (error) {
      Alert.alert('Error de validacion', error.message);
    } finally {
      setIsValidating(false);
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
          <Text style={styles.title}>Digite clave numerica</Text>

          <View style={styles.keyRow}>
            {digits.map((digit, index) => (
              <TextInput
                key={`admin-key-${index}`}
                ref={(input) => {
                  inputRefs.current[index] = input;
                }}
                value={digit}
                onChangeText={(value) => updateDigit(index, value)}
                onKeyPress={({ nativeEvent }) =>
                  handleKeyPress(index, nativeEvent.key)
                }
                keyboardType="number-pad"
                maxLength={1}
                selectTextOnFocus
                style={styles.keyInput}
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
            <Feather name="arrow-left" size={22} color="#FFFFFF" />
            <Text style={styles.secondaryButtonText}>Volver</Text>
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
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginBottom: 150,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#6E5C51',
    marginBottom: 22,
  },
  keyRow: {
    width: '100%',
    maxWidth: 320,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  keyInput: {
    width: 66,
    height: 70,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#D6C8BA',
    color: '#2F3A31',
    fontSize: 30,
    fontWeight: '800',
    shadowColor: '#9F6A3F',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
  },
  adminButton: {
    minHeight: 54,
    borderRadius: 18,
    backgroundColor: '#2F8A4D',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 18,
    marginTop: 28,
    shadowColor: '#2F8A4D',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 6,
    width: '100%',
    maxWidth: 320,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  adminButtonText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  footerSection: {
    width: '100%',
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
  secondaryButtonText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

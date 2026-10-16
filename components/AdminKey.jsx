import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import {
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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

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
  const { next } = useLocalSearchParams();
  const nextScreen = Array.isArray(next) ? next[0] : next;
  const [digits, setDigits] = useState(Array(KEY_LENGTH).fill(''));
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [isValidating, setIsValidating] = useState(false);
  const [hasMounted, setHasMounted] = useState(!isWeb);
  const inputRefs = useRef([]);
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const scale = hasMounted
    ? Math.max(0.86, Math.min(width / 390, height / 750, 1.2))
    : 1;
  const topSpacing = hasMounted
    ? Math.max(24, Math.min(124, height * 0.14) - insets.top)
    : 105;
  const logoSize = 174 * scale;

  useEffect(() => {
    setHasMounted(true);
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

      if (nextScreen === 'sales') {
        router.push({ pathname: '/sales-panel', params: { backTo: '/login' } });
      } else {
        router.push('/admin-home');
      }
    } catch (error) {
      showUserAlert('Error de validacion', error.message);
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <View style={styles.screen}>
      {isFocused && <StatusBar style="dark" />}
      <View style={styles.frame}>
        <View
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={StyleSheet.absoluteFill}>
          <Image
            source={require('../assets/images/admin-court-background.png')}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            contentPosition="bottom center"
          />
          <LinearGradient
            colors={[
              'rgba(247, 243, 233, 0)',
              'rgba(247, 243, 233, 0.76)',
              'rgba(247, 243, 233, 0.46)',
            ]}
            locations={[0.55, 0.74, 1]}
            style={StyleSheet.absoluteFill}
          />
        </View>

        <SafeAreaView style={styles.safeArea} edges={['top', 'right', 'bottom', 'left']}>
          <KeyboardAvoidingView
            style={styles.safeArea}
            behavior={Platform.OS === 'ios' ? 'padding' : Platform.OS === 'android' ? 'height' : undefined}>
            <ScrollView
              contentContainerStyle={[
                styles.container,
                {
                  paddingTop: topSpacing,
                  paddingHorizontal: 40 * scale,
                  paddingBottom: 24 * scale,
                },
              ]}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}>
              <View style={styles.content}>
                <Image
                  source={require('../assets/images/logofs.png')}
                  accessibilityLabel="Academia de Tenis FS, Sexta Región"
                  style={{ width: logoSize, height: logoSize }}
                  contentFit="contain"
                />

                <Text
                  accessibilityRole="header"
                  style={[
                    styles.title,
                    {
                      fontSize: 26 * scale,
                      lineHeight: 32 * scale,
                      marginTop: 22 * scale,
                    },
                  ]}>
                  Acceso Administrador
                </Text>
                <Text
                  style={[
                    styles.subtitle,
                    {
                      fontSize: 17 * scale,
                      lineHeight: 22 * scale,
                      marginTop: 6 * scale,
                    },
                  ]}>
                  Ingrese su PIN para continuar
                </Text>

                <View
                  style={[
                    styles.keyRow,
                    { maxWidth: 272 * scale, gap: 14 * scale, marginTop: 34 * scale },
                  ]}>
                  {digits.map((digit, index) => (
                    <View
                      key={'admin-key-' + index}
                      style={[
                        styles.keyBox,
                        { height: 58 * scale, borderRadius: 15 * scale },
                        focusedIndex === index && styles.keyBoxActive,
                      ]}>
                      <TextInput
                        ref={(input) => {
                          inputRefs.current[index] = input;
                        }}
                        accessibilityLabel={'Dígito ' + (index + 1) + ' del PIN'}
                        value={digit}
                        secureTextEntry
                        caretHidden
                        onChangeText={(value) => updateDigit(index, value)}
                        onKeyPress={({ nativeEvent }) =>
                          handleKeyPress(index, nativeEvent.key)
                        }
                        onFocus={() => setFocusedIndex(index)}
                        keyboardType="number-pad"
                        inputMode="numeric"
                        autoComplete="off"
                        autoCorrect={false}
                        spellCheck={false}
                        editable={!isValidating}
                        maxLength={1}
                        selectTextOnFocus
                        style={[
                          StyleSheet.absoluteFill,
                          styles.keyInput,
                          { fontSize: 32 * scale },
                          isWeb && styles.keyInputWeb,
                        ]}
                        textAlign="center"
                        selectionColor="transparent"
                      />
                      {digit ? (
                        <View
                          pointerEvents="none"
                          accessible={false}
                          importantForAccessibility="no"
                          style={[
                            styles.pinDot,
                            { width: 18 * scale, height: 18 * scale, borderRadius: 9 * scale },
                          ]}
                        />
                      ) : null}
                    </View>
                  ))}
                </View>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={isValidating ? 'Validando PIN' : 'Ingresar'}
                  style={({ pressed }) => [
                    styles.adminButton,
                    { borderRadius: 25 * scale, marginTop: 32 * scale },
                    pressed && styles.buttonPressed,
                    isValidating && styles.buttonDisabled,
                  ]}
                  onPress={handleAdminAccess}
                  disabled={isValidating}>
                  <LinearGradient
                    colors={['#16834B', '#09633E', '#005737']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[
                      styles.adminButtonSurface,
                      {
                        minHeight: 68 * scale - 2,
                        borderRadius: 25 * scale - 1,
                        paddingVertical: 14 * scale,
                        gap: 16 * scale,
                      },
                    ]}>
                    <MaterialCommunityIcons
                      name="arrow-right-circle-outline"
                      size={30 * scale}
                      color="#F4F1DD"
                      accessible={false}
                      importantForAccessibility="no"
                    />
                    <Text style={[styles.adminButtonText, { fontSize: 20 * scale }]}>
                      {isValidating ? 'Validando...' : 'Ingresar'}
                    </Text>
                  </LinearGradient>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Volver al menú principal"
                  style={({ pressed }) => [
                    styles.backButton,
                    { marginTop: 24 * scale },
                    pressed && styles.buttonPressed,
                  ]}
                  onPress={() => router.replace('/login')}>
                  <Text style={[styles.backButtonText, { fontSize: 16 * scale }]}>
                    Volver al menú principal
                  </Text>
                </Pressable>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#EFE8D8',
  },
  frame: {
    flex: 1,
    width: '100%',
    maxWidth: 560,
    overflow: 'hidden',
    backgroundColor: '#F7F3E9',
  },
  safeArea: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    alignItems: 'center',
  },
  content: {
    width: '100%',
    maxWidth: 440,
    alignItems: 'center',
  },
  title: {
    width: '100%',
    fontWeight: '700',
    color: '#3B170F',
    textAlign: 'center',
  },
  subtitle: {
    color: '#6B3A28',
    fontWeight: '500',
    textAlign: 'center',
  },
  keyRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  keyBox: {
    flex: 1,
    minWidth: 0,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E7DDCE',
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    ...buildShadow({
      color: '#9F835C',
      offset: { width: 0, height: 4 },
      opacity: 0.1,
      radius: 9,
      elevation: 2,
      web: '0px 4px 9px rgba(159, 131, 92, 0.1)',
    }),
  },
  keyBoxActive: {
    borderColor: '#D8C5AA',
  },
  keyInput: {
    paddingHorizontal: 0,
    paddingVertical: 0,
    color: 'transparent',
    textAlign: 'center',
  },
  pinDot: {
    backgroundColor: '#54270F',
  },
  keyInputWeb: {
    outlineStyle: 'none',
  },
  adminButton: {
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.42)',
    backgroundColor: '#09633E',
    ...buildShadow({
      color: '#236C40',
      offset: { width: 0, height: 8 },
      opacity: 0.2,
      radius: 14,
      elevation: 5,
      web: '0px 8px 14px rgba(35, 108, 64, 0.2)',
    }),
  },
  adminButtonSurface: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  adminButtonText: {
    fontWeight: '600',
    color: '#F4F1DD',
  },
  backButton: {
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    fontWeight: '500',
    color: '#6B3623',
    textAlign: 'center',
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.985 }],
  },
});

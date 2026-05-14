import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';

export default function Login() {
  const [rut, setRut] = useState('12.345.678-9');

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardArea}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.container}>
          <View style={styles.logoSection}>
            <View style={styles.logoHalo}>
              <Image
                source={require('../assets/images/logofs.png')}
                style={styles.logo}
                contentFit="contain"
              />
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>RUT</Text>

            <View style={styles.inputShell}>
              <Feather name="user" size={31} color="#8F7B72" />
              <TextInput
                value={rut}
                onChangeText={setRut}
                placeholder="12.345.678-9"
                placeholderTextColor="#978A82"
                keyboardType="numeric"
                style={styles.input}
                selectionColor="#A66132"
              />
            </View>

            <Text style={styles.helperText}>
              Ingrese su identificacion sin puntos ni guion
            </Text>

            <Pressable style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>Ingresar</Text>
              <Feather name="arrow-right" size={33} color="#FFFFFF" />
            </Pressable>

            <Pressable hitSlop={8}>
              <Text style={styles.helpText}>Necesitas ayuda para acceder?</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7F3EE',
  },
  keyboardArea: {
    flex: 1,
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
    paddingBottom: 24,
  },
  logoHalo: {
    width: 196,
    height: 196,
    borderRadius: 98,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#8F5B31',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.14,
    shadowRadius: 34,
    elevation: 11,
  },
  logo: {
    width: 170,
    height: 170,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 22,
    paddingTop: 30,
    paddingBottom: 36,
    shadowColor: '#9F6A3F',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.13,
    shadowRadius: 24,
    elevation: 10,
  },
  label: {
    fontSize: 28,
    fontWeight: '700',
    color: '#8C7B73',
    letterSpacing: 0.3,
    marginBottom: 18,
  },
  inputShell: {
    minHeight: 112,
    borderRadius: 18,
    borderWidth: 1.6,
    borderColor: '#D5C3B5',
    backgroundColor: '#F2EEE8',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 26,
    gap: 18,
  },
  input: {
    flex: 1,
    fontSize: 31,
    color: '#2C2A29',
    paddingVertical: 14,
    fontWeight: '500',
  },
  helperText: {
    marginTop: 16,
    marginBottom: 30,
    fontSize: 17,
    lineHeight: 24,
    color: '#B1A7A0',
  },
  primaryButton: {
    minHeight: 114,
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
  },
  primaryButtonText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  helpText: {
    marginTop: 62,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: '#9A5A29',
  },
});

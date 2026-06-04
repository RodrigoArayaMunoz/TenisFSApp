import { AntDesign, Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Login() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}>
        <View style={styles.logoSection}>
          <Image
            source={require('../assets/images/logofs.png')}
            style={styles.logo}
            contentFit="contain"
          />

          <Pressable
            style={styles.adminButton}
            onPress={() => router.push('/admin-key')}>
            <Feather name="user" size={24} color="#FFFFFF" />
            <Text style={styles.adminButtonText}>Acceso Administrador</Text>
          </Pressable>
        </View>

        <View style={styles.centerSection}>
          <Pressable
            style={styles.primaryButton}
            onPress={() => router.push('/register-result')}>
            <Text style={styles.primaryButtonText}>Registrar Resultado</Text>
          </Pressable>
        </View>

        <View style={styles.tabsSection}>
          <Pressable
            style={styles.tabButton}
            onPress={() =>
              router.push({
                pathname: '/league-standings',
                params: { leagueId: 'B' },
              })
            }>
            <AntDesign name="trophy" size={22} color="#A66132" />
            <Text style={styles.tabButtonText}>Liga B</Text>
          </Pressable>

          <Pressable
            style={styles.tabButton}
            onPress={() =>
              router.push({
                pathname: '/league-standings',
                params: { leagueId: 'C' },
              })
            }>
            <AntDesign name="trophy" size={22} color="#A66132" />
            <Text style={styles.tabButtonText}>Liga C</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7F3EE',
  },
  container: {
    flexGrow: 1,
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
    paddingBottom: 30,
  },
  logo: {
    width: 170,
    height: 170,
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
    marginTop: 18,
    shadowColor: '#2F8A4D',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 6,
    width: '100%',
    maxWidth: 380,
  },
  adminButtonText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  centerSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginBottom: 80,
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
    maxWidth: 380,
  },
  primaryButtonText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  tabsSection: {
    width: '100%',
    flexDirection: 'row',
    gap: 14,
  },
  tabButton: {
    flex: 1,
    minHeight: 62,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.4,
    borderColor: '#E1D4C8',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#9F6A3F',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
  },
  tabButtonText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#8C7B73',
  },
});

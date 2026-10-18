import { AntDesign, Feather, FontAwesome, Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { clearAdminAccess } from '../services/adminSession';

const HOME_ROUTE = '/admin-home';
const GREEN = '#145B40';

function MenuIcon({ type, scale }) {
  if (type === 'result') {
    return (
      <View style={[styles.tennisBall, { width: 30 * scale, height: 30 * scale }]}>
        <Ionicons
          name="tennisball-outline"
          size={27 * scale}
          color="#403719"
          style={styles.ballSeams}
        />
      </View>
    );
  }

  if (type === 'sales') {
    return (
      <LinearGradient
        colors={['#B95124', '#93401F']}
        style={[styles.cartBadge, { width: 40 * scale, height: 40 * scale }]}>
        <Feather name="shopping-cart" size={24 * scale} color="#FFFFFF" />
      </LinearGradient>
    );
  }

  if (type === 'players') {
    return <FontAwesome name="users" size={29 * scale} color={GREEN} />;
  }

  if (type === 'orders') {
    return (
      <LinearGradient colors={['#E8F0DF', '#D9E6CD']} style={[styles.cartBadge, { width: 40 * scale, height: 40 * scale }]}>
        <Feather name="clipboard" size={24 * scale} color={GREEN} />
      </LinearGradient>
    );
  }

  return <AntDesign name="trophy" size={33 * scale} color="#DE871D" />;
}

function MenuOption({ label, icon, color, onPress, scale }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.menuOption,
        { borderRadius: 22 * scale },
        pressed && styles.buttonPressed,
      ]}>
      <LinearGradient
        colors={['#FFFFFF', '#FDFDFB']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.optionSurface,
          {
            minHeight: 62 * scale,
            borderRadius: 22 * scale,
            paddingHorizontal: 14 * scale,
            paddingVertical: 12 * scale,
            gap: 14 * scale,
          },
        ]}>
        <View
          accessible={false}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[styles.iconWrap, { width: 40 * scale }]}>
          <MenuIcon type={icon} scale={scale} />
        </View>
        <Text style={[styles.optionLabel, { fontSize: 15 * scale, color }]}>
          {label}
        </Text>
        <Feather
          accessible={false}
          name="chevron-right"
          size={21 * scale}
          color={color === GREEN ? '#658B70' : '#AE7863'}
        />
      </LinearGradient>
    </Pressable>
  );
}

export default function AdminHome() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const [hasMounted, setHasMounted] = useState(Platform.OS !== 'web');
  const scale = hasMounted
    ? Math.max(0.86, Math.min(width / 333, height / 659, 1.2))
    : 1;

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const openLeague = (leagueId) => {
    router.push({
      pathname: '/league-standings',
      params: { leagueId, backTo: HOME_ROUTE },
    });
  };

  const closeSession = () => {
    clearAdminAccess();
    router.dismissAll();
    router.replace('/login');
  };

  return (
    <View style={styles.screen}>
      {isFocused && <StatusBar style="light" />}
      <View style={styles.frame}>
        <LinearGradient
          colors={['#855335', '#713C24', '#63311E']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}>
          <SafeAreaView edges={['top', 'left', 'right']}>
            <View
              style={[
                styles.header,
                {
                  paddingTop: (Platform.OS === 'web' ? 52 : 22) * scale,
                  paddingBottom: 44 * scale,
                  paddingHorizontal: 20 * scale,
                  gap: 14 * scale,
                },
              ]}>
              <View style={styles.headerText}>
                <Text
                  accessibilityRole="header"
                  style={[
                    styles.title,
                    { fontSize: 27 * scale, lineHeight: 34 * scale },
                  ]}>
                  Administrador
                </Text>
                <Text
                  style={[
                    styles.subtitle,
                    { fontSize: 14 * scale, lineHeight: 19 * scale, marginTop: 5 * scale },
                  ]}>
                  Seleccione una opción
                </Text>
              </View>
              <View
                accessibilityLabel="Administrador"
                style={[styles.avatar, { width: 44 * scale, height: 44 * scale }]}>
                <Text style={{ fontSize: 29 * scale, lineHeight: 36 * scale }}>👨🏻‍💼</Text>
              </View>
            </View>
          </SafeAreaView>
        </LinearGradient>

        <LinearGradient
          colors={['#FAF8F1', '#F5F0E2']}
          style={[
            styles.sheet,
            {
              marginTop: -24 * scale,
              borderTopLeftRadius: 30 * scale,
              borderTopRightRadius: 30 * scale,
            },
          ]}>
          <SafeAreaView style={styles.sheetSafeArea} edges={['left', 'right']}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={[
                styles.sheetContent,
                {
                  paddingHorizontal: 18 * scale,
                  paddingTop: 13 * scale,
                  paddingBottom: Math.max(insets.bottom, 22 * scale),
                },
              ]}>
              <View style={[styles.menu, { gap: 12 * scale }]}>
                <MenuOption
                  label="Validar Resultado"
                  icon="result"
                  color="#203E30"
                  onPress={() => router.push('/admin-dashboard')}
                  scale={scale}
                />
                <MenuOption
                  label="Panel de Ventas"
                  icon="sales"
                  color="#7D3423"
                  onPress={() => router.push('/sales-panel')}
                  scale={scale}
                />
                <MenuOption
                  label="Gestión de Pedidos"
                  icon="orders"
                  color={GREEN}
                  onPress={() => router.push('/manage-orders')}
                  scale={scale}
                />
                {['B', 'C'].map((leagueId) => (
                  <MenuOption
                    key={leagueId}
                    label={'Liga ' + leagueId}
                    icon="league"
                    color="#282B25"
                    onPress={() => openLeague(leagueId)}
                    scale={scale}
                  />
                ))}
                <MenuOption
                  label="Gestionar Jugadores"
                  icon="players"
                  color={GREEN}
                  onPress={() => router.push('/manage-players')}
                  scale={scale}
                />
              </View>

              <View style={[styles.footer, { paddingTop: 24 * scale }]}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Cerrar sesión"
                  onPress={closeSession}
                  style={({ pressed }) => [
                    styles.logoutButton,
                    { borderRadius: 21 * scale },
                    pressed && styles.buttonPressed,
                  ]}>
                  <LinearGradient
                    colors={['#914621', '#783519', '#6C2E17']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0.8, y: 1 }}
                    style={[
                      styles.logoutSurface,
                      {
                        minHeight: Math.max(44, 50 * scale),
                        borderRadius: 21 * scale,
                        paddingVertical: 12 * scale,
                        gap: 12 * scale,
                      },
                    ]}>
                    <Feather accessible={false} name="lock" size={22 * scale} color="#FFF7EA" />
                    <Text style={[styles.logoutLabel, { fontSize: 15 * scale }]}>
                      Cerrar sesión
                    </Text>
                  </LinearGradient>
                </Pressable>
              </View>
            </ScrollView>
          </SafeAreaView>
        </LinearGradient>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', backgroundColor: '#F5F0E2' },
  frame: { flex: 1, width: '100%', maxWidth: 560, backgroundColor: '#713C24' },
  header: { flexDirection: 'row', alignItems: 'center' },
  headerText: { flex: 1, minWidth: 0 },
  title: { color: '#FFFCF4', fontWeight: '700' },
  subtitle: { color: '#EBDACB', fontWeight: '400' },
  avatar: {
    borderRadius: 100,
    backgroundColor: '#FFFCF5',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    ...Platform.select({
      web: { boxShadow: '0px 2px 5px rgba(48, 21, 10, 0.2)' },
      default: {
        shadowColor: '#30150A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
        elevation: 2,
      },
    }),
  },
  sheet: { flex: 1, overflow: 'hidden' },
  sheetSafeArea: { flex: 1 },
  sheetContent: { flexGrow: 1, alignItems: 'center' },
  menu: { width: '100%', maxWidth: 440 },
  menuOption: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      web: { boxShadow: '0px 5px 16px rgba(116, 88, 49, 0.035)' },
      default: {
        shadowColor: '#745831',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.035,
        shadowRadius: 10,
        elevation: 1,
      },
    }),
  },
  optionSurface: { flexDirection: 'row', alignItems: 'center' },
  iconWrap: { alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  tennisBall: {
    borderRadius: 100,
    backgroundColor: '#F1CB45',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ballSeams: { transform: [{ rotate: '45deg' }] },
  cartBadge: { borderRadius: 100, alignItems: 'center', justifyContent: 'center' },
  optionLabel: { flex: 1, minWidth: 0, fontWeight: '700' },
  footer: { flex: 1, width: '100%', maxWidth: 440, justifyContent: 'flex-end' },
  logoutButton: { width: '100%', backgroundColor: '#783519' },
  logoutSurface: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: '#B6744A',
  },
  logoutLabel: { color: '#FFF7EA', fontWeight: '600' },
  buttonPressed: { opacity: 0.86, transform: [{ scale: 0.985 }] },
});

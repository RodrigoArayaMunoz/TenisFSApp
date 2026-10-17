import { AntDesign, MaterialCommunityIcons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { Image } from 'expo-image';
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

const leagues = ['B', 'C'];

function MenuButton({
  label,
  icon,
  iconColor,
  colors,
  onPress,
  scale,
  centered = false,
  hint,
}) {
  const radius = 22 * scale;
  const Icon = icon === 'trophy' ? AntDesign : MaterialCommunityIcons;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      onPress={onPress}
      style={({ pressed }) => [
        styles.menuButton,
        { borderRadius: radius },
        pressed && styles.buttonPressed,
      ]}>
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.buttonSurface,
          {
            minHeight: 66 * scale - 2,
            borderRadius: radius - 1,
            paddingHorizontal: 18 * scale,
            paddingVertical: 12 * scale,
            gap: 18 * scale,
          },
        ]}>
        <View
          accessible={false}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[styles.iconWrap, { width: 36 * scale }]}>
          <Icon name={icon} size={36 * scale} color={iconColor} />
        </View>
        <Text
          style={[
            styles.buttonText,
            { fontSize: 16 * scale },
            centered && styles.primaryButtonText,
          ]}>
          {label}
        </Text>
      </LinearGradient>
    </Pressable>
  );
}

export default function Login() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const [hasMounted, setHasMounted] = useState(Platform.OS !== 'web');

  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Keep the first web render consistent with the statically exported HTML.
  const scale = hasMounted
    ? Math.max(0.86, Math.min(width / 333, height / 659, 1.2))
    : 1;
  const topSpacing = hasMounted
    ? Math.max(14, Math.min(54, height * 0.067) - insets.top)
    : 44;
  const availableHeight = height - insets.top - insets.bottom;
  const menuHeight = (66 * 5 + 10 * 4) * scale;
  const headerTextHeight = (30 + 24) * scale + 2;
  const reservedHeight = menuHeight + headerTextHeight + (19 + 24) * scale;
  const logoSize = hasMounted
    ? Math.max(
        112 * scale,
        Math.min(187 * scale, availableHeight - topSpacing - reservedHeight)
      )
    : 187;

  return (
    <View style={styles.screen}>
      {isFocused && <StatusBar style="light" />}
      <View style={styles.frame}>
        <View
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={StyleSheet.absoluteFill}>
          <Image
            source={require('../assets/images/home-court-background.png')}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            contentPosition="top center"
          />
          <LinearGradient
            colors={['rgba(53, 26, 10, 0.24)', 'rgba(53, 26, 10, 0)']}
            style={styles.heroShade}
          />
        </View>

        <SafeAreaView style={styles.safeArea} edges={['top', 'right', 'bottom', 'left']}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.container,
              {
                paddingTop: topSpacing,
                paddingHorizontal: 20 * scale,
                paddingBottom: 24 * scale,
              },
            ]}>
            <View style={styles.content}>
              <View style={styles.heroSection}>
                <Image
                  source={require('../assets/images/logofs.png')}
                  accessibilityLabel="Academia de Tenis FS, Sexta Región"
                  style={{ width: logoSize, height: logoSize }}
                  contentFit="contain"
                />
                <Text
                  accessibilityRole="header"
                  style={[
                    styles.welcome,
                    { fontSize: 24 * scale, lineHeight: 30 * scale },
                  ]}>
                  Bienvenido
                </Text>
                <Text
                  style={[
                    styles.academyName,
                    { fontSize: 18 * scale, lineHeight: 24 * scale },
                  ]}>
                  Academia de Tenis FS
                </Text>
              </View>

              <View style={[styles.menu, { gap: 10 * scale, marginTop: 19 * scale }]}>
                <MenuButton
                  label="Acceso Administrador"
                  icon="shield-account-outline"
                  iconColor="#F6EDCD"
                  colors={['#8B582E', '#6E381E', '#542A18']}
                  onPress={() => router.push('/admin-key')}
                  hint="Ingresar con el PIN de administrador"
                  scale={scale}
                  centered
                />
                <MenuButton
                  label="Registrar Resultado"
                  icon="tennis-ball"
                  iconColor="#F6EDCD"
                  colors={['#277048', '#00472F', '#003F2B']}
                  onPress={() => router.push('/register-result')}
                  scale={scale}
                  centered
                />
                <MenuButton
                  label="Panel de Ventas"
                  icon="cart"
                  iconColor="#FFFFFF"
                  colors={['#B94F20', '#A33C18', '#913416']}
                  onPress={() => router.push({ pathname: '/sales-panel', params: { backTo: '/login' } })}
                  hint="Ver el catálogo de productos"
                  scale={scale}
                  centered
                />
                {leagues.map((leagueId) => (
                  <MenuButton
                    key={leagueId}
                    label={'Liga ' + leagueId}
                    icon="trophy"
                    iconColor="#D08022"
                    colors={['#FFFFFF', '#FFFEFC']}
                    onPress={() =>
                      router.push({
                        pathname: '/league-standings',
                        params: { leagueId },
                      })
                    }
                    scale={scale}
                  />
                ))}
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#F7F1DF',
  },
  frame: {
    flex: 1,
    width: '100%',
    maxWidth: 560,
    overflow: 'hidden',
    backgroundColor: '#F7F1DF',
  },
  heroShade: {
    position: 'absolute',
    top: 0,
    right: 0,
    left: 0,
    height: '48%',
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
  },
  heroSection: {
    alignItems: 'center',
  },
  welcome: {
    color: '#FFF8EA',
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 2,
    textShadowColor: 'rgba(57, 28, 12, 0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  academyName: {
    color: '#FFF8EA',
    fontWeight: '600',
    textAlign: 'center',
    textShadowColor: 'rgba(57, 28, 12, 0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  menu: {
    width: '100%',
  },
  menuButton: {
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.46)',
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      web: {
        boxShadow: '0px 5px 12px rgba(103, 68, 25, 0.16)',
      },
      default: {
        shadowColor: '#674419',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.16,
        shadowRadius: 10,
        elevation: 4,
      },
    }),
  },
  buttonSurface: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  buttonText: {
    flex: 1,
    color: '#38271B',
    fontWeight: '700',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.16)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  buttonPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },
});

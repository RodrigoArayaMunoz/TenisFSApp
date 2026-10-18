import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const ACCENTS = [
  { left: '10%', top: '49%', rotation: '0deg' },
  { left: '18%', top: '23%', rotation: '45deg' },
  { left: '18%', top: '75%', rotation: '-45deg' },
  { right: '10%', top: '49%', rotation: '0deg' },
  { right: '18%', top: '23%', rotation: '-45deg' },
  { right: '18%', top: '75%', rotation: '45deg' },
];

export default function SalesOrderSuccess({ onReturnToSales }) {
  const { width, height } = useWindowDimensions();
  const frameWidth = Math.min(width, 560);
  const scale = Math.max(0.86, Math.min(frameWidth / 390, height / 780, 1.18));
  const entry = useRef(new Animated.Value(0)).current;
  const badge = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((reducedMotion) => {
        if (cancelled) return;
        if (reducedMotion) {
          entry.setValue(1);
          badge.setValue(1);
          return;
        }
        const useNativeDriver = Platform.OS !== 'web';
        Animated.parallel([
          Animated.timing(entry, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver }),
          Animated.spring(badge, { toValue: 1, damping: 13, stiffness: 150, mass: 0.8, delay: 100, useNativeDriver }),
        ]).start();
      })
      .catch(() => {
        if (!cancelled) {
          entry.setValue(1);
          badge.setValue(1);
        }
      });
    return () => {
      cancelled = true;
      entry.stopAnimation();
      badge.stopAnimation();
    };
  }, [entry, badge]);

  return (
    <LinearGradient colors={['#DED7C1', '#F0E9D8', '#F8F3E6']} locations={[0, 0.35, 1]} style={styles.frame}>
      <View accessible={false} pointerEvents="none" style={[styles.arch, { width: frameWidth * 1.25, height: height + frameWidth, left: -frameWidth * 0.125, top: height * 0.08, borderTopLeftRadius: frameWidth * 0.625, borderTopRightRadius: frameWidth * 0.625 }]} />
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.content, { paddingHorizontal: 24 * scale, paddingTop: Math.max(40, Math.min(height * 0.13, 135)), paddingBottom: 24 * scale }]}>
          <Animated.View style={[styles.message, { opacity: entry, transform: [{ translateY: entry.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }]}>
            <View accessible={false} importantForAccessibility="no-hide-descendants" style={[styles.celebration, { width: 218 * scale, height: 164 * scale }]}>
              {ACCENTS.map(({ rotation, ...position }, index) => (
                <View key={index} style={[styles.accent, position, { width: 15 * scale, height: 3 * scale, transform: [{ rotate: rotation }] }]} />
              ))}
              <Animated.View style={[styles.badgeShadow, { width: 120 * scale, height: 120 * scale, borderRadius: 60 * scale, transform: [{ scale: badge.interpolate({ inputRange: [0, 1], outputRange: [0.65, 1] }) }] }]}>
                <LinearGradient colors={['#42AD73', '#1A8A51']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.badge}>
                  <Feather accessible={false} name="check" size={68 * scale} color="#FFFFFF" />
                </LinearGradient>
              </Animated.View>
            </View>
            <Text accessibilityRole="header" style={[styles.title, { fontSize: 28 * scale, lineHeight: 37 * scale, marginTop: 21 * scale }]}>¡Solicitud Enviada!</Text>
            <Text style={[styles.description, { fontSize: 18 * scale, lineHeight: 26 * scale, marginTop: 16 * scale }]}>{'Tu solicitud ha sido enviada\ncorrectamente.'}</Text>
            <Text style={[styles.followUp, { fontSize: 14 * scale, lineHeight: 22 * scale, marginTop: 22 * scale }]}>{'Nos contactaremos contigo para confirmar\ndisponibilidad y coordinar la entrega.'}</Text>
          </Animated.View>

          <Animated.View style={[styles.actions, { opacity: entry, paddingTop: 38 * scale }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Volver al panel de ventas"
              onPress={onReturnToSales}
              style={({ pressed }) => [styles.returnButton, { borderRadius: 17 * scale }, pressed && styles.pressed]}>
              <LinearGradient colors={['#A54E23', '#793B20']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.returnSurface, { minHeight: 62 * scale, paddingVertical: 17 * scale }]}>
                <Feather accessible={false} name="shopping-bag" size={21 * scale} color="#FFF9ED" />
                <Text style={[styles.returnLabel, { fontSize: 15 * scale, lineHeight: 22 * scale }]}>Volver al panel de ventas</Text>
              </LinearGradient>
            </Pressable>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  frame: { flex: 1, width: '100%', maxWidth: 560, overflow: 'hidden' },
  arch: { position: 'absolute', backgroundColor: '#FCF9F1' },
  safeArea: { flex: 1 },
  content: { flexGrow: 1, alignItems: 'center' },
  message: { width: '100%', alignItems: 'center' },
  celebration: { alignItems: 'center', justifyContent: 'center' },
  accent: { position: 'absolute', backgroundColor: '#DD8C22', borderRadius: 3 },
  badgeShadow: {
    ...Platform.select({
      web: { boxShadow: '0px 7px 20px rgba(33, 133, 77, 0.12)' },
      default: { shadowColor: '#21854D', shadowOffset: { width: 0, height: 7 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 3 },
    }),
  },
  badge: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 100 },
  title: { color: '#145B40', fontWeight: '800', textAlign: 'center', letterSpacing: -0.6 },
  description: { color: '#653926', textAlign: 'center', fontWeight: '500' },
  followUp: { color: '#73756B', textAlign: 'center' },
  actions: { width: '100%', marginTop: 'auto' },
  returnButton: {
    backgroundColor: '#8B4423',
    ...Platform.select({
      web: { boxShadow: '0px 5px 12px rgba(119, 65, 28, 0.18)' },
      default: { shadowColor: '#77411C', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.18, shadowRadius: 8, elevation: 3 },
    }),
  },
  returnSurface: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 14, borderRadius: 17 },
  returnLabel: { color: '#FFF9ED', fontWeight: '700', textAlign: 'center', flexShrink: 1 },
  pressed: { opacity: 0.75 },
});

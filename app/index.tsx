import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';

const SPLASH_DURATION_MS = 1500;
const TRACK_WIDTH = 220;

export default function SplashScreen() {
  const progress = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.94)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.parallel([
      Animated.timing(progress, {
        toValue: 1,
        duration: SPLASH_DURATION_MS,
        easing: Easing.linear,
        useNativeDriver: false,
      }),
      Animated.timing(logoScale, {
        toValue: 1,
        duration: 700,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 450,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]);

    animation.start(({ finished }) => {
      if (finished) {
        router.replace('/login');
      }
    });

    return () => {
      animation.stop();
    };
  }, [logoOpacity, logoScale, progress]);

  const progressWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, TRACK_WIDTH * 0.47],
  });

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <Animated.View
          style={[
            styles.logoWrap,
            {
              opacity: logoOpacity,
              transform: [{ scale: logoScale }],
            },
          ]}>
          <Image
            source={require('../assets/images/logofs.png')}
            style={styles.logo}
            contentFit="contain"
          />
        </Animated.View>
      </View>

      <View style={styles.footer}>
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
        </View>

        <Text style={styles.foundation}>FUNDADA 2014</Text>

        <View style={styles.subtitleRow}>
          <View style={styles.badge}>
            <View style={styles.badgeInner} />
          </View>
          <Text style={styles.subtitle}>PRESTIGIO Y TRADICION</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F2EB',
    paddingHorizontal: 34,
    paddingTop: 52,
    paddingBottom: 72,
    justifyContent: 'space-between',
  },
  hero: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: '100%',
    maxWidth: 335,
    aspectRatio: 1,
  },
  footer: {
    alignItems: 'center',
    gap: 18,
  },
  progressTrack: {
    width: TRACK_WIDTH,
    height: 3,
    borderRadius: 999,
    backgroundColor: '#D8D0C6',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#9A5A29',
  },
  foundation: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 2.8,
    color: '#7E736B',
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  badge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#9A5A29',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '12deg' }],
  },
  badgeInner: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#F7F2EB',
    borderWidth: 1.5,
    borderColor: '#9A5A29',
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: '#9A5A29',
  },
});

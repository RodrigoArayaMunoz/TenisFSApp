import { AntDesign, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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

const leagues = [
  { id: 'B', leader: 'Alexis Urbina' },
  { id: 'C', leader: 'Bastian Mu\u00f1oz' },
];

export default function Login() {
  const { width } = useWindowDimensions();
  const isCompact = width < 480;
  const isMedium = width >= 480 && width < 720;
  const shouldStackLeagues = width < 330;
  const logoSize = isCompact ? 140 : isMedium ? 190 : 240;
  const adminIconSize = isCompact ? 23 : 30;
  const ballIconSize = isCompact ? 22 : 28;
  const trophyIconSize = isCompact ? 38 : 58;
  const trophyBallSize = isCompact ? 12 : 17;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <View style={styles.heroSection}>
            <Image
              source={require('../assets/images/logofs.png')}
              style={[styles.logo, { width: logoSize, height: logoSize }]}
              contentFit="contain"
            />

            <Pressable
              style={({ pressed }) => [
                styles.adminButton,
                isCompact && styles.adminButtonCompact,
                pressed && styles.buttonPressed,
              ]}
              onPress={() => router.push('/admin-key')}>
              <Feather name="user" size={adminIconSize} color="#FFFFFF" />
              <Text
                style={[
                  styles.adminButtonText,
                  isCompact && styles.adminButtonTextCompact,
                ]}
                numberOfLines={1}>
                Acceso Administrador
              </Text>
            </Pressable>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.resultButton,
              isCompact && styles.resultButtonCompact,
              pressed && styles.buttonPressed,
            ]}
            onPress={() => router.push('/register-result')}>
            <View style={styles.resultPatternLarge} />
            <View style={styles.resultPatternSmall} />
            <MaterialCommunityIcons
              name="tennis-ball"
              size={ballIconSize}
              color="#FFFFFF"
            />
            <Text
              style={[
                styles.resultButtonText,
                isCompact && styles.resultButtonTextCompact,
              ]}
              numberOfLines={1}>
              Registrar Resultado
            </Text>
          </Pressable>

          <View
            style={[
              styles.leaguesSection,
              shouldStackLeagues && styles.leaguesSectionStacked,
            ]}>
            {leagues.map((league) => (
              <Pressable
                key={league.id}
                style={({ pressed }) => [
                  styles.leagueCard,
                  isCompact && styles.leagueCardCompact,
                  shouldStackLeagues && styles.leagueCardStacked,
                  pressed && styles.buttonPressed,
                ]}
                onPress={() =>
                  router.push({
                    pathname: '/league-standings',
                    params: { leagueId: league.id },
                  })
                }>
                <View
                  style={[
                    styles.trophyWrap,
                    isCompact && styles.trophyWrapCompact,
                  ]}>
                  <AntDesign
                    name="trophy"
                    size={trophyIconSize}
                    color="#D8994C"
                  />
                  <MaterialCommunityIcons
                    name="tennis-ball"
                    size={trophyBallSize}
                    color="#167143"
                    style={[
                      styles.trophyBall,
                      isCompact && styles.trophyBallCompact,
                    ]}
                  />
                </View>

                <View style={styles.leagueTextBlock}>
                  <Text
                    style={[
                      styles.leagueTitle,
                      isCompact && styles.leagueTitleCompact,
                    ]}
                    numberOfLines={1}>
                    Liga {league.id}
                  </Text>
                  <Text
                    style={[
                      styles.leagueLeader,
                      isCompact && styles.leagueLeaderCompact,
                    ]}
                    numberOfLines={1}>
                    {`L\u00edder: ${league.leader}`}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F6EC',
  },
  container: {
    flexGrow: 1,
    backgroundColor: '#F8F6EC',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 34,
    alignItems: 'center',
  },
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 760,
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 34,
  },
  heroSection: {
    width: '100%',
    alignItems: 'center',
    paddingTop: 44,
    gap: 40,
  },
  logo: {
    width: 240,
    height: 240,
  },
  adminButton: {
    minHeight: 76,
    borderRadius: 24,
    backgroundColor: '#05B743',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 20,
    paddingHorizontal: 22,
    width: '100%',
    maxWidth: 500,
    ...buildShadow({
      color: '#06783E',
      offset: { width: 0, height: 18 },
      opacity: 0.24,
      radius: 26,
      elevation: 8,
      web: '0px 18px 26px rgba(6, 120, 62, 0.24)',
    }),
  },
  adminButtonCompact: {
    minHeight: 58,
    borderRadius: 20,
    gap: 12,
    paddingHorizontal: 18,
  },
  adminButtonText: {
    fontSize: 29,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  adminButtonTextCompact: {
    fontSize: 20,
  },
  resultButton: {
    minHeight: 156,
    borderRadius: 28,
    backgroundColor: '#C76732',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 18,
    overflow: 'hidden',
    paddingHorizontal: 24,
    width: '100%',
    maxWidth: 500,
    borderWidth: 3,
    borderColor: 'rgba(255, 222, 197, 0.52)',
    ...buildShadow({
      color: '#A66132',
      offset: { width: 0, height: 20 },
      opacity: 0.24,
      radius: 28,
      elevation: 10,
      web: '0px 20px 28px rgba(166, 97, 50, 0.24)',
    }),
  },
  resultButtonCompact: {
    minHeight: 112,
    borderRadius: 22,
    gap: 12,
    paddingHorizontal: 18,
  },
  resultPatternLarge: {
    position: 'absolute',
    width: 250,
    height: 250,
    right: -74,
    top: -76,
    borderRadius: 125,
    borderWidth: 18,
    borderColor: 'rgba(96, 42, 20, 0.18)',
  },
  resultPatternSmall: {
    position: 'absolute',
    width: 190,
    height: 190,
    right: -26,
    bottom: -110,
    borderRadius: 95,
    borderWidth: 16,
    borderColor: 'rgba(96, 42, 20, 0.16)',
  },
  resultButtonText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  resultButtonTextCompact: {
    fontSize: 20,
  },
  leaguesSection: {
    width: '100%',
    flexDirection: 'row',
    gap: 22,
    justifyContent: 'center',
    marginTop: 64,
  },
  leaguesSectionStacked: {
    flexDirection: 'column',
    marginTop: 28,
  },
  leagueCard: {
    flex: 1,
    minHeight: 124,
    minWidth: 0,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#087343',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 12,
    paddingVertical: 18,
    paddingHorizontal: 18,
    borderBottomWidth: 9,
    borderBottomColor: '#B96C32',
    ...buildShadow({
      color: '#087343',
      offset: { width: 0, height: 16 },
      opacity: 0.16,
      radius: 24,
      elevation: 9,
      web: '0px 16px 24px rgba(8, 115, 67, 0.16)',
    }),
  },
  leagueCardCompact: {
    minHeight: 88,
    borderRadius: 19,
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 6,
  },
  leagueCardStacked: {
    width: '100%',
  },
  trophyWrap: {
    width: 74,
    height: 74,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  trophyWrapCompact: {
    width: 46,
    height: 46,
  },
  trophyBall: {
    position: 'absolute',
    top: 22,
  },
  trophyBallCompact: {
    top: 14,
  },
  leagueTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  leagueTitle: {
    fontSize: 29,
    fontWeight: '500',
    color: '#1A1816',
    marginBottom: 4,
  },
  leagueTitleCompact: {
    fontSize: 20,
    marginBottom: 2,
  },
  leagueLeader: {
    fontSize: 15,
    color: '#3D3732',
  },
  leagueLeaderCompact: {
    fontSize: 11,
  },
  buttonPressed: {
    opacity: 0.84,
  },
});

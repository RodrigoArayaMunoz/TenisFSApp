import { useLocalSearchParams } from 'expo-router';

import LeagueStandings from '@/components/LeagueStandings';

export default function LeagueStandingsScreen() {
  const { leagueId } = useLocalSearchParams();
  const resolvedLeagueId = Array.isArray(leagueId) ? leagueId[0] : leagueId;

  return <LeagueStandings leagueId={resolvedLeagueId || 'B'} />;
}

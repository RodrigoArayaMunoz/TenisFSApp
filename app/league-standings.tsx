import { useLocalSearchParams } from 'expo-router';

import LeagueStandings from '@/components/LeagueStandings';

export default function LeagueStandingsScreen() {
  const { backTo, leagueId } = useLocalSearchParams();
  const resolvedLeagueId = Array.isArray(leagueId) ? leagueId[0] : leagueId;
  const resolvedBackTo = Array.isArray(backTo) ? backTo[0] : backTo;

  return (
    <LeagueStandings
      leagueId={resolvedLeagueId || 'B'}
      backTo={resolvedBackTo || '/login'}
    />
  );
}

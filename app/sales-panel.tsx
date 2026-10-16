import { useLocalSearchParams } from 'expo-router';

import SalesPanel from '@/components/SalesPanel';

export default function SalesPanelScreen() {
  const { backTo } = useLocalSearchParams();
  const destination = Array.isArray(backTo) ? backTo[0] : backTo;
  const resolvedBackTo = destination === '/login' ? '/login' : '/admin-home';

  return <SalesPanel backTo={resolvedBackTo} />;
}
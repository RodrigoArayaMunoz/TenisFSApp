import { useLocalSearchParams } from 'expo-router';

import ProductDetail from '@/components/ProductDetail';

export default function ProductDetailScreen() {
  const { productId, backTo } = useLocalSearchParams();
  const resolvedProductId = Array.isArray(productId) ? productId[0] : productId;
  const destination = Array.isArray(backTo) ? backTo[0] : backTo;

  return (
    <ProductDetail
      key={resolvedProductId || 'unknown'}
      productId={resolvedProductId}
      catalogBackTo={destination === '/login' ? '/login' : '/admin-home'}
    />
  );
}

import { Feather } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
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

import {
  SALES_FILTERS,
  SALES_PRODUCTS,
  formatSalesPrice,
  getVisibleSalesProducts,
} from '../services/salesCatalog';
import { useSalesCart } from '../services/salesCart';
import SalesCartPreview from './SalesCartPreview';

const GREEN = '#145B40';

function CategoryFilter({ filter, selected, scale, onPress }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={filter.label}
      accessibilityHint={'Mostrar ' + filter.label.toLowerCase() + ' en el catálogo'}
      accessibilityState={{ selected }}
      aria-pressed={selected}
      onPress={onPress}
      style={({ pressed }) => [
        styles.categoryFilter,
        { borderRadius: 18 * scale, padding: 10 * scale, gap: 8 * scale },
        selected && styles.categoryFilterSelected,
        pressed && styles.buttonPressed,
      ]}>
      <View style={{ width: 64 * scale, height: 54 * scale }} accessible={false} importantForAccessibility="no-hide-descendants">
        {filter.images.map((source, index) => (
          <Image
            key={index}
            source={source}
            accessible={false}
            contentFit={filter.id === 'cuerdas' ? 'cover' : 'contain'}
            style={filter.images.length === 1
              ? { width: 54 * scale, height: 54 * scale, borderRadius: 13 * scale, alignSelf: 'center', backgroundColor: '#FFFFFF' }
              : { position: 'absolute', left: index * 26 * scale, top: index * 5 * scale, width: 37 * scale, height: 48 * scale, borderRadius: 10 * scale, backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: selected ? '#E5EEDD' : '#FFFFFF' }}
          />
        ))}
      </View>
      <View style={styles.filterLabelRow}>
        <Text style={[styles.filterLabel, { fontSize: 12 * scale }, selected && styles.filterLabelSelected]}>{filter.label}</Text>
        {selected && <Feather name="check-circle" size={12 * scale} color={GREEN} accessible={false} />}
      </View>
    </Pressable>
  );
}

function ProductCard({ product, scale, onOpen }) {
  return (
    <View style={[styles.productCard, { borderRadius: 15 * scale }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Ver detalle de ${product.name}`}
        accessibilityHint="Abre la descripción, características y selección de cantidad"
        onPress={onOpen}
        style={({ pressed }) => [styles.productDetailsButton, pressed && styles.buttonPressed]}>
        <LinearGradient colors={['#FBF9F2', '#FFFFFF']}>
          <Image
            source={product.image}
            accessibilityLabel={product.name}
            contentFit={product.category === 'pelotas' ? 'contain' : 'cover'}
            style={[styles.productImage, { height: 150 * scale, margin: 5 * scale, borderRadius: 11 * scale }]}
          />
          {product.featured && (
            <View style={styles.featuredBadge}>
              <Feather accessible={false} name="star" size={10} color="#FFF8E9" />
              <Text style={styles.featuredLabel}>Destacado</Text>
            </View>
          )}
        </LinearGradient>
        <View style={[styles.productInfo, { padding: 8 * scale }]}>
          <Text
            style={[
              styles.productName,
              { fontSize: 12.5 * scale, lineHeight: 17 * scale, minHeight: 34 * scale },
            ]}>
            {product.name}
          </Text>
          <Text style={[styles.price, { fontSize: (Number.isFinite(product.price) ? 17 : 13) * scale, lineHeight: 23 * scale }]}>
            {product.bundlePrices?.length ? '1 x ' : ''}{formatSalesPrice(product.price)}
          </Text>
          {product.category === 'cuerdas' && (
            <Text style={[styles.includedService, { fontSize: 11 * scale, lineHeight: 16 * scale, marginTop: 5 * scale }]}>
              Incluye servicio de encordado
            </Text>
          )}
          {product.bundlePrices?.length > 0 && (
            <View style={[styles.bundlePrices, { marginTop: 8 * scale, padding: 8 * scale, gap: 4 * scale }]}>
              {product.bundlePrices.map((bundle) => (
                <Text key={bundle.quantity} style={[styles.bundlePriceText, { fontSize: 11 * scale, lineHeight: 16 * scale }]}>
                  {bundle.quantity} x {formatSalesPrice(bundle.price)}
                </Text>
              ))}
            </View>
          )}
        </View>
      </Pressable>
      <View style={[styles.productFooter, { paddingHorizontal: 8 * scale, paddingBottom: 8 * scale, gap: 4 * scale }]}>
        {Number.isFinite(product.stock) && (
          <Text style={[styles.stock, { fontSize: 11 * scale }]}>Stock: {product.stock}</Text>
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Solicitar ${product.name}`}
          accessibilityHint="Abre el detalle del producto para elegir la cantidad"
          hitSlop={4}
          onPress={onOpen}
          style={({ pressed }) => [
            styles.requestButton,
            { borderRadius: 11 * scale },
            pressed && styles.buttonPressed,
          ]}>
          <LinearGradient
            colors={['#2C7B50', '#145B40']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.requestSurface,
              {
                minHeight: Math.max(36, 34 * scale),
                minWidth: 76 * scale,
                borderRadius: 11 * scale,
                paddingHorizontal: 10 * scale,
              },
            ]}>
            <Text style={[styles.requestLabel, { fontSize: 12 * scale }]}>Solicitar</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

export default function SalesPanel({ backTo = '/admin-home' }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const [hasMounted, setHasMounted] = useState(Platform.OS !== 'web');
  const [selectedFilter, setSelectedFilter] = useState('todos');
  const [visibleProducts, setVisibleProducts] = useState(SALES_PRODUCTS);
  const [cartVisible, setCartVisible] = useState(false);
  const catalogScrollRef = useRef(null);
  const { quantities, dismissOrderReceipt } = useSalesCart();
  const scale = hasMounted
    ? Math.max(0.86, Math.min(width / 333, height / 659, 1.2))
    : 1;
  const entries = SALES_PRODUCTS.filter((product) => quantities[product.id]);
  const count = entries.reduce((sum, product) => sum + quantities[product.id], 0);

  useEffect(() => {
    setHasMounted(true);
    // Randomize after mount to keep exported HTML and web hydration consistent.
    setVisibleProducts(getVisibleSalesProducts());
  }, []);

  const selectFilter = (filter) => {
    if (filter === selectedFilter) return;
    setSelectedFilter(filter);
    setVisibleProducts(getVisibleSalesProducts(filter));
    catalogScrollRef.current?.scrollTo({ y: 0, animated: false });
  };

  const goBack = () => {
    setCartVisible(false);
    router.replace(backTo);
  };

  return (
    <View style={styles.screen}>
      {isFocused && <StatusBar style="dark" />}
      <LinearGradient colors={['#FBF9F2', '#F3EDDC']} style={styles.frame}>
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
          <View
            style={[
              styles.header,
              {
                paddingTop: (Platform.OS === 'web' ? 40 : 16) * scale,
                paddingHorizontal: 14 * scale,
                paddingBottom: 14 * scale,
              },
            ]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Volver"
              onPress={goBack}
              style={({ pressed }) => [styles.headerButton, pressed && styles.buttonPressed]}>
              <Feather accessible={false} name="arrow-left" size={26 * scale} color="#29251F" />
            </Pressable>
            <Text
              accessibilityRole="header"
              style={[styles.headerTitle, { fontSize: 23 * scale, lineHeight: 30 * scale }]}>
              Panel de Ventas
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Ver carrito, ${count} ${count === 1 ? 'producto' : 'productos'}`}
              onPress={() => { dismissOrderReceipt(); setCartVisible(true); }}
              style={({ pressed }) => [styles.headerButton, pressed && styles.buttonPressed]}>
              <Feather accessible={false} name="shopping-cart" size={28 * scale} color="#622B1D" />
              {count > 0 && (
                <View style={styles.cartBadge}>
                  <Text style={styles.cartBadgeText}>{count}</Text>
                </View>
              )}
            </Pressable>
          </View>

          <View style={[styles.filtersSection, { paddingHorizontal: 16 * scale, paddingBottom: 17 * scale }]}>
            <View style={[styles.filtersRow, { gap: 9 * scale }]}>
              {SALES_FILTERS.map((filter) => (
                <CategoryFilter
                  key={filter.id}
                  filter={filter}
                  selected={selectedFilter === filter.id}
                  scale={scale}
                  onPress={() => selectFilter(filter.id)}
                />
              ))}
            </View>
          </View>

          <ScrollView
            ref={catalogScrollRef}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.scrollContent,
              {
                paddingHorizontal: 16 * scale,
                paddingTop: 8 * scale,
                paddingBottom: Math.max(insets.bottom, 24 * scale),
              },
            ]}>
            <View style={[styles.catalogHeading, { marginBottom: 12 * scale }]}>
              <Text accessibilityRole="header" style={[styles.catalogTitle, { fontSize: 17 * scale }]}>
                {selectedFilter === 'todos' ? 'Nuestro catálogo' : SALES_FILTERS.find((filter) => filter.id === selectedFilter)?.label}
              </Text>
              <Text accessibilityLiveRegion="polite" style={[styles.productCount, { fontSize: 11 * scale }]}>
                {visibleProducts.length} productos
              </Text>
            </View>
            <View style={[styles.productGrid, { rowGap: 14 * scale }]}>
              {visibleProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  scale={scale}
                  onOpen={() => router.push({
                    pathname: '/product-detail',
                    params: { productId: product.id, backTo },
                  })}
                />
              ))}
            </View>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
      <SalesCartPreview
        visible={cartVisible}
        onClose={() => setCartVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', backgroundColor: '#F0EAD9' },
  frame: { flex: 1, width: '100%', maxWidth: 560 },
  safeArea: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center' },
  headerButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, minWidth: 0, textAlign: 'center', fontWeight: '700', color: '#211F1B' },
  cartBadge: {
    position: 'absolute', top: 0, right: 0, minWidth: 19, height: 19, borderRadius: 10,
    paddingHorizontal: 4, backgroundColor: GREEN, alignItems: 'center', justifyContent: 'center',
  },
  cartBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
  scrollContent: { flexGrow: 1, alignItems: 'center' },
  filtersSection: { alignItems: 'center' },
  filtersRow: { width: '100%', maxWidth: 480, flexDirection: 'row' },
  categoryFilter: { flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E4DDCD', backgroundColor: '#FFFDF7' },
  categoryFilterSelected: { borderColor: '#72926A', backgroundColor: '#EAF1E4' },
  filterLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  filterLabel: { color: '#817560', fontWeight: '600' },
  filterLabelSelected: { color: GREEN, fontWeight: '700' },
  catalogHeading: { width: '100%', maxWidth: 480, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  catalogTitle: { color: '#3B402F', fontWeight: '700' },
  productCount: { color: '#8A7D65' },
  productGrid: { width: '100%', maxWidth: 480, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  productCard: {
    width: '48%', overflow: 'hidden', borderWidth: 1, borderColor: '#E6E1D5', backgroundColor: '#FFFFFF',
    ...Platform.select({
      web: { boxShadow: '0px 3px 8px rgba(112, 85, 46, 0.045)' },
      default: { shadowColor: '#70552E', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.045, shadowRadius: 7, elevation: 1 },
    }),
  },
  productImage: { alignSelf: 'stretch' },
  productDetailsButton: { flex: 1 },
  featuredBadge: { position: 'absolute', top: 12, left: 12, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 10, backgroundColor: '#84502E' },
  featuredLabel: { color: '#FFF8E9', fontSize: 9, fontWeight: '600' },
  productName: { color: '#292924', fontWeight: '500' },
  productInfo: { flex: 1 },
  price: { color: '#23241F', fontWeight: '700' },
  includedService: { color: GREEN, fontWeight: '600' },
  bundlePrices: { borderRadius: 10, backgroundColor: '#EDF3E7' },
  bundlePriceText: { color: GREEN, fontWeight: '600' },
  productFooter: { marginTop: 'auto', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stock: { color: '#9B694C', fontWeight: '600', flexShrink: 1 },
  requestButton: { flex: 1, backgroundColor: GREEN },
  requestSurface: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#438663' },
  requestLabel: { color: '#FFFFFF', fontWeight: '600' },
  buttonPressed: { opacity: 0.55 },
});

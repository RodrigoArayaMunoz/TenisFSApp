import { Feather } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SALES_PRODUCTS, formatSalesPrice, getSalesLineTotal, getSalesProductById } from '../services/salesCatalog';
import { useSalesCart } from '../services/salesCart';
import SalesCartPreview from './SalesCartPreview';

const GREEN = '#145B40';
const CATEGORY_LABELS = { cuerdas: 'Cuerdas', pelotas: 'Pelotas', accesorios: 'Accesorios', servicios: 'Servicios' };

function QuantityControl({ icon, label, disabled, onPress }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.quantityButton, pressed && styles.pressed, disabled && styles.disabled]}>
      <Feather name={icon} size={20} color={GREEN} accessible={false} />
    </Pressable>
  );
}

export default function ProductDetail({ productId, catalogBackTo = '/admin-home' }) {
  const { width, height } = useWindowDimensions();
  const isFocused = useIsFocused();
  const [hasMounted, setHasMounted] = useState(Platform.OS !== 'web');
  const [quantity, setQuantity] = useState(1);
  const [cartVisible, setCartVisible] = useState(false);
  const [notice, setNotice] = useState('');
  const noticeTimer = useRef(null);
  const { quantities, addProduct, dismissOrderReceipt } = useSalesCart();
  const product = getSalesProductById(productId);
  const scale = hasMounted ? Math.max(0.9, Math.min(width / 390, height / 800, 1.15)) : 1;
  const cartQuantity = product ? quantities[product.id] || 0 : 0;
  const cartCount = SALES_PRODUCTS.reduce((sum, item) => sum + (quantities[item.id] || 0), 0);
  const remainingStock = Number.isFinite(product?.stock) ? Math.max(0, product.stock - cartQuantity) : Infinity;
  const isAvailable = remainingStock > 0;
  const selectedQuantity = remainingStock > 0 ? Math.min(quantity, remainingStock) : 1;
  const selectionTotal = product ? getSalesLineTotal(product, selectedQuantity) : null;
  const savings = product && Number.isFinite(selectionTotal) ? product.price * selectedQuantity - selectionTotal : 0;

  useEffect(() => {
    setHasMounted(true);
    return () => clearTimeout(noticeTimer.current);
  }, []);

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace({ pathname: '/sales-panel', params: { backTo: catalogBackTo } });
    }
  };

  const requestProduct = () => {
    if (!product || remainingStock === 0) return;
    const added = addProduct(product, selectedQuantity);
    if (!added) return;
    setNotice(added === 1 ? 'Se agregó 1 unidad al carrito.' : `Se agregaron ${added} unidades al carrito.`);
    clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(''), 3500);
  };

  if (!hasMounted) {
    return <View style={[styles.screen, styles.center]}><ActivityIndicator color={GREEN} accessibilityLabel="Cargando producto" /></View>;
  }

  if (!product) {
    return (
      <View style={styles.screen}>
        {isFocused && <StatusBar style="dark" />}
        <SafeAreaView style={[styles.frame, styles.emptyState]}>
          <View style={styles.emptyIcon}><Feather name="package" size={34} color="#8A5D3B" /></View>
          <Text accessibilityRole="header" style={styles.emptyTitle}>Producto no encontrado</Text>
          <Text style={styles.emptyDescription}>Vuelve al catálogo para elegir uno de nuestros productos.</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Volver al catálogo" onPress={goBack} style={styles.emptyBack}>
            <Feather name="arrow-left" size={20} color="#FFFFFF" accessible={false} />
            <Text style={styles.submitText}>Volver al catálogo</Text>
          </Pressable>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {isFocused && <StatusBar style="dark" />}
      <View style={styles.frame}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <LinearGradient colors={['#FBF7ED', '#EDE5D2']} style={styles.hero}>
            <SafeAreaView edges={['top', 'left', 'right']}>
              <View style={[styles.navigation, { paddingHorizontal: 18 * scale, paddingTop: Platform.OS === 'web' ? 18 * scale : 8 * scale }]}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Volver al catálogo"
                  onPress={goBack}
                  style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}>
                  <Feather name="arrow-left" size={23} color="#4D392B" accessible={false} />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Ver carrito, ${cartCount} ${cartCount === 1 ? 'producto' : 'productos'}`}
                  onPress={() => { dismissOrderReceipt(); setCartVisible(true); }}
                  style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}>
                  <Feather name="shopping-cart" size={23} color="#713C24" accessible={false} />
                  {cartCount > 0 && <View style={styles.cartBadge}><Text style={styles.cartCount}>{cartCount}</Text></View>}
                </Pressable>
              </View>
              <View style={[styles.heroImageWrap, { height: Math.max(150, Math.min(height * 0.25, 240)), marginTop: 10 * scale, marginBottom: 37 * scale }]}>
                <Image
                  source={product.image}
                  accessibilityLabel={product.name}
                  contentFit="contain"
                  style={styles.heroImage}
                />
              </View>
            </SafeAreaView>
          </LinearGradient>

          <View style={[styles.detailsSheet, { paddingHorizontal: 22 * scale, paddingTop: 23 * scale, paddingBottom: 26 * scale }]}>
            <View style={styles.categoryPill}>
              <Feather name="tag" size={12} color="#8B5937" accessible={false} />
              <Text style={styles.categoryText}>{CATEGORY_LABELS[product.category]}</Text>
            </View>
            <Text accessibilityRole="header" style={[styles.productTitle, { fontSize: 25 * scale, lineHeight: 32 * scale }]}>{product.name}</Text>
            <View style={styles.priceRow}>
              <Text style={[styles.price, { fontSize: 29 * scale, lineHeight: 37 * scale }]}>{formatSalesPrice(product.price)}</Text>
              {Number.isFinite(product.price) && <Text style={styles.perUnit}>por {product.unit || 'unidad'}</Text>}
            </View>
            <View style={[styles.availabilityRow, !isAvailable && styles.availabilityUnavailable]}>
              <Feather name={isAvailable ? 'check-circle' : 'alert-circle'} size={17} color={isAvailable ? GREEN : '#9A4B2A'} accessible={false} />
              <Text accessibilityLiveRegion="polite" style={[styles.availabilityText, !isAvailable && styles.availabilityUnavailableText]}>
                {Number.isFinite(product.stock)
                  ? product.stock === 0 ? 'Sin stock' : remainingStock === 0 ? 'Ya seleccionaste el stock disponible' : `Stock Disponible: ${remainingStock} ${remainingStock === 1 ? 'unidad' : 'unidades'}`
                  : 'Stock Disponible'}
              </Text>
            </View>

            {product.category === 'cuerdas' && (
              <View style={styles.includedService}>
                <Feather name="check-circle" size={17} color={GREEN} accessible={false} />
                <Text style={styles.includedServiceText}>Incluye servicio de encordado</Text>
              </View>
            )}

            <View style={styles.informationColumns}>
              <View style={styles.informationColumn}>
                <Text accessibilityRole="header" style={styles.informationTitle}>Descripción</Text>
                <Text style={styles.description}>{product.description}</Text>
              </View>
              <View style={styles.informationColumn}>
                <Text accessibilityRole="header" style={styles.informationTitle}>Características</Text>
                <View style={styles.features}>
                  {product.features.map((feature) => (
                    <View key={feature.label} style={styles.featureRow}>
                      <View style={styles.featureDot} />
                      <Text style={styles.featureText}><Text style={styles.featureLabel}>{feature.label}: </Text>{feature.value}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>

            {product.bundlePrices?.length > 0 && (
              <>
                <Text accessibilityRole="header" style={styles.sectionTitle}>Precios por cantidad</Text>
                <Text style={styles.offerHint}>Elige una promoción para ajustar la cantidad.</Text>
                <View style={styles.offers}>
                  {product.bundlePrices.map((bundle) => {
                    const selected = selectedQuantity === bundle.quantity;
                    const disabled = bundle.quantity > remainingStock;
                    return (
                      <Pressable
                        key={bundle.quantity}
                        accessibilityRole="button"
                        accessibilityLabel={`Seleccionar ${bundle.quantity} unidades por ${formatSalesPrice(bundle.price)}`}
                        accessibilityState={{ selected, disabled }}
                        aria-pressed={selected}
                        disabled={disabled}
                        onPress={() => setQuantity(bundle.quantity)}
                        style={({ pressed }) => [styles.offer, selected && styles.offerSelected, pressed && styles.pressed, disabled && styles.disabled]}>
                        <Text style={styles.offerQuantity}>{bundle.quantity} unidades</Text>
                        <Text style={styles.offerPrice}>{formatSalesPrice(bundle.price)}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            )}
          </View>
        </ScrollView>

        <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.footer}>
          <View style={[styles.footerContent, { paddingHorizontal: 20 * scale, paddingTop: 13 * scale, paddingBottom: 13 * scale }]}>
            <View style={styles.quantityRow}>
              <View style={styles.quantityLabelWrap}>
                <Text style={styles.quantityLabel}>Cantidad</Text>
                {cartQuantity > 0 && <Text style={styles.inCart}>En tu carrito: {cartQuantity}</Text>}
              </View>
              <View style={styles.quantityControl}>
                <QuantityControl icon="minus" label="Disminuir cantidad" disabled={selectedQuantity <= 1 || remainingStock === 0} onPress={() => setQuantity(selectedQuantity - 1)} />
                <Text accessibilityLabel={`Cantidad seleccionada: ${selectedQuantity}`} accessibilityLiveRegion="polite" style={styles.quantity}>{selectedQuantity}</Text>
                <QuantityControl icon="plus" label="Aumentar cantidad" disabled={selectedQuantity >= remainingStock} onPress={() => setQuantity(selectedQuantity + 1)} />
              </View>
            </View>
            <View style={styles.selectionRow}>
              <View style={styles.selectionLabelWrap}>
                <Text style={styles.selectionLabel}>Total de esta selección</Text>
                {savings > 0 && <Text style={styles.savings}>Ahorras {formatSalesPrice(savings)}</Text>}
              </View>
              <Text accessibilityLabel={`Total de la selección: ${formatSalesPrice(selectionTotal)}`} accessibilityLiveRegion="polite" style={styles.selectionTotal}>{formatSalesPrice(selectionTotal)}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Solicitar producto"
              accessibilityHint={`Agrega ${selectedQuantity} ${selectedQuantity === 1 ? 'unidad' : 'unidades'} al carrito`}
              disabled={remainingStock === 0}
              onPress={requestProduct}
              style={({ pressed }) => [styles.submitButton, pressed && styles.pressed, remainingStock === 0 && styles.disabled]}>
              <LinearGradient colors={['#27804D', '#145B40']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.submitSurface}>
                <Feather name="shopping-cart" size={21} color="#FFFCF4" accessible={false} />
                <Text style={styles.submitText}>{remainingStock === 0 ? 'Sin stock disponible' : 'Solicitar producto'}</Text>
              </LinearGradient>
            </Pressable>
            {notice ? <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.notice}>{notice}</Text> : null}
          </View>
        </SafeAreaView>
      </View>
      <SalesCartPreview
        visible={cartVisible}
        onClose={() => setCartVisible(false)}
        onReturnToSales={() => {
          setCartVisible(false);
          router.dismissTo({ pathname: '/sales-panel', params: { backTo: catalogBackTo } });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', backgroundColor: '#F2EDDF' },
  frame: { flex: 1, width: '100%', maxWidth: 560, backgroundColor: '#FFFFFF' },
  center: { justifyContent: 'center' },
  scrollContent: { flexGrow: 1 },
  hero: { width: '100%' },
  navigation: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  headerButton: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255, 255, 255, 0.76)' },
  cartBadge: { position: 'absolute', top: -3, right: -3, minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: 10, backgroundColor: GREEN, alignItems: 'center', justifyContent: 'center' },
  cartCount: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
  heroImageWrap: { width: '100%', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 45 },
  heroImage: { width: '100%', height: '100%', maxWidth: 300, borderRadius: 20 },
  detailsSheet: { flexGrow: 1, marginTop: -24, borderTopLeftRadius: 30, borderTopRightRadius: 30, backgroundColor: '#FFFFFF' },
  categoryPill: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', borderRadius: 10, backgroundColor: '#F8F0E4', paddingVertical: 5, paddingHorizontal: 9, marginBottom: 10 },
  categoryText: { color: '#8B5937', fontSize: 10, fontWeight: '600' },
  productTitle: { fontWeight: '700', color: '#29382A', letterSpacing: -0.5 },
  priceRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', gap: 9, marginTop: 8 },
  price: { fontWeight: '700', color: GREEN, letterSpacing: -0.5 },
  perUnit: { fontSize: 12, color: '#92856D' },
  availabilityRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', maxWidth: '100%', gap: 7, marginTop: 11, paddingHorizontal: 11, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: '#C8E0C7', backgroundColor: '#E8F3E8' },
  availabilityText: { flexShrink: 1, fontSize: 12, lineHeight: 18, fontWeight: '700', color: GREEN },
  availabilityUnavailable: { borderColor: '#E7D4C4', backgroundColor: '#FAF0E7' },
  availabilityUnavailableText: { color: '#9A4B2A' },
  includedService: { flexDirection: 'row', alignItems: 'center', gap: 9, borderRadius: 13, backgroundColor: '#EDF4E8', padding: 12, marginTop: 17 },
  includedServiceText: { flex: 1, fontSize: 12, lineHeight: 18, color: GREEN, fontWeight: '600' },
  sectionTitle: { fontSize: 15, lineHeight: 21, fontWeight: '700', color: '#34412F', marginTop: 23, marginBottom: 8 },
  informationColumns: { flexDirection: 'row', alignItems: 'flex-start', gap: 18, marginTop: 23 },
  informationColumn: { flex: 1, minWidth: 0 },
  informationTitle: { fontSize: 14, lineHeight: 20, fontWeight: '700', color: '#34412F', marginBottom: 8 },
  description: { color: '#676D60', fontSize: 13, lineHeight: 20 },
  features: { gap: 6 },
  featureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  featureDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#87A174', marginTop: 6 },
  featureText: { flex: 1, color: '#676D60', fontSize: 12, lineHeight: 18 },
  featureLabel: { fontWeight: '600', color: '#626B56' },
  offerHint: { fontSize: 11, lineHeight: 17, color: '#968469', marginBottom: 10 },
  offers: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  offer: { width: '47%', minHeight: 65, borderRadius: 14, borderWidth: 1, borderColor: '#E2E7D8', backgroundColor: '#FAFBF5', padding: 12, justifyContent: 'center', gap: 5 },
  offerSelected: { borderColor: '#5A875A', backgroundColor: '#EBF3E4' },
  offerQuantity: { color: '#8A8974', fontSize: 11 },
  offerPrice: { color: GREEN, fontSize: 15, fontWeight: '700' },
  footer: { backgroundColor: '#FFFCF5', borderTopWidth: 1, borderTopColor: '#EBE5D6' },
  footerContent: { gap: 10 },
  quantityRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  quantityLabelWrap: { flex: 1 },
  quantityLabel: { fontSize: 14, color: '#4C4C3B', fontWeight: '600' },
  inCart: { fontSize: 10, lineHeight: 15, color: '#968469', marginTop: 3 },
  quantityControl: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1, borderColor: '#E4DDCD', overflow: 'hidden', backgroundColor: '#FFFFFF' },
  quantityButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4ECDC' },
  quantity: { minWidth: 45, textAlign: 'center', fontSize: 16, color: '#384A32', fontWeight: '600' },
  selectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  selectionLabelWrap: { flex: 1 },
  selectionLabel: { color: '#968469', fontSize: 11, lineHeight: 17 },
  savings: { color: GREEN, fontSize: 10, lineHeight: 16, fontWeight: '600' },
  selectionTotal: { color: GREEN, fontSize: 22, fontWeight: '700' },
  submitButton: { borderRadius: 16, overflow: 'hidden', backgroundColor: GREEN },
  submitSurface: { minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 13 },
  submitText: { color: '#FFFCF4', fontSize: 14, lineHeight: 21, fontWeight: '700' },
  notice: { color: GREEN, fontSize: 11, lineHeight: 17, textAlign: 'center', fontWeight: '500' },
  pressed: { opacity: 0.75 },
  disabled: { opacity: 0.4 },
  emptyState: { alignItems: 'center', justifyContent: 'center', padding: 26, gap: 16 },
  emptyIcon: { width: 75, height: 75, borderRadius: 25, backgroundColor: '#F3E8D7', alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 23, lineHeight: 30, fontWeight: '700', color: '#34412F', textAlign: 'center' },
  emptyDescription: { color: '#968469', fontSize: 14, lineHeight: 21, textAlign: 'center' },
  emptyBack: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: GREEN, padding: 16, borderRadius: 15, marginTop: 9 },
});

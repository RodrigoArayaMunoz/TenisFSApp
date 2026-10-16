import { Feather } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { SAMPLE_PRODUCTS, formatSalesPrice } from '../services/salesCatalog';
import { useSalesCart } from '../services/salesCart';

const GREEN = '#145B40';

function ProductCard({ product, quantity, scale, onRequest }) {
  const unavailable = quantity >= product.stock;

  return (
    <View style={[styles.productCard, { borderRadius: 15 * scale }]}>
      <LinearGradient colors={['#FBF9F2', '#FFFFFF']}>
        <Image
          source={product.image}
          accessibilityLabel={product.name}
          contentFit="contain"
          style={[styles.productImage, { height: 125 * scale, margin: 5 * scale }]}
        />
      </LinearGradient>
      <View style={[styles.productInfo, { padding: 8 * scale }]}>
        <Text
          style={[
            styles.productName,
            { fontSize: 12.5 * scale, lineHeight: 17 * scale, minHeight: 34 * scale },
          ]}>
          {product.name}
        </Text>
        <Text style={[styles.price, { fontSize: 17 * scale, lineHeight: 23 * scale }]}>
          {formatSalesPrice(product.price)}
        </Text>
        <View style={[styles.productFooter, { marginTop: 8 * scale, gap: 4 * scale }]}>
          <Text style={[styles.stock, { fontSize: 11 * scale }]}>
            Stock: {product.stock}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Solicitar ${product.name}`}
            accessibilityHint={unavailable ? 'Ya seleccionaste todo el stock disponible' : 'Agrega una unidad al carrito'}
            disabled={unavailable}
            hitSlop={4}
            onPress={() => onRequest(product)}
            style={({ pressed }) => [
              styles.requestButton,
              { borderRadius: 11 * scale },
              (pressed || unavailable) && styles.buttonPressed,
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
    </View>
  );
}

function QuantityButton({ icon, label, disabled, onPress }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.quantityButton,
        (pressed || disabled) && styles.buttonPressed,
      ]}>
      <Feather accessible={false} name={icon} size={18} color={GREEN} />
    </Pressable>
  );
}

function CartPreview({ visible, entries, quantities, total, height, onAdd, onRemove, onClose }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <Pressable accessible={false} onPress={onClose} style={StyleSheet.absoluteFill} />
        <View accessibilityViewIsModal style={styles.cartPanel}>
          <View style={styles.cartHeader}>
            <View style={styles.cartTitleBlock}>
              <Text accessibilityRole="header" style={styles.cartTitle}>Tu solicitud</Text>
              <Text style={styles.cartSubtitle}>Revisa los productos seleccionados</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cerrar carrito"
              onPress={onClose}
              style={styles.closeButton}>
              <Feather accessible={false} name="x" size={24} color="#513529" />
            </Pressable>
          </View>

          {entries.length === 0 ? (
            <View style={styles.emptyCart}>
              <Feather accessible={false} name="shopping-cart" size={40} color="#9B7155" />
              <Text style={styles.emptyTitle}>Tu carrito está vacío</Text>
              <Text style={styles.emptyDescription}>Elige un producto con el botón Solicitar.</Text>
            </View>
          ) : (
            <ScrollView style={{ maxHeight: height * 0.48 }} showsVerticalScrollIndicator={false}>
              {entries.map((product) => (
                <View key={product.id} style={styles.cartItem}>
                  <View style={styles.cartItemInfo}>
                    <Image source={product.image} contentFit="contain" style={styles.cartImage} />
                    <View style={styles.cartItemText}>
                      <Text style={styles.cartItemName}>{product.name}</Text>
                      <Text style={styles.unitPrice}>{formatSalesPrice(product.price)} por unidad</Text>
                    </View>
                  </View>
                  <View style={styles.cartItemFooter}>
                    <View style={styles.quantityControls}>
                      <QuantityButton
                        icon="minus"
                        label={`Quitar una unidad de ${product.name}`}
                        onPress={() => onRemove(product)}
                      />
                      <Text
                        accessibilityLabel={`Cantidad de ${product.name}: ${quantities[product.id]}`}
                        style={styles.quantity}>
                        {quantities[product.id]}
                      </Text>
                      <QuantityButton
                        icon="plus"
                        label={`Agregar una unidad de ${product.name}`}
                        disabled={quantities[product.id] >= product.stock}
                        onPress={() => onAdd(product)}
                      />
                    </View>
                    <Text style={styles.itemTotal}>
                      {formatSalesPrice(product.price * quantities[product.id])}
                    </Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          )}

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text accessibilityLabel={`Total del carrito: ${formatSalesPrice(total)}`} style={styles.totalValue}>
              {formatSalesPrice(total)}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Seguir viendo productos"
            onPress={onClose}
            style={({ pressed }) => [styles.continueButton, pressed && styles.buttonPressed]}>
            <Text style={styles.continueLabel}>Seguir viendo productos</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

export default function SalesPanel({ backTo = '/admin-home' }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const [hasMounted, setHasMounted] = useState(Platform.OS !== 'web');
  const [cartVisible, setCartVisible] = useState(false);
  const [notice, setNotice] = useState(null);
  const noticeTimer = useRef(null);
  const { quantities, addProduct, removeProduct } = useSalesCart();
  const scale = hasMounted
    ? Math.max(0.86, Math.min(width / 333, height / 659, 1.2))
    : 1;
  const entries = SAMPLE_PRODUCTS.filter((product) => quantities[product.id]);
  const count = entries.reduce((sum, product) => sum + quantities[product.id], 0);
  const total = entries.reduce((sum, product) => sum + product.price * quantities[product.id], 0);

  useEffect(() => {
    setHasMounted(true);
    return () => clearTimeout(noticeTimer.current);
  }, []);

  const handleRequest = (product) => {
    addProduct(product);
    setNotice(product.name + ' agregado al carrito');
    clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(null), 2200);
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
              onPress={() => setCartVisible(true)}
              style={({ pressed }) => [styles.headerButton, pressed && styles.buttonPressed]}>
              <Feather accessible={false} name="shopping-cart" size={28 * scale} color="#622B1D" />
              {count > 0 && (
                <View style={styles.cartBadge}>
                  <Text style={styles.cartBadgeText}>{count}</Text>
                </View>
              )}
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.scrollContent,
              {
                paddingHorizontal: 16 * scale,
                paddingTop: 8 * scale,
                paddingBottom: Math.max(insets.bottom, 24 * scale),
              },
            ]}>
            <View style={[styles.productGrid, { rowGap: 14 * scale }]}>
              {SAMPLE_PRODUCTS.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  quantity={quantities[product.id] || 0}
                  scale={scale}
                  onRequest={handleRequest}
                />
              ))}
            </View>
            <Text style={styles.sampleLabel}>Catálogo de muestra</Text>
          </ScrollView>
        </SafeAreaView>
        {notice && (
          <View
            pointerEvents="none"
            style={[styles.noticePosition, { bottom: Math.max(insets.bottom + 16, 24) }]}>
            <View accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.noticeCard}>
              <Feather accessible={false} name="check-circle" size={20} color={GREEN} />
              <Text style={styles.noticeText}>{notice}</Text>
            </View>
          </View>
        )}
      </LinearGradient>
      <CartPreview
        visible={cartVisible}
        entries={entries}
        quantities={quantities}
        total={total}
        height={height}
        onAdd={addProduct}
        onRemove={removeProduct}
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
  productGrid: { width: '100%', maxWidth: 480, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  productCard: {
    width: '48%', overflow: 'hidden', borderWidth: 1, borderColor: '#E6E1D5', backgroundColor: '#FFFFFF',
    ...Platform.select({
      web: { boxShadow: '0px 3px 8px rgba(112, 85, 46, 0.045)' },
      default: { shadowColor: '#70552E', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.045, shadowRadius: 7, elevation: 1 },
    }),
  },
  productImage: { alignSelf: 'stretch' },
  productName: { color: '#292924', fontWeight: '500' },
  price: { color: '#23241F', fontWeight: '700' },
  productFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stock: { color: '#9B694C', fontWeight: '600', flexShrink: 1 },
  requestButton: { backgroundColor: GREEN },
  requestSurface: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#438663' },
  requestLabel: { color: '#FFFFFF', fontWeight: '600' },
  sampleLabel: { fontSize: 12, lineHeight: 18, color: '#968775', marginTop: 18, textAlign: 'center' },
  buttonPressed: { opacity: 0.55 },
  noticePosition: { position: 'absolute', left: 18, right: 18, alignItems: 'center' },
  noticeCard: {
    maxWidth: 440, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14,
    borderRadius: 16, backgroundColor: '#FFFDF5', borderWidth: 1, borderColor: '#D8E2D1',
  },
  noticeText: { flexShrink: 1, fontSize: 13, lineHeight: 18, color: '#244F3B', fontWeight: '500' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(43, 30, 20, 0.42)', alignItems: 'center', justifyContent: 'center', padding: 18 },
  cartPanel: { width: '100%', maxWidth: 460, borderRadius: 24, backgroundColor: '#FFFCF3', padding: 18 },
  cartHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  cartTitleBlock: { flex: 1 },
  cartTitle: { fontSize: 23, lineHeight: 29, fontWeight: '700', color: '#30261D' },
  cartSubtitle: { fontSize: 12, lineHeight: 18, color: '#84745F', marginTop: 3 },
  closeButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  emptyCart: { minHeight: 160, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 10 },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: '#4D3829', textAlign: 'center' },
  emptyDescription: { fontSize: 13, lineHeight: 19, color: '#89785F', textAlign: 'center' },
  cartItem: { paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E2DBC9' },
  cartItemInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cartImage: { width: 48, height: 56 },
  cartItemText: { flex: 1, minWidth: 0 },
  cartItemName: { fontSize: 14, lineHeight: 19, color: '#332C23', fontWeight: '600' },
  unitPrice: { fontSize: 12, lineHeight: 18, color: '#927353', marginTop: 3 },
  cartItemFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  quantityControls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  quantityButton: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, borderColor: '#D3DECB', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F6F8ED' },
  quantity: { minWidth: 20, textAlign: 'center', fontSize: 16, fontWeight: '600', color: GREEN },
  itemTotal: { fontSize: 15, fontWeight: '700', color: '#30291E', flexShrink: 1, textAlign: 'right' },
  totalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, marginBottom: 16 },
  totalLabel: { fontSize: 17, fontWeight: '600', color: '#4A3828' },
  totalValue: { fontSize: 21, fontWeight: '700', color: GREEN },
  continueButton: { minHeight: 46, borderRadius: 14, backgroundColor: GREEN, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  continueLabel: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
});
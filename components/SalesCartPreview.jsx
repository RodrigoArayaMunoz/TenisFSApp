import { Feather } from '@expo/vector-icons';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  SALES_PRODUCTS,
  formatSalesPrice,
  getSalesCartTotal,
  getSalesLineTotal,
  isSalesStockExhausted,
} from '../services/salesCatalog';
import { useSalesCart } from '../services/salesCart';
import SalesOrderPlayerPicker from './SalesOrderPlayerPicker';
import SalesOrderSuccess from './SalesOrderSuccess';

const GREEN = '#145B40';

function QuantityButton({ icon, label, disabled, onPress }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.quantityButton, (pressed || disabled) && styles.buttonPressed]}>
      <Feather accessible={false} name={icon} size={18} color={GREEN} />
    </Pressable>
  );
}

export default function SalesCartPreview({ visible, onClose, onReturnToSales = onClose }) {
  const [playerPickerVisible, setPlayerPickerVisible] = useState(false);
  const { quantities, orderPlayer, checkoutStatus, checkoutError, lastOrder, placeOrder, clearCheckoutError, addProduct, removeProduct, deleteProduct } = useSalesCart();
  const entries = SALES_PRODUCTS.filter((product) => quantities[product.id]);
  const isSubmitting = checkoutStatus === 'submitting';
  const hasReceipt = entries.length === 0 && lastOrder !== null;
  const total = getSalesCartTotal(entries, quantities);
  const hasPendingPrices = !Number.isFinite(total);
  const totalLabel = hasPendingPrices ? 'Por confirmar' : formatSalesPrice(total);
  const lineTotals = Object.fromEntries(entries.map((product) => [
    product.id, getSalesLineTotal(product, quantities[product.id]),
  ]));

  useEffect(() => {
    if (!visible) setPlayerPickerVisible(false);
  }, [visible]);

  const closePlayerPicker = useCallback(() => {
    if (!isSubmitting) setPlayerPickerVisible(false);
  }, [isSubmitting]);
  const openPlayerPicker = () => {
    clearCheckoutError();
    setPlayerPickerVisible(true);
  };
  const confirmPlayer = async (player) => {
    try {
      await placeOrder(player);
      setPlayerPickerVisible(false);
    } catch {
      // The shared cart retains its contents and exposes the error in the popup.
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" accessibilityLabel={hasReceipt ? 'Solicitud enviada' : 'Carrito de productos'} onRequestClose={hasReceipt ? onReturnToSales : playerPickerVisible ? closePlayerPicker : onClose}>
      <View style={styles.screen}>
        {hasReceipt ? (
          visible && <SalesOrderSuccess onReturnToSales={onReturnToSales} />
        ) : (
        <LinearGradient
          colors={['#FBF8F0', '#F3EDDF']}
          aria-hidden={playerPickerVisible}
          accessibilityElementsHidden={playerPickerVisible}
          importantForAccessibility={playerPickerVisible ? 'no-hide-descendants' : 'auto'}
          pointerEvents={playerPickerVisible ? 'none' : 'auto'}
          style={styles.frame}>
          <SafeAreaView accessibilityViewIsModal style={styles.safeArea} edges={['top', 'left', 'right']}>
            <View style={styles.cartHeader}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cerrar carrito"
                accessibilityHint="Vuelve al catálogo o al detalle del producto"
                onPress={onClose}
                style={({ pressed }) => [styles.backButton, pressed && styles.buttonPressed]}>
                <Feather accessible={false} name="arrow-left" size={24} color="#513529" />
              </Pressable>
              <Text accessibilityRole="header" style={styles.cartTitle}>Carrito de pedido</Text>
              <View style={styles.headerSpacer} />
            </View>
            {entries.length === 0 ? (
              <View style={styles.emptyCart}>
                <View style={styles.emptyIcon}>
                  <Feather accessible={false} name="shopping-bag" size={38} color={GREEN} />
                </View>
                <Text style={styles.emptyTitle}>Tu carrito está vacío</Text>
                <Text style={styles.emptyDescription}>Abre el detalle de un producto y elige la cantidad que necesitas.</Text>
              </View>
            ) : (
              <ScrollView style={styles.cartList} contentContainerStyle={styles.cartListContent} showsVerticalScrollIndicator={false}>
                {entries.map((product) => (
                  <View key={product.id} style={styles.cartItem}>
                    <View style={styles.cartImageFrame}>
                      <Image source={product.image} accessibilityLabel={product.name} contentFit="contain" style={styles.cartImage} />
                    </View>
                    <View style={styles.cartItemInfo}>
                      <Text style={styles.cartItemName}>{product.name}</Text>
                      <Text style={styles.unitPrice}>
                        {formatSalesPrice(product.price)}
                        {Number.isFinite(product.price) && <Text style={styles.perUnit}> / {product.unit || 'unidad'}</Text>}
                      </Text>
                      <View style={styles.cartItemActions}>
                        <View style={styles.quantityControls}>
                          <QuantityButton icon="minus" label={`Quitar una unidad de ${product.name}`} onPress={() => removeProduct(product)} />
                          <Text accessibilityLabel={`Cantidad de ${product.name}: ${quantities[product.id]}`} accessibilityLiveRegion="polite" style={styles.quantity}>
                            {quantities[product.id]}
                          </Text>
                          <QuantityButton
                            icon="plus"
                            label={`Agregar una unidad de ${product.name}`}
                            disabled={isSalesStockExhausted(product, quantities[product.id])}
                            onPress={() => addProduct(product)}
                          />
                        </View>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Eliminar ${product.name} del carrito`}
                          onPress={() => deleteProduct(product)}
                          style={({ pressed }) => [styles.deleteButton, pressed && styles.buttonPressed]}>
                          <Feather accessible={false} name="trash-2" size={20} color="#9A4B2A" />
                        </Pressable>
                      </View>
                      <View style={styles.itemSubtotalRow}>
                        <Text style={styles.subtotalLabel}>Subtotal</Text>
                        <Text
                          accessibilityLabel={`Subtotal de ${product.name}: ${Number.isFinite(lineTotals[product.id]) ? formatSalesPrice(lineTotals[product.id]) : 'Por confirmar'}`}
                          accessibilityLiveRegion="polite"
                          style={styles.itemTotal}>
                          {Number.isFinite(lineTotals[product.id]) ? formatSalesPrice(lineTotals[product.id]) : 'Por confirmar'}
                        </Text>
                      </View>
                      {Number.isFinite(lineTotals[product.id]) && lineTotals[product.id] < product.price * quantities[product.id] && (
                        <Text style={styles.promotionApplied}>
                          Ahorras {formatSalesPrice(product.price * quantities[product.id] - lineTotals[product.id])} con la promoción
                        </Text>
                      )}
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}
            <SafeAreaView edges={['bottom']} style={styles.footer}>
              <View style={styles.footerContent}>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Total estimado</Text>
                  <Text accessibilityLabel={`Total del carrito: ${totalLabel}`} accessibilityLiveRegion="polite" style={styles.totalValue}>{totalLabel}</Text>
                </View>
                {hasPendingPrices && <Text style={styles.pendingPriceNotice}>El total se confirmará al consultar los productos sin precio.</Text>}
                {orderPlayer && (
                  <Pressable accessibilityRole="button" accessibilityLabel="Cambiar jugador del pedido" onPress={openPlayerPicker} style={({ pressed }) => [styles.orderPlayer, pressed && styles.buttonPressed]}>
                    <Feather accessible={false} name="user-check" size={20} color={GREEN} />
                    <View style={styles.orderPlayerInfo}>
                      <Text style={styles.orderPlayerLabel}>Jugador del pedido</Text>
                      <Text style={styles.orderPlayerName}>{orderPlayer.name}</Text>
                      <Text style={styles.orderPlayerLeague}>{orderPlayer.league?.name || `Liga ${orderPlayer.league_id}`}</Text>
                    </View>
                    <Feather accessible={false} name="edit-3" size={17} color={GREEN} />
                  </Pressable>
                )}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={entries.length ? 'Realizar Pedido' : 'Seguir viendo productos'}
                  accessibilityHint={entries.length ? 'Abre la lista de jugadores para confirmar el pedido' : 'Vuelve a los productos'}
                  onPress={entries.length ? openPlayerPicker : onClose}
                  style={({ pressed }) => [styles.submitButton, pressed && styles.buttonPressed]}>
                  <LinearGradient colors={['#27804D', '#145B40']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.submitSurface}>
                    <Text style={styles.submitLabel}>{entries.length ? 'Realizar Pedido' : 'Seguir viendo productos'}</Text>
                    {entries.length === 0 && <Feather accessible={false} name="arrow-right" size={20} color="#FFFCF4" />}
                  </LinearGradient>
                </Pressable>
              </View>
            </SafeAreaView>
          </SafeAreaView>
        </LinearGradient>
        )}
        {visible && playerPickerVisible && entries.length > 0 && (
          <SalesOrderPlayerPicker
            initialPlayerId={orderPlayer?.id}
            totalLabel={totalLabel}
            submitting={isSubmitting}
            submitError={checkoutError}
            onClose={closePlayerPicker}
            onConfirm={confirmPlayer}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  buttonPressed: { opacity: 0.55 },
  screen: { flex: 1, alignItems: 'center', backgroundColor: '#F2EDDF' },
  frame: { flex: 1, width: '100%', maxWidth: 560 },
  safeArea: { flex: 1 },
  cartHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingTop: 12, paddingBottom: 14, gap: 8 },
  backButton: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255, 255, 255, 0.72)' },
  headerSpacer: { width: 44 },
  cartTitle: { flex: 1, fontSize: 20, lineHeight: 26, fontWeight: '700', color: '#30261D', textAlign: 'center' },
  cartList: { flex: 1 },
  cartListContent: { paddingHorizontal: 14, paddingTop: 4, paddingBottom: 20, gap: 12 },
  emptyCart: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingHorizontal: 35, paddingVertical: 20 },
  emptyIcon: { width: 84, height: 84, borderRadius: 28, backgroundColor: '#E6EDDD', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  emptyTitle: { fontSize: 21, lineHeight: 28, fontWeight: '700', color: '#4D3829', textAlign: 'center' },
  emptyDescription: { fontSize: 14, lineHeight: 21, color: '#89785F', textAlign: 'center', maxWidth: 300 },
  cartItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 12, borderRadius: 20, borderWidth: 1, borderColor: '#EEE7D9', backgroundColor: '#FFFFFF' },
  cartImageFrame: { width: 78, height: 108, padding: 5, borderRadius: 12, borderWidth: 1, borderColor: '#EAE4D7', backgroundColor: '#FCFAF4', overflow: 'hidden' },
  cartImage: { width: '100%', height: '100%' },
  cartItemInfo: { flex: 1, minWidth: 0 },
  cartItemName: { fontSize: 14, lineHeight: 19, color: '#332C23', fontWeight: '600' },
  unitPrice: { fontSize: 15, lineHeight: 21, color: '#30261D', fontWeight: '700', marginTop: 3 },
  perUnit: { fontSize: 10, fontWeight: '400', color: '#92816B' },
  cartItemActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 8 },
  quantityControls: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, borderColor: '#E4DDCD', overflow: 'hidden', backgroundColor: '#FFFEFA' },
  quantityButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4ECDC' },
  quantity: { minWidth: 28, paddingHorizontal: 3, textAlign: 'center', fontSize: 15, fontWeight: '600', color: '#384A32' },
  deleteButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  itemSubtotalRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 6, marginTop: 8 },
  subtotalLabel: { fontSize: 11, lineHeight: 18, color: '#92816B' },
  itemTotal: { fontSize: 13, lineHeight: 18, fontWeight: '700', color: GREEN, flexShrink: 1, textAlign: 'right' },
  promotionApplied: { fontSize: 11, lineHeight: 16, color: GREEN, marginTop: 4 },
  footer: { backgroundColor: '#FFFCF5', borderTopWidth: 1, borderTopColor: '#EAE2D1' },
  footerContent: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 16, gap: 14 },
  totalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  totalLabel: { fontSize: 16, lineHeight: 23, fontWeight: '600', color: '#4A3828' },
  totalValue: { fontSize: 24, lineHeight: 31, fontWeight: '700', color: '#713C24', flexShrink: 1, textAlign: 'right' },
  pendingPriceNotice: { fontSize: 12, lineHeight: 18, color: '#927353' },
  submitButton: { borderRadius: 16, overflow: 'hidden', backgroundColor: GREEN },
  orderPlayer: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: '#D5E2CC', backgroundColor: '#EDF4E8' },
  orderPlayerInfo: { flex: 1, minWidth: 0 },
  orderPlayerLabel: { fontSize: 10, lineHeight: 15, color: '#7B816E' },
  orderPlayerName: { fontSize: 13, lineHeight: 19, fontWeight: '700', color: GREEN },
  orderPlayerLeague: { fontSize: 11, lineHeight: 16, color: '#7B816E' },
  submitSurface: { minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 14, paddingHorizontal: 16 },
  submitLabel: { fontSize: 14, lineHeight: 21, fontWeight: '700', color: '#FFFCF4' },
});

import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { test } from 'node:test';

const catalogUrl = new URL('../services/salesCatalog.js', import.meta.url);
const source = await readFile(catalogUrl, 'utf8');
// Metro resolves the literal image requires; use their actual paths in Node.
const catalog = vm.runInNewContext(
  source.replace(/^export /gm, '') + '\n({ SALES_PRODUCTS, SALES_FILTERS, getVisibleSalesProducts, isSalesStockExhausted, formatSalesPrice, getSalesLineTotal, getSalesCartTotal, getSalesProductById });',
  { require: (imagePath) => fileURLToPath(new URL(imagePath, catalogUrl)) }
);
const ids = (products) => Array.from(products, (product) => product.id);

test('the catalog includes every supplied photo once with a stable unique product ID', async () => {
  const expectedImages = [];
  for (const folder of ['cuerdas', 'pelotas']) {
    const folderUrl = new URL(`../assets/images/${folder}/`, import.meta.url);
    for (const name of await readdir(folderUrl)) {
      if (/\.jpe?g$/i.test(name)) expectedImages.push(fileURLToPath(new URL(name, folderUrl)));
    }
  }
  const productImages = Array.from(catalog.SALES_PRODUCTS, (product) => product.image);
  assert.deepEqual(productImages.sort(), expectedImages.sort());
  assert.equal(new Set(ids(catalog.SALES_PRODUCTS)).size, expectedImages.length);
  for (const imagePath of productImages) assert.equal(existsSync(imagePath), true);
});

test('the default view pins grip first and stringing service second without losing other products', () => {
  const original = ids(catalog.SALES_PRODUCTS);
  for (const seed of [0, 0.25, 0.5, 0.999]) {
    const products = catalog.getVisibleSalesProducts('todos', () => seed);
    assert.equal(products[0].id, 'grip');
    assert.equal(products[1].id, 'servicio-encordado');
    assert.equal(new Set(ids(products)).size, original.length);
    assert.deepEqual(ids(products).sort(), [...original].sort());
    assert.deepEqual(ids(catalog.SALES_PRODUCTS), original);
  }
});

test('category filters exclude grip and stringing service and only include their matching photos', () => {
  for (const category of ['cuerdas', 'pelotas']) {
    const products = catalog.getVisibleSalesProducts(category, () => 0.5);
    assert.ok(products.length > 0);
    assert.equal(products.some((product) => product.id === 'grip'), false);
    assert.equal(products.some((product) => product.id === 'servicio-encordado'), false);
    assert.equal(products.every((product) => product.category === category), true);
    assert.equal(products.length, catalog.SALES_PRODUCTS.filter((product) => product.category === category).length);
  }
  assert.equal(catalog.getVisibleSalesProducts('unknown').length, 0);
});

test('random order can change while both featured products stay pinned', () => {
  const first = ids(catalog.getVisibleSalesProducts('todos', () => 0));
  const second = ids(catalog.getVisibleSalesProducts('todos', () => 0.999));
  assert.notDeepEqual(first, second);
  assert.equal(first[0], 'grip');
  assert.equal(second[0], 'grip');
  assert.equal(first[1], 'servicio-encordado');
  assert.equal(second[1], 'servicio-encordado');
});

test('each of the three filter buttons has local reference images', () => {
  assert.deepEqual(Array.from(catalog.SALES_FILTERS, (filter) => filter.label), ['Todos', 'Cuerdas', 'Pelotas']);
  for (const filter of catalog.SALES_FILTERS) {
    assert.ok(filter.images.length);
    for (const imagePath of filter.images) assert.equal(existsSync(imagePath), true);
  }
});

test('every product resolves to its own detail data and unknown IDs do not select another product', () => {
  for (const product of catalog.SALES_PRODUCTS) {
    assert.equal(catalog.getSalesProductById(product.id), product);
    assert.ok(product.description.length > 30);
    assert.ok(product.features.length >= 3);
    for (const feature of product.features) {
      assert.ok(feature.label);
      assert.ok(feature.value);
    }
  }
  assert.equal(catalog.getSalesProductById('unknown-product'), undefined);
  assert.equal(catalog.getSalesProductById(undefined), undefined);
});

test('string prices from filenames are preserved and missing prices still support consultation', () => {
  for (const product of catalog.SALES_PRODUCTS) {
    if (product.category === 'cuerdas') {
      const priceInFile = Number(product.image.match(/(\d+)\.jpeg$/)[1]);
      assert.equal(product.price, priceInFile);
    }
  }
  assert.equal(catalog.formatSalesPrice(null), 'Consultar precio');
  assert.equal(catalog.formatSalesPrice(25000), '$ 25.000');
  assert.equal(catalog.formatSalesPrice(0), '$ 0');
});

test('grip applies the stated unit price and repeated packs of three', () => {
  const grip = catalog.SALES_PRODUCTS.find((product) => product.id === 'grip');
  assert.equal(grip.price, 3000);
  for (const [quantity, expected] of [[0, 0], [1, 3000], [2, 6000], [3, 8000], [4, 11000], [5, 14000], [6, 16000], [7, 19000]]) {
    assert.equal(catalog.getSalesLineTotal(grip, quantity), expected, `Grip quantity ${quantity}`);
  }
});

test('both ball brands apply every stated price and the best combination for other quantities', () => {
  for (const id of ['pelotas-dunlop', 'pelotas-tecnifibre']) {
    const product = catalog.SALES_PRODUCTS.find((candidate) => candidate.id === id);
    assert.equal(product.price, 12000);
    for (const [quantity, expected] of [[1, 12000], [2, 23000], [3, 34000], [4, 43000], [5, 55000], [6, 60000], [7, 72000], [8, 83000], [10, 103000], [12, 120000]]) {
      assert.equal(catalog.getSalesLineTotal(product, quantity), expected, `${id} quantity ${quantity}`);
    }
  }
});

test('cart totals add promotions by product without mixing ball brands', () => {
  assert.equal(catalog.getSalesCartTotal(catalog.SALES_PRODUCTS, {
    grip: 3, 'pelotas-dunlop': 2, 'pelotas-tecnifibre': 4, 'cuerda-dunlop-explosive': 1,
  }), 92000);
  assert.equal(catalog.getSalesCartTotal(catalog.SALES_PRODUCTS, {
    'pelotas-dunlop': 1, 'pelotas-tecnifibre': 1,
  }), 24000);
  assert.equal(catalog.getSalesCartTotal(catalog.SALES_PRODUCTS, {}), 0);
});

test('pack combinations choose the cheapest exact quantity rather than the biggest pack first', () => {
  const product = { price: 4000, bundlePrices: [{ quantity: 3, price: 8000 }, { quantity: 4, price: 10000 }] };
  assert.equal(catalog.getSalesLineTotal(product, 6), 16000);
});

test('line totals preserve ordinary pricing, reject invalid quantities and keep missing prices pending', () => {
  assert.equal(catalog.getSalesLineTotal({ price: 18000 }, 3), 54000);
  assert.equal(catalog.getSalesLineTotal({ price: null }, 0), 0);
  assert.equal(catalog.getSalesLineTotal({ price: null }, 1), null);
  assert.equal(catalog.getSalesCartTotal([{ id: 'unpriced', price: null }], { unpriced: 1 }), null);
  for (const quantity of [-1, 1.5, NaN, Infinity]) {
    assert.throws(() => catalog.getSalesLineTotal({ price: 3000 }, quantity), /La cantidad debe ser un entero/);
  }
});

const makeCart = async (dependencies = {}) => {
  const cartSource = await readFile(new URL('../services/salesCart.js', import.meta.url), 'utf8');
  return vm.runInNewContext(
    cartSource.replace(/^import .*from .*;\r?\n/gm, '').replace(/^export /gm, '') + '\nuseSalesCart;',
    { useSyncExternalStore: (_subscribe, getSnapshot) => getSnapshot(), ...dependencies }
  );
};

test('products without stock information can be requested and removed from the cart', async () => {
  const useCart = await makeCart();
  const grip = catalog.SALES_PRODUCTS.find((product) => product.id === 'grip');
  const before = useCart().quantities;
  useCart().addProduct(grip);
  useCart().addProduct(grip);
  assert.equal(useCart().quantities.grip, 2);
  assert.equal(before.grip, undefined);
  assert.equal(catalog.isSalesStockExhausted(grip, 2), false);
  useCart().removeProduct(grip);
  useCart().removeProduct(grip);
  useCart().removeProduct(grip);
  assert.equal(Object.hasOwn(useCart().quantities, 'grip'), false);
});

test('known stock limits still cap the cart quantity', async () => {
  const useCart = await makeCart();
  const product = { id: 'limited', stock: 2 };
  useCart().addProduct(product);
  useCart().addProduct(product);
  useCart().addProduct(product);
  assert.equal(useCart().quantities.limited, 2);
  assert.equal(catalog.isSalesStockExhausted(product, 2), true);
});

test('adding a selected quantity combines with the existing cart and applies the correct pack total', async () => {
  const useCart = await makeCart();
  const grip = catalog.getSalesProductById('grip');
  assert.equal(useCart().addProduct(grip, 2), 2);
  assert.equal(useCart().addProduct(grip, 3), 3);
  assert.equal(useCart().quantities.grip, 5);
  assert.equal(catalog.getSalesCartTotal(catalog.SALES_PRODUCTS, useCart().quantities), 14000);
});

test('bulk requests respect available stock and reject invalid quantities without changing the cart', async () => {
  const useCart = await makeCart();
  const limited = { id: 'limited', stock: 3 };
  assert.equal(useCart().addProduct(limited, 2), 2);
  assert.equal(useCart().addProduct(limited, 5), 1);
  assert.equal(useCart().addProduct(limited, 1), 0);
  assert.equal(useCart().quantities.limited, 3);
  for (const amount of [0, -1, 1.5, NaN, Infinity]) {
    assert.throws(() => useCart().addProduct(limited, amount), /La cantidad debe ser un entero/);
  }
  assert.equal(useCart().quantities.limited, 3);
});

test('deleting an entire product keeps other quantities and recalculates the promoted total', async () => {
  const useCart = await makeCart();
  const grip = catalog.getSalesProductById('grip');
  const balls = catalog.getSalesProductById('pelotas-dunlop');
  useCart().addProduct(grip, 3);
  useCart().addProduct(balls, 6);
  const before = useCart().quantities;
  assert.equal(useCart().deleteProduct(balls), -6);
  assert.equal(Object.hasOwn(useCart().quantities, balls.id), false);
  assert.equal(useCart().quantities.grip, 3);
  assert.equal(before[balls.id], 6);
  assert.equal(catalog.getSalesCartTotal(catalog.SALES_PRODUCTS, useCart().quantities), 8000);
  assert.equal(useCart().deleteProduct(balls), 0);
  useCart().deleteProduct(grip);
  assert.equal(Object.keys(useCart().quantities).length, 0);
  assert.equal(catalog.getSalesCartTotal(catalog.SALES_PRODUCTS, useCart().quantities), 0);
});

test('confirming the player shares the selection across cart views without changing products or prices', async () => {
  const useCart = await makeCart();
  const grip = catalog.getSalesProductById('grip');
  const player = { id: 'player-c', name: 'Alex López', league_id: 'C', league: { name: 'Liga C' } };
  useCart().addProduct(grip, 3);
  const before = useCart();
  useCart().setOrderPlayer(player);
  assert.equal(useCart().orderPlayer.id, 'player-c');
  assert.equal(useCart().orderPlayer.league_id, 'C');
  assert.equal(useCart().quantities, before.quantities);
  assert.equal(before.orderPlayer, null);
  assert.equal(catalog.getSalesCartTotal(catalog.SALES_PRODUCTS, useCart().quantities), 8000);
  useCart().removeProduct(grip);
  assert.equal(useCart().orderPlayer.id, 'player-c');
  useCart().deleteProduct(grip);
  assert.equal(useCart().orderPlayer, null);
});

test('player confirmation rejects missing selections and empty carts', async () => {
  const useCart = await makeCart();
  const player = { id: 'player-b', name: 'Alex López' };
  assert.throws(() => useCart().setOrderPlayer(player), /Agrega un producto/);
  useCart().addProduct(catalog.getSalesProductById('grip'));
  for (const invalid of [null, {}, { name: 'Sin ID' }, { id: 'Sin nombre' }]) {
    assert.throws(() => useCart().setOrderPlayer(invalid), /Selecciona un jugador válido/);
  }
  assert.equal(useCart().orderPlayer, null);
});

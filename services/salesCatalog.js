const STRING_PRODUCTS = [
  {
    id: 'cuerda-babolat-rpm-rough',
    name: 'Cuerda Babolat RPM Rough',
    brand: 'Babolat', gauge: '1,25 mm', color: 'Rojo',
    price: 25000,
    image: require('../assets/images/cuerdas/babolat-25000.jpeg'),
  },
  {
    id: 'cuerda-babolat-rpm-blast',
    name: 'Cuerda Babolat RPM Blast',
    brand: 'Babolat', gauge: '1,25 mm', color: 'Negro',
    price: 25000,
    image: require('../assets/images/cuerdas/babolat-negra-25000.jpeg'),
  },
  {
    id: 'cuerda-dunlop-explosive',
    name: 'Cuerda Dunlop Explosive',
    brand: 'Dunlop', gauge: '1,30 mm', color: 'Gris',
    price: 18000,
    image: require('../assets/images/cuerdas/dunlop-18000.jpeg'),
  },
  {
    id: 'cuerda-kirschbaum-evolution',
    name: 'Cuerda Kirschbaum Evolution',
    brand: 'Kirschbaum', gauge: '1,25 mm', color: 'Azul',
    price: 20000,
    image: require('../assets/images/cuerdas/evolution-20000.jpeg'),
  },
  {
    id: 'cuerda-kirschbaum-pro-line',
    name: 'Cuerda Kirschbaum Pro Line Rough',
    brand: 'Kirschbaum', gauge: '1,25 mm', color: 'Negro',
    price: 22000,
    image: require('../assets/images/cuerdas/kinscherbaum-22000.jpeg'),
  },
  {
    id: 'cuerda-kirschbaum-orange',
    name: 'Cuerda Kirschbaum Orange',
    brand: 'Kirschbaum', gauge: '1,28 mm', color: 'Naranjo',
    price: 16000,
    image: require('../assets/images/cuerdas/kiserbahum-16000.jpeg'),
  },
  {
    id: 'cuerda-yonex-polytour',
    name: 'Cuerda Yonex Polytour Strike',
    brand: 'Yonex', gauge: '1,25 mm', color: 'Gris',
    price: 24000,
    image: require('../assets/images/cuerdas/yonex-24000.jpeg'),
  },
  {
    id: 'cuerda-zons-poly-blast',
    name: 'Cuerda Zons Poly Blast',
    brand: 'Zons', gauge: '1,25 mm', color: 'Amarillo',
    price: 13000,
    image: require('../assets/images/cuerdas/zons-13000.jpeg'),
  },
  {
    id: 'cuerda-zons-polymo-tour',
    name: 'Cuerda Zons Polymo Tour',
    brand: 'Zons', gauge: '1,23 mm', color: 'Violeta',
    price: 14000,
    image: require('../assets/images/cuerdas/zons-14000.jpeg'),
  },
].map((product) => ({
  ...product,
  category: 'cuerdas',
  stock: null,
  description: `${product.name} en color ${product.color.toLowerCase()}, con calibre de ${product.gauge}. El precio incluye el servicio de encordado de tu raqueta.`,
  features: [
    { label: 'Marca', value: product.brand },
    { label: 'Calibre', value: product.gauge },
    { label: 'Color', value: product.color },
  ],
}));

const BALL_BUNDLE_PRICES = [
  { quantity: 2, price: 23000 },
  { quantity: 3, price: 34000 },
  { quantity: 4, price: 43000 },
  { quantity: 6, price: 60000 },
];

const BALL_PRODUCTS = [
  {
    id: 'pelotas-dunlop',
    name: 'Pelotas Dunlop ATP Tour',
    brand: 'Dunlop', model: 'ATP Tour',
    image: require('../assets/images/pelotas/dunlop.jpeg'),
  },
  {
    id: 'pelotas-tecnifibre',
    name: 'Pelotas Tecnifibre X-One',
    brand: 'Tecnifibre', model: 'X-One',
    image: require('../assets/images/pelotas/tecnifibre.jpeg'),
  },
].map((product) => ({
  ...product,
  category: 'pelotas',
  price: 12000,
  bundlePrices: BALL_BUNDLE_PRICES,
  stock: null,
  description: `Pelotas ${product.brand} ${product.model} en presentación de tubo para tus partidos y entrenamientos. Elige la cantidad y aprovecha los precios especiales de este producto.`,
  features: [
    { label: 'Marca', value: product.brand },
    { label: 'Modelo', value: product.model },
    { label: 'Presentación', value: 'Tubo de pelotas' },
  ],
}));

const GRIP_PRODUCT = {
  id: 'grip',
  name: 'Grip',
  category: 'accesorios',
  featured: true,
  price: 3000,
  bundlePrices: [{ quantity: 3, price: 8000 }],
  stock: null,
  image: require('../assets/images/pelotas/grip.jpeg'),
  description: 'Grip blanco para renovar el agarre de tu raqueta. Solicítalo por unidad o en pack de 3, según lo que necesites.',
  features: [
    { label: 'Tipo', value: 'Grip para raqueta de tenis' },
    { label: 'Color', value: 'Blanco' },
    { label: 'Venta', value: 'Por unidad o pack de 3' },
  ],
};

const STRINGING_SERVICE = {
  id: 'servicio-encordado',
  name: 'Servicio de encordado',
  category: 'servicios',
  featured: true,
  price: 6000,
  unit: 'servicio',
  stock: null,
  image: require('../assets/images/cuerdas/servicio_encordado.jpg'),
  description: 'Servicio de encordado para tu raqueta de tenis. Selecciona la cantidad de servicios que necesitas y agrégalos a tu solicitud.',
  features: [
    { label: 'Tipo', value: 'Servicio de encordado' },
    { label: 'Aplicación', value: 'Raqueta de tenis' },
    { label: 'Cobro', value: 'Por servicio' },
  ],
};

export const SALES_PRODUCTS = [GRIP_PRODUCT, STRINGING_SERVICE, ...STRING_PRODUCTS, ...BALL_PRODUCTS];

export const getSalesProductById = (productId) =>
  SALES_PRODUCTS.find((product) => product.id === productId);

export const SALES_FILTERS = [
  { id: 'todos', label: 'Todos', images: [STRING_PRODUCTS[1].image, BALL_PRODUCTS[1].image] },
  { id: 'cuerdas', label: 'Cuerdas', images: [STRING_PRODUCTS[0].image] },
  { id: 'pelotas', label: 'Pelotas', images: [BALL_PRODUCTS[0].image] },
];

// Shuffle copies so filtering and cart updates never reorder the source catalog.
export const getVisibleSalesProducts = (filter = 'todos', random = Math.random) => {
  const matching = SALES_PRODUCTS.filter((product) => filter === 'todos' || product.category === filter);
  const featured = filter === 'todos' ? matching.filter((product) => product.featured) : [];
  const shuffled = matching.filter((product) => !featured.includes(product));

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return [...featured, ...shuffled];
};

export const isSalesStockExhausted = (product, quantity = 0) =>
  Number.isFinite(product.stock) && quantity >= product.stock;

// Find the lowest price for the exact quantity, combining packs of this product.
export const getSalesLineTotal = (product, quantity = 1) => {
  if (!Number.isSafeInteger(quantity) || quantity < 0) {
    throw new RangeError('La cantidad debe ser un entero mayor o igual a cero.');
  }
  if (quantity === 0) return 0;
  if (!Number.isFinite(product.price)) return null;
  if (!product.bundlePrices?.length) return product.price * quantity;

  const totals = [0];
  for (let count = 1; count <= quantity; count += 1) {
    let lowest = totals[count - 1] + product.price;
    for (const bundle of product.bundlePrices) {
      if (bundle.quantity <= count) {
        lowest = Math.min(lowest, totals[count - bundle.quantity] + bundle.price);
      }
    }
    totals.push(lowest);
  }

  return totals[quantity];
};

export const getSalesCartTotal = (products, quantities) => {
  let total = 0;
  for (const product of products) {
    const lineTotal = getSalesLineTotal(product, quantities[product.id] ?? 0);
    if (lineTotal === null) return null;
    total += lineTotal;
  }
  return total;
};

export const formatSalesPrice = (price) =>
  Number.isFinite(price)
    ? '$ ' + String(price).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
    : 'Consultar precio';

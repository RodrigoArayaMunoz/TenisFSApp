export const SAMPLE_PRODUCTS = [
  {
    id: 'wilson-clash',
    name: 'Raqueta Wilson Clash',
    price: 189990,
    stock: 5,
    image: require('../assets/images/sales-racket.png'),
  },
  {
    id: 'wilson-us-open',
    name: 'Pelotas Wilson US Open',
    price: 12990,
    stock: 20,
    image: require('../assets/images/sales-balls.png'),
  },
  {
    id: 'asics-gel-game',
    name: 'Zapatillas Asics Gel-Game',
    price: 84990,
    stock: 8,
    image: require('../assets/images/sales-shoes.png'),
  },
  {
    id: 'nike-dri-fit',
    name: 'Polera Nike Dri-FIT',
    price: 34990,
    stock: 12,
    image: require('../assets/images/sales-polo.png'),
  },
];

export const formatSalesPrice = (price) =>
  '$ ' + String(price).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
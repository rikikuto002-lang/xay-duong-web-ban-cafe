export type Product = {
  id: number;
  name: string;
  category: string;
  price: number;
  stock: number;
  image: string;
  description: string;
};

export const categories = [
  'Tất cả',
  'Cà phê rang xay',
  'Cà phê máy',
  'Trà sữa',
  'Bánh ngọt',
  'Combo'
];

export const initialProducts: Product[] = [
  {
    id: 1,
    name: 'Cà phê đen nóng',
    category: 'Cà phê rang xay',
    price: 45000,
    stock: 20,
    description: 'Hương vị đậm đà, rang xay tự nhiên, phù hợp cho buổi sáng.',
    image: '/images/anh1.jpg'
  },
  {
    id: 2,
    name: 'Cappuccino',
    category: 'Cà phê máy',
    price: 59000,
    stock: 15,
    description: 'Sữa tươi và cà phê espresso hòa quện, lớp bọt sữa mịn.',
    image: '/images/anh2.jpg'
  },
  {
    id: 3,
    name: 'Trà sữa Matcha',
    category: 'Trà sữa',
    price: 65000,
    stock: 18,
    description: 'Trà matcha nguyên chất, thơm mùi cỏ, vị ngọt dịu.',
    image: '/images/anh3.jpg'
  },
  {
    id: 4,
    name: 'Bánh Croissant',
    category: 'Bánh ngọt',
    price: 35000,
    stock: 12,
    description: 'Bánh lớp sữa, giòn ngoài, mềm trong, ăn kèm cà phê rất hợp.',
    image: '/images/anh4.jpg'
  },
  {
    id: 5,
    name: 'Combo Cafe Sáng',
    category: 'Combo',
    price: 99000,
    stock: 10,
    description: 'Combo 2 ly cà phê + 1 bánh ngọt cho buổi sáng sảng khoái.',
    image: '/images/hero-cafe.png'
  }
];

export const bankTransferInfo = {
  bankName: 'Vietcombank',
  accountName: 'Cafe Commerce Co., Ltd',
  accountNumber: '1023456789',
  qrLink: 'https://images.unsplash.com/photo-1556740749-887f6717d7e4?auto=format&fit=crop&w=500&q=80'
};

export const adminRoles = ['guest', 'customer', 'admin'] as const;

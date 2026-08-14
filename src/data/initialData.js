export const INITIAL_PRODUCTS = [
  {
    id: 'prod-201',
    sku: 'CLN-LIQ-DET-2L',
    name: 'Liquid Detergent 2L',
    category: 'Laundry & Cleaning',
    costPrice: 280,
    sellingPrice: 420,
    currentStock: 45,
    icon: '🧴',
    color: '#0ea5e9',
    description: 'High-efficiency liquid laundry detergent with fresh scent.',
    badge: 'Popular',
    imageUrl: 'https://picsum.photos/seed/det2l/400/300.webp'
  },
  {
    id: 'prod-202',
    sku: 'CLN-SOL-DET-BAR',
    name: 'Solid Detergent',
    category: 'Laundry & Cleaning',
    costPrice: 80,
    sellingPrice: 140,
    currentStock: 60,
    icon: '🧼',
    color: '#3b82f6',
    description: 'Multi-purpose solid cleaning detergent bar (Pack of 4).',
    badge: '',
    imageUrl: 'https://picsum.photos/seed/detbar/400/300.webp'
  },
  {
    id: 'prod-203',
    sku: 'CLN-BLEACH-1L',
    name: 'Bleach 1L',
    category: 'Laundry & Cleaning',
    costPrice: 90,
    sellingPrice: 160,
    currentStock: 30,
    icon: '🧪',
    color: '#6366f1',
    description: 'Multi-surface disinfectant & fabric whitening bleach.',
    badge: '',
    imageUrl: 'https://picsum.photos/seed/bleach/400/300.webp'
  },
  {
    id: 'prod-204',
    sku: 'PC-ABAYA-SHMP',
    name: 'Abaya Shampoo 1.5L',
    category: 'Personal Care',
    costPrice: 220,
    sellingPrice: 380,
    currentStock: 25,
    icon: '🧴',
    color: '#8b5cf6',
    description: 'Specialized gentle fabric wash for dark garments & abayas.',
    badge: 'Top Seller',
    imageUrl: 'https://picsum.photos/seed/abaya/400/300.webp'
  },
  {
    id: 'prod-205',
    sku: 'PC-HAIR-SHMP-500',
    name: 'Hair Shampoo 500ml',
    category: 'Hair Care',
    costPrice: 150,
    sellingPrice: 260,
    currentStock: 35,
    icon: '🧼',
    color: '#ec4899',
    description: 'Nourishing herbal hair shampoo for smooth shine.',
    badge: '',
    imageUrl: 'https://picsum.photos/seed/shmp/400/300.webp'
  },
  {
    id: 'prod-206',
    sku: 'PC-HAIR-COND-500',
    name: 'Hair Conditioner 500ml',
    category: 'Hair Care',
    costPrice: 160,
    sellingPrice: 280,
    currentStock: 28,
    icon: '🧴',
    color: '#f43f5e',
    description: 'Deep moisture hair conditioning cream.',
    badge: '',
    imageUrl: 'https://picsum.photos/seed/cond/400/300.webp'
  },
  {
    id: 'prod-207',
    sku: 'CLN-FAB-SOFT-2L',
    name: 'Fabric Softener 2L',
    category: 'Laundry & Cleaning',
    costPrice: 210,
    sellingPrice: 350,
    currentStock: 20,
    icon: '🌸',
    color: '#10b981',
    description: 'Long-lasting floral fresh fabric softener.',
    badge: '',
    imageUrl: 'https://picsum.photos/seed/soft/400/300.webp'
  },
  {
    id: 'prod-208',
    sku: 'TOOLS-BROOM-HD',
    name: 'Cleaning Broom',
    category: 'Cleaning Tools',
    costPrice: 120,
    sellingPrice: 220,
    currentStock: 15,
    icon: '🧹',
    color: '#f59e0b',
    description: 'Heavy-duty indoor & outdoor floor broom.',
    badge: '',
    imageUrl: 'https://picsum.photos/seed/broom/400/300.webp'
  },
  {
    id: 'prod-209',
    sku: 'TOOLS-BUCKET-15L',
    name: 'Cleaning Bucket 15L',
    category: 'Cleaning Tools',
    costPrice: 180,
    sellingPrice: 320,
    currentStock: 18,
    icon: '🪣',
    color: '#06b6d4',
    description: 'Durable plastic cleaning bucket with sturdy handle.',
    badge: '',
    imageUrl: 'https://picsum.photos/seed/bucket/400/300.webp'
  },
  {
    id: 'prod-210',
    sku: 'TOOLS-GARBAGE-BSK',
    name: 'Garbage Basket',
    category: 'Cleaning Tools',
    costPrice: 110,
    sellingPrice: 200,
    currentStock: 4, // Low stock <= 5 alert!
    icon: '🧺',
    color: '#ef4444',
    description: 'Ventilated mesh plastic waste basket.',
    badge: 'Low Stock',
    imageUrl: 'https://picsum.photos/seed/bsk/400/300.webp'
  },
  {
    id: 'prod-211',
    sku: 'PC-HAIR-FOOD-250',
    name: 'Hair Food 250g',
    category: 'Hair Care',
    costPrice: 130,
    sellingPrice: 240,
    currentStock: 40,
    icon: '🫙',
    color: '#84cc16',
    description: 'Rich essential oil hair food for scalp nourishment.',
    badge: '',
    imageUrl: 'https://picsum.photos/seed/food/400/300.webp'
  }
];

const getIsoDate = (daysAgo, hours = 10, minutes = 30) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hours, minutes, 0, 0);
  return d.toISOString();
};

export const INITIAL_TRANSACTIONS = [
  {
    id: 'TXN-4011',
    timestamp: getIsoDate(0, 9, 15),
    paymentMethod: 'Telebirr',
    items: [
      { id: 'prod-201', name: 'Liquid Detergent 2L', quantity: 2, costPrice: 280, sellingPrice: 420 },
      { id: 'prod-207', name: 'Fabric Softener 2L', quantity: 1, costPrice: 210, sellingPrice: 350 }
    ],
    totalRevenue: 1190,
    totalProfit: 420
  },
  {
    id: 'TXN-4012',
    timestamp: getIsoDate(0, 11, 45),
    paymentMethod: 'Cash',
    items: [
      { id: 'prod-205', name: 'Hair Shampoo 500ml', quantity: 1, costPrice: 150, sellingPrice: 260 },
      { id: 'prod-206', name: 'Hair Conditioner 500ml', quantity: 1, costPrice: 160, sellingPrice: 280 },
      { id: 'prod-211', name: 'Hair Food 250g', quantity: 1, costPrice: 130, sellingPrice: 240 }
    ],
    totalRevenue: 780,
    totalProfit: 340
  },
  {
    id: 'TXN-4008',
    timestamp: getIsoDate(4, 14, 20),
    paymentMethod: 'Bank',
    items: [
      { id: 'prod-204', name: 'Abaya Shampoo 1.5L', quantity: 2, costPrice: 220, sellingPrice: 380 },
      { id: 'prod-203', name: 'Bleach 1L', quantity: 2, costPrice: 90, sellingPrice: 160 }
    ],
    totalRevenue: 1080,
    totalProfit: 460
  },
  {
    id: 'TXN-4007',
    timestamp: getIsoDate(7, 16, 10),
    paymentMethod: 'Telebirr',
    items: [
      { id: 'prod-208', name: 'Cleaning Broom', quantity: 2, costPrice: 120, sellingPrice: 220 },
      { id: 'prod-209', name: 'Cleaning Bucket 15L', quantity: 1, costPrice: 180, sellingPrice: 320 }
    ],
    totalRevenue: 760,
    totalProfit: 340
  },
  {
    id: 'TXN-3995',
    timestamp: getIsoDate(35, 10, 0),
    paymentMethod: 'Cash',
    items: [
      { id: 'prod-202', name: 'Solid Detergent', quantity: 5, costPrice: 80, sellingPrice: 140 },
      { id: 'prod-210', name: 'Garbage Basket', quantity: 2, costPrice: 110, sellingPrice: 200 }
    ],
    totalRevenue: 1100,
    totalProfit: 480
  }
];

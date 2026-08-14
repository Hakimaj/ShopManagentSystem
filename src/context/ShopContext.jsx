import React, { createContext, useContext, useState, useEffect } from 'react';
import { INITIAL_PRODUCTS, INITIAL_TRANSACTIONS } from '../data/initialData';

const ShopContext = createContext();

export const useShop = () => {
  const context = useContext(ShopContext);
  if (!context) {
    throw new Error('useShop must be used within a ShopProvider');
  }
  return context;
};

export const ShopProvider = ({ children }) => {
  // Initialize state with local storage fallback or mock defaults
  const [products, setProducts] = useState(() => {
    const saved = localStorage.getItem('antishop_products');
    return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
  });

  const [transactions, setTransactions] = useState(() => {
    const saved = localStorage.getItem('antishop_transactions');
    return saved ? JSON.parse(saved) : INITIAL_TRANSACTIONS;
  });

  const [cart, setCart] = useState([]);
  const [activeTab, setActiveTab] = useState('pos'); // 'pos' | 'inventory' | 'dashboard'
  const [theme, setTheme] = useState('light');
  const [lastTransaction, setLastTransaction] = useState(null);
  const [isTxnModalOpen, setIsTxnModalOpen] = useState(false);
  
  const [customCategories, setCustomCategories] = useState(() => {
    const saved = localStorage.getItem('antishop_categories');
    return saved ? JSON.parse(saved) : [];
  });

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem('antishop_products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem('antishop_transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('antishop_categories', JSON.stringify(customCategories));
  }, [customCategories]);

  // Dark / Light Theme Sync
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Cart operations
  const addToCart = (product) => {
    const liveProduct = products.find((p) => p.id === product.id);
    if (!liveProduct || liveProduct.currentStock <= 0) return false;

    setCart((prevCart) => {
      const existingIndex = prevCart.findIndex((item) => item.product.id === product.id);
      if (existingIndex > -1) {
        const currentQty = prevCart[existingIndex].quantity;
        if (currentQty >= liveProduct.currentStock) {
          return prevCart; // Don't exceed stock
        }
        const updated = [...prevCart];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + 1
        };
        return updated;
      } else {
        return [...prevCart, { product: liveProduct, quantity: 1, soldPrice: liveProduct.sellingPrice }];
      }
    });
    return true;
  };

  const updateCartQuantity = (productId, delta) => {
    const liveProduct = products.find((p) => p.id === productId);
    setCart((prevCart) => {
      return prevCart
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            if (liveProduct && newQty > liveProduct.currentStock) return item; // Stock limit
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter(Boolean);
    });
  };

  const removeFromCart = (productId) => {
    setCart((prevCart) => prevCart.filter((item) => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
  };

  const updateCartItemPrice = (productId, newPrice) => {
    setCart((prevCart) => prevCart.map((item) => {
      if (item.product.id === productId) {
        return { ...item, soldPrice: Number(newPrice) };
      }
      return item;
    }));
  };

  // Checkout Processing
  const processCheckout = (paymentMethod) => {
    if (cart.length === 0) return { success: false, error: 'Cart is empty' };

    // Validate payment method (strict: Bank, Telebirr, Cash)
    const validMethods = ['Bank', 'Telebirr', 'Cash'];
    if (!validMethods.includes(paymentMethod)) {
      return { success: false, error: 'Invalid payment method selected' };
    }

    // Verify stock availability
    for (const item of cart) {
      const prod = products.find((p) => p.id === item.product.id);
      if (!prod || prod.currentStock < item.quantity) {
        return {
          success: false,
          error: `Insufficient stock for "${item.product.name}". Available: ${prod ? prod.currentStock : 0}`
        };
      }
    }

    // Deduct quantities from products state
    const updatedProducts = products.map((prod) => {
      const cartItem = cart.find((item) => item.product.id === prod.id);
      if (cartItem) {
        return {
          ...prod,
          currentStock: prod.currentStock - cartItem.quantity
        };
      }
      return prod;
    });

    // Calculate revenue & profit
    let totalRevenue = 0;
    let totalProfit = 0;

    const itemsSummary = cart.map((item) => {
      const lineRevenue = item.soldPrice * item.quantity;
      const lineCost = item.product.costPrice * item.quantity;
      const lineProfit = lineRevenue - lineCost;

      totalRevenue += lineRevenue;
      totalProfit += lineProfit;

      return {
        id: item.product.id,
        name: item.product.name,
        quantity: item.quantity,
        costPrice: item.product.costPrice,
        sellingPrice: item.soldPrice
      };
    });

    const newTransaction = {
      id: `TXN-${Math.floor(1000 + Math.random() * 9000)}`,
      timestamp: new Date().toISOString(),
      paymentMethod,
      items: itemsSummary,
      totalRevenue,
      totalProfit
    };

    setProducts(updatedProducts);
    setTransactions((prev) => [newTransaction, ...prev]);
    setCart([]);
    setLastTransaction(newTransaction);
    setIsTxnModalOpen(true);

    return { success: true, transaction: newTransaction };
  };

  // Inventory modifications
  const addProduct = (newProd) => {
    const prod = {
      ...newProd,
      id: `prod-${Date.now()}`,
      costPrice: Number(newProd.costPrice),
      sellingPrice: Number(newProd.sellingPrice),
      currentStock: Number(newProd.currentStock)
    };
    setProducts((prev) => [prod, ...prev]);
  };

  const updateProduct = (id, updatedFields) => {
    setProducts((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              ...updatedFields,
              costPrice: Number(updatedFields.costPrice ?? p.costPrice),
              sellingPrice: Number(updatedFields.sellingPrice ?? p.sellingPrice),
              currentStock: Number(updatedFields.currentStock ?? p.currentStock)
            }
          : p
      )
    );
  };

  const resetToDefaults = () => {
    setProducts(INITIAL_PRODUCTS);
    setTransactions(INITIAL_TRANSACTIONS);
    setCustomCategories([]);
    setCart([]);
    localStorage.removeItem('antishop_products');
    localStorage.removeItem('antishop_transactions');
    localStorage.removeItem('antishop_categories');
  };

  const addCategory = (categoryName) => {
    if (!customCategories.includes(categoryName)) {
      setCustomCategories((prev) => [...prev, categoryName]);
    }
  };

  // Remove a product from inventory
  const removeProduct = (productId) => {
    setProducts((prev) => prev.filter((p) => p.id !== productId));
  };

  // Calculated metrics
  const totalRevenue = transactions.reduce((acc, t) => acc + t.totalRevenue, 0);
  const totalProfit = transactions.reduce((acc, t) => acc + t.totalProfit, 0);
  const totalItemsSold = transactions.reduce(
    (acc, t) => acc + t.items.reduce((iAcc, item) => iAcc + item.quantity, 0),
    0
  );

  return (
    <ShopContext.Provider
        value={{
          products,
          transactions,
          cart,
          activeTab,
          setActiveTab,
          customCategories,
          addCategory,
          removeProduct,
          theme,
          toggleTheme,
          addToCart,
          updateCartQuantity,
          updateCartItemPrice,
          removeFromCart,
          clearCart,
          processCheckout,
          addProduct,
          updateProduct,
          resetToDefaults,
          lastTransaction,
          isTxnModalOpen,
          setIsTxnModalOpen,
          totalRevenue,
          totalProfit,
          totalItemsSold
        }}
    >
      {children}
    </ShopContext.Provider>
  );
};

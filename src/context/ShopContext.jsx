import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { productsApi } from '../services/productsApi';
import { categoriesApi } from '../services/categoriesApi';
import { transactionsApi } from '../services/transactionsApi';

const ShopContext = createContext();

export const useShop = () => {
  const context = useContext(ShopContext);
  if (!context) {
    throw new Error('useShop must be used within a ShopProvider');
  }
  return context;
};

// Normalize backend product → frontend shape
// In production (Vercel) frontend and backend share the same origin, so BACKEND_URL is ''.
// In local dev, set VITE_BACKEND_URL=http://localhost:8000 in .env for the proxy to work.
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? '';

const normalizeProduct = (p) => {
  let img = p.image_url || '';
  if (img && img.startsWith('/static/')) {
    img = `${BACKEND_URL}${img}`;
  }
  return {
    id: p.id,
    sku: p.sku,
    name: p.name,
    category_id: p.category_id,
    category: p.category?.name || 'General',
    costPrice: Number(p.cost_price),
    sellingPrice: Number(p.selling_price),
    currentStock: Number(p.current_stock),
    description: p.description || '',
    imageUrl: img,
    is_active: p.is_active
  };
};

const normalizeTxn = (t) => ({
  id: t.id,
  timestamp: t.timestamp,
  paymentMethod: t.payment_method,
  totalRevenue: Number(t.total_revenue),
  totalProfit: Number(t.total_profit),
  items: t.items.map((i) => ({
    id: i.product_id,
    name: i.product_name,
    quantity: i.quantity,
    costPrice: Number(i.cost_price),
    sellingPrice: Number(i.selling_price)
  }))
});

export const ShopProvider = ({ children }) => {
  const [products, setProducts] = useState([]);
  const [categoriesList, setCategoriesList] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [cart, setCart] = useState([]);
  const [activeTab, setActiveTab] = useState('pos');
  const [theme, setTheme] = useState(() => localStorage.getItem('antishop_theme') || 'light');
  const [lastTransaction, setLastTransaction] = useState(null);
  const [isTxnModalOpen, setIsTxnModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState(null);

  // Persist theme preference (not business data)
  useEffect(() => {
    localStorage.setItem('antishop_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));

  // Fetch all catalog, category, and transaction data from backend
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setApiError(null);
    try {
      const [prodRes, catRes, txnRes] = await Promise.allSettled([
        productsApi.list({ size: 100, is_active: true }),
        categoriesApi.list(),
        transactionsApi.list({ size: 100 })
      ]);

      if (prodRes.status === 'fulfilled' && prodRes.value?.items) {
        setProducts(prodRes.value.items.map(normalizeProduct));
      } else if (prodRes.status === 'rejected') {
        throw prodRes.reason;
      }

      if (catRes.status === 'fulfilled' && Array.isArray(catRes.value)) {
        setCategoriesList(catRes.value);
      }

      if (txnRes.status === 'fulfilled' && txnRes.value?.items) {
        setTransactions(txnRes.value.items.map(normalizeTxn));
      }
    } catch (err) {
      // Only set error if it's not an auth error (401 handled globally)
      if (err.status !== 401) {
        setApiError(err.message || 'Failed to connect to backend');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ─── Cart Operations ───────────────────────────────────────────────────────

  const addToCart = (product) => {
    const liveProduct = products.find((p) => p.id === product.id);
    if (!liveProduct || liveProduct.currentStock <= 0) return false;

    setCart((prevCart) => {
      const existingIndex = prevCart.findIndex((item) => item.product.id === product.id);
      if (existingIndex > -1) {
        const currentQty = prevCart[existingIndex].quantity;
        if (currentQty >= liveProduct.currentStock) return prevCart;
        const updated = [...prevCart];
        updated[existingIndex] = { ...updated[existingIndex], quantity: updated[existingIndex].quantity + 1 };
        return updated;
      }
      return [...prevCart, { product: liveProduct, quantity: 1, soldPrice: liveProduct.sellingPrice }];
    });
    return true;
  };

  const updateCartQuantity = (productId, delta) => {
    const liveProduct = products.find((p) => p.id === productId);
    setCart((prevCart) =>
      prevCart
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            if (liveProduct && newQty > liveProduct.currentStock) return item;
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  const removeFromCart = (productId) => setCart((prev) => prev.filter((i) => i.product.id !== productId));
  const clearCart = () => setCart([]);

  const updateCartItemPrice = (productId, newPrice) =>
    setCart((prev) => prev.map((item) => (item.product.id === productId ? { ...item, soldPrice: Number(newPrice) } : item)));

  // ─── POS Checkout (backend authoritative) ────────────────────────────────

  const processCheckout = async (paymentMethod) => {
    if (cart.length === 0) return { success: false, error: 'Cart is empty' };

    const validMethods = ['Bank', 'Telebirr', 'Cash'];
    if (!validMethods.includes(paymentMethod)) {
      return { success: false, error: 'Invalid payment method selected' };
    }

    const payload = {
      payment_method: paymentMethod,
      items: cart.map((item) => ({
        product_id: item.product.id,
        quantity: item.quantity,
        sold_price: item.soldPrice
      }))
    };

    try {
      const response = await transactionsApi.checkout(payload);
      const normalizedTxn = normalizeTxn(response);

      setTransactions((prev) => [normalizedTxn, ...prev]);
      setLastTransaction(normalizedTxn);
      setCart([]);
      setIsTxnModalOpen(true);

      // Refresh products to reflect updated stock
      const prodRes = await productsApi.list({ size: 100, is_active: true });
      if (prodRes?.items) setProducts(prodRes.items.map(normalizeProduct));

      return { success: true, transaction: normalizedTxn };
    } catch (err) {
      return { success: false, error: err.message || 'Checkout failed' };
    }
  };

  // ─── Inventory Operations ─────────────────────────────────────────────────

  const addProduct = async (newProd) => {
    let categoryId = newProd.category_id;
    if (!categoryId) {
      const cat = categoriesList.find((c) => c.name === newProd.category);
      if (cat) {
        categoryId = cat.id;
      } else if (categoriesList.length > 0) {
        categoryId = categoriesList[0].id;
      } else {
        const created = await categoriesApi.create(newProd.category || 'General');
        setCategoriesList((prev) => [...prev, created]);
        categoryId = created.id;
      }
    }
    const payload = {
      sku: newProd.sku,
      name: newProd.name,
      category_id: categoryId,
      cost_price: Number(newProd.costPrice),
      selling_price: Number(newProd.sellingPrice),
      current_stock: Number(newProd.currentStock),
      description: newProd.description || '',
      image_url: newProd.imageUrl || '',
      is_active: true
    };
    const created = await productsApi.create(payload);
    const normalized = normalizeProduct(created);
    setProducts((prev) => [normalized, ...prev]);
    return normalized;
  };

  const updateProduct = async (id, updatedFields) => {
    let categoryId = updatedFields.category_id;
    if (!categoryId && updatedFields.category) {
      const cat = categoriesList.find((c) => c.name === updatedFields.category);
      if (cat) categoryId = cat.id;
    }
    const payload = {
      sku: updatedFields.sku,
      name: updatedFields.name,
      category_id: categoryId,
      cost_price: updatedFields.costPrice !== undefined ? Number(updatedFields.costPrice) : undefined,
      selling_price: updatedFields.sellingPrice !== undefined ? Number(updatedFields.sellingPrice) : undefined,
      current_stock: updatedFields.currentStock !== undefined ? Number(updatedFields.currentStock) : undefined,
      description: updatedFields.description,
      image_url: updatedFields.imageUrl
    };
    const updated = await productsApi.update(id, payload);
    const normalized = normalizeProduct(updated);
    setProducts((prev) => prev.map((p) => (p.id === id ? normalized : p)));
    return normalized;
  };

  const adjustStock = async (id, newStock) => {
    const updated = await productsApi.adjustStock(id, newStock);
    const normalized = normalizeProduct(updated);
    setProducts((prev) => prev.map((p) => (p.id === id ? normalized : p)));
    return normalized;
  };

  const removeProduct = async (productId) => {
    await productsApi.delete(productId);
    setProducts((prev) => prev.filter((p) => p.id !== productId));
  };

  const addCategory = async (categoryName) => {
    const created = await categoriesApi.create(categoryName);
    setCategoriesList((prev) => [...prev, created]);
    return created;
  };

  const deleteCategory = async (categoryIdentifier) => {
    // If it's a number (ID), delete by ID. If string (name), find the category object first.
    let catObj = null;
    if (typeof categoryIdentifier === 'number') {
      catObj = categoriesList.find((c) => c.id === categoryIdentifier);
    } else {
      catObj = categoriesList.find((c) => c.name.toLowerCase() === String(categoryIdentifier).toLowerCase());
    }

    if (catObj) {
      try {
        await categoriesApi.delete(catObj.id);
      } catch (err) {
        console.warn('API category delete note:', err.message);
      }
      setCategoriesList((prev) => prev.filter((c) => c.id !== catObj.id));
    } else {
      setCategoriesList((prev) => prev.filter((c) => c.name.toLowerCase() !== String(categoryIdentifier).toLowerCase()));
    }
  };

  const customCategories = categoriesList.map((c) => c.name);

  return (
    <ShopContext.Provider
      value={{
        products,
        categoriesList,
        customCategories,
        transactions,
        cart,
        activeTab,
        setActiveTab,
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
        adjustStock,
        removeProduct,
        addCategory,
        deleteCategory,
        loadData,
        lastTransaction,
        isTxnModalOpen,
        setIsTxnModalOpen,
        isLoading,
        apiError
      }}
    >
      {children}
    </ShopContext.Provider>
  );
};

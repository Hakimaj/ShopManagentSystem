import React, { useState, useEffect, useRef } from 'react';
import { useShop } from '../context/ShopContext';
import { X, Save, ImagePlus, Check, Upload, Camera, Link as LinkIcon, Trash2 } from 'lucide-react';

export const ProductModal = ({ isOpen, onClose, product }) => {
  const { addProduct, updateProduct, customCategories, products } = useShop();
  const allCategories = ['Laundry & Cleaning', 'Personal Care', 'Hair Care', 'Cleaning Tools', 'General', ...new Set([...products.map((p) => p.category), ...(customCategories || [])])];
  const uniqueCategories = [...new Set(allCategories)];

  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState('');

  const [showImageSourceMenu, setShowImageSourceMenu] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInput, setUrlInput] = useState('');

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    category: 'Laundry & Cleaning',
    costPrice: '',
    sellingPrice: '',
    currentStock: '',
    description: '',
    imageUrl: ''
  });

  useEffect(() => {
    if (product) {
      setFormData({
        sku: product.sku || '',
        name: product.name || '',
        category: product.category || 'Laundry & Cleaning',
        costPrice: product.costPrice || '',
        sellingPrice: product.sellingPrice || '',
        currentStock: product.currentStock || '',
        description: product.description || '',
        imageUrl: product.imageUrl || ''
      });
    } else {
      setFormData({
        sku: `CLN-${Math.floor(100 + Math.random() * 900)}`,
        name: '',
        category: 'Laundry & Cleaning',
        costPrice: '',
        sellingPrice: '',
        currentStock: '15',
        description: '',
        imageUrl: ''
      });
    }
  }, [product, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'category' && value === '+ Add New Category') {
      setIsAddingCategory(true);
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSaveCategory = () => {
    if (newCategoryInput.trim()) {
      addCategory(newCategoryInput.trim());
      setFormData((prev) => ({ ...prev, category: newCategoryInput.trim() }));
      setIsAddingCategory(false);
      setNewCategoryInput('');
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({ ...prev, imageUrl: reader.result }));
        setShowImageSourceMenu(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleApplyUrl = () => {
    if (urlInput.trim()) {
      setFormData((prev) => ({ ...prev, imageUrl: urlInput.trim() }));
      setShowUrlInput(false);
      setUrlInput('');
      setShowImageSourceMenu(false);
    }
  };

  const clearImage = () => {
    setFormData((prev) => ({ ...prev, imageUrl: '' }));
    setShowImageSourceMenu(false);
    setShowUrlInput(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.costPrice || !formData.sellingPrice) return;

    if (product) {
      updateProduct(product.id, formData);
    } else {
      addProduct(formData);
    }

    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            {product ? 'Edit Inventory Item' : 'Add New Cleaning/Care Product'}
          </div>
          <button
            className="icon-btn"
            onClick={onClose}
            style={{ border: 'none', background: 'transparent' }}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* Hidden Inputs */}
            <input type="file" accept="image/*" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileChange} />
            <input type="file" accept="image/*" capture="environment" ref={cameraInputRef} style={{ display: 'none' }} onChange={handleFileChange} />

            {/* Image Preview Container */}
            <div style={{ marginBottom: '1rem', width: '100%', height: '180px', borderRadius: '12px', background: 'var(--bg-main)', border: '2px dashed var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>
              {formData.imageUrl ? (
                <>
                  <img src={formData.imageUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', bottom: '10px', right: '10px', display: 'flex', gap: '0.5rem' }}>
                    <button type="button" onClick={() => setShowImageSourceMenu(!showImageSourceMenu)} style={{ background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '8px', padding: '0.4rem 0.8rem', cursor: 'pointer', fontSize: '0.8rem' }}>
                      Change
                    </button>
                    <button type="button" onClick={clearImage} style={{ background: 'rgba(220,38,38,0.8)', color: 'white', border: 'none', borderRadius: '8px', padding: '0.4rem 0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                  {showUrlInput ? (
                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', background: 'var(--bg-card)', padding: '0.5rem', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                      <input type="text" className="form-input" placeholder="Paste image URL..." value={urlInput} onChange={(e) => setUrlInput(e.target.value)} autoFocus style={{ width: '200px' }} />
                      <button type="button" className="btn-primary" onClick={handleApplyUrl} style={{ padding: '0.4rem 0.8rem' }}>Apply</button>
                      <button type="button" className="icon-btn" onClick={() => setShowUrlInput(false)} style={{ background: 'transparent', border: 'none' }}><X size={16} /></button>
                    </div>
                  ) : (
                    <>
                      <button type="button" onClick={() => setShowImageSourceMenu(!showImageSourceMenu)} className="icon-btn" style={{ background: 'var(--accent-primary)', color: '#fff', width: '48px', height: '48px' }}>
                        <ImagePlus size={24} />
                      </button>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Click to add image</span>
                    </>
                  )}
                </div>
              )}

              {/* Source Selector Dropdown */}
              {showImageSourceMenu && !showUrlInput && (
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'var(--bg-card)', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid var(--border-color)', zIndex: 10 }}>
                  <button type="button" onClick={() => fileInputRef.current.click()} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', borderBottom: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
                    <Upload size={16} /> Upload File
                  </button>
                  <button type="button" onClick={() => cameraInputRef.current.click()} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', borderBottom: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
                    <Camera size={16} /> Take Picture
                  </button>
                  <button type="button" onClick={() => { setShowUrlInput(true); setShowImageSourceMenu(false); }} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', color: 'var(--text-primary)' }}>
                    <LinkIcon size={16} /> Image URL
                  </button>
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label">SKU Code</label>
                <input
                  type="text"
                  name="sku"
                  className="form-input"
                  value={formData.sku}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Category</label>
                {isAddingCategory ? (
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <input
                      type="text"
                      className="form-input"
                      value={newCategoryInput}
                      onChange={(e) => setNewCategoryInput(e.target.value)}
                      placeholder="New Category..."
                      autoFocus
                    />
                    <button type="button" className="btn-secondary" onClick={handleSaveCategory} style={{ padding: '0.4rem 0.6rem' }}>
                      <Check size={16} />
                    </button>
                    <button type="button" className="icon-btn" onClick={() => setIsAddingCategory(false)} style={{ background: 'transparent', border: 'none' }}>
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <select
                    name="category"
                    className="form-input"
                    value={formData.category}
                    onChange={handleChange}
                  >
                    <option value="+ Add New Category" style={{ fontWeight: 'bold', color: 'var(--accent-primary)' }}>+ Add New Category</option>
                    {uniqueCategories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Product Name</label>
              <input
                type="text"
                name="name"
                className="form-input"
                placeholder="e.g. Abaya Shampoo 1.5L"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label">Cost Price (ETB)</label>
                <input
                  type="number"
                  name="costPrice"
                  className="form-input"
                  placeholder="0"
                  value={formData.costPrice}
                  onChange={handleChange}
                  required
                  min="0"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Selling Price (ETB)</label>
                <input
                  type="number"
                  name="sellingPrice"
                  className="form-input"
                  placeholder="0"
                  value={formData.sellingPrice}
                  onChange={handleChange}
                  required
                  min="0"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Stock Quantity</label>
                <input
                  type="number"
                  name="currentStock"
                  className="form-input"
                  placeholder="0"
                  value={formData.currentStock}
                  onChange={handleChange}
                  required
                  min="0"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Description (Optional)</label>
              <textarea
                name="description"
                className="form-input"
                rows="2"
                placeholder="Item size, fragrance, or usage details..."
                value={formData.description}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Save size={16} />
              <span>{product ? 'Update Product' : 'Save Product'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import { useShop } from '../context/ShopContext';
import { uploadsApi } from '../services/uploadsApi';
import { X, Save, ImagePlus, Check, Upload, Camera, Link as LinkIcon, Trash2, AlertCircle, ChevronDown, Plus } from 'lucide-react';

export const ProductModal = ({ isOpen, onClose, product }) => {
  const { addProduct, updateProduct, customCategories, addCategory, deleteCategory } = useShop();

  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [showImageSourceMenu, setShowImageSourceMenu] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const dropdownRef = useRef(null);

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

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsCategoryDropdownOpen(false);
      }
    };
    if (isCategoryDropdownOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isCategoryDropdownOpen]);

  useEffect(() => {
    setFormError('');
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
        category: customCategories?.[0] || 'Laundry & Cleaning',
        costPrice: '',
        sellingPrice: '',
        currentStock: '15',
        description: '',
        imageUrl: ''
      });
    }
  }, [product, isOpen, customCategories]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'category' && value === '+ Add New Category') {
      setIsAddingCategory(true);
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSaveCategory = async () => {
    if (newCategoryInput.trim()) {
      try {
        await addCategory(newCategoryInput.trim());
        setFormData((prev) => ({ ...prev, category: newCategoryInput.trim() }));
        setIsAddingCategory(false);
        setNewCategoryInput('');
      } catch (err) {
        setFormError(err.message || 'Failed to create category');
      }
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        setFormError('');
        const uploadRes = await uploadsApi.uploadImage(file);
        const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';
        setFormData((prev) => ({ ...prev, imageUrl: `${BACKEND_URL}${uploadRes.url}` }));
        setShowImageSourceMenu(false);
      } catch (err) {
        setFormError(err.message || 'Failed to upload image');
      }
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!formData.name || !formData.costPrice || !formData.sellingPrice) {
      setFormError('Please fill in all required fields.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (product) {
        await updateProduct(product.id, formData);
      } else {
        await addProduct(formData);
      }
      onClose();
    } catch (err) {
      setFormError(err.message || 'Failed to save product.');
    } finally {
      setIsSubmitting(false);
    }
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
            {formError && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  background: 'var(--danger-bg)',
                  color: 'var(--danger)',
                  padding: '0.6rem 0.8rem',
                  borderRadius: '8px',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  marginBottom: '1rem'
                }}
              >
                <AlertCircle size={16} />
                <span>{formError}</span>
              </div>
            )}

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

              <div className="form-group" style={{ position: 'relative' }} ref={dropdownRef}>
                <label className="form-label">Category</label>
                {isAddingCategory ? (
                  <div style={{ display: 'flex', gap: '0.3rem' }}>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="New Category..."
                      value={newCategoryInput}
                      onChange={(e) => setNewCategoryInput(e.target.value)}
                      autoFocus
                    />
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={handleSaveCategory}
                      style={{ padding: '0 0.6rem' }}
                    >
                      <Check size={16} />
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setIsAddingCategory(false)}
                      style={{ padding: '0 0.6rem' }}
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div>
                    {/* Custom Dropdown Trigger Button */}
                    <div
                      onClick={() => setIsCategoryDropdownOpen((prev) => !prev)}
                      className="form-input"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        userSelect: 'none',
                        background: 'var(--bg-card)'
                      }}
                    >
                      <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {formData.category || 'Select Category'}
                      </span>
                      <ChevronDown
                        size={16}
                        style={{
                          color: 'var(--text-muted)',
                          transform: isCategoryDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform 0.2s ease',
                          flexShrink: 0
                        }}
                      />
                    </div>

                    {/* Custom Dropdown List */}
                    {isCategoryDropdownOpen && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          right: 0,
                          marginTop: '4px',
                          background: 'var(--bg-card)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '8px',
                          boxShadow: 'var(--shadow-lg)',
                          maxHeight: '220px',
                          overflowY: 'auto',
                          zIndex: 100,
                          padding: '0.35rem 0'
                        }}
                      >
                        {customCategories.map((cat) => (
                          <div
                            key={cat}
                            onClick={() => {
                              setFormData((prev) => ({ ...prev, category: cat }));
                              setIsCategoryDropdownOpen(false);
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '0.55rem 0.85rem',
                              cursor: 'pointer',
                              fontSize: '0.86rem',
                              fontWeight: formData.category === cat ? 700 : 500,
                              color: formData.category === cat ? 'var(--accent-primary)' : 'var(--text-primary)',
                              background: formData.category === cat ? 'var(--accent-glow)' : 'transparent',
                              transition: 'background 0.15s ease'
                            }}
                            onMouseEnter={(e) => {
                              if (formData.category !== cat) e.currentTarget.style.background = 'var(--bg-card-hover)';
                            }}
                            onMouseLeave={(e) => {
                              if (formData.category !== cat) e.currentTarget.style.background = 'transparent';
                            }}
                          >
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: '0.5rem' }}>
                              {cat}
                            </span>

                            {/* Red X deletion button for this category */}
                            <button
                              type="button"
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (window.confirm(`Delete category "${cat}"?`)) {
                                  try {
                                    await deleteCategory(cat);
                                    if (formData.category === cat) {
                                      const remaining = customCategories.filter((c) => c !== cat);
                                      setFormData((prev) => ({ ...prev, category: remaining[0] || '' }));
                                    }
                                  } catch (err) {
                                    alert(err.message || 'Failed to delete category');
                                  }
                                }
                              }}
                              title={`Delete category "${cat}"`}
                              style={{
                                background: 'rgba(239, 68, 68, 0.12)',
                                border: 'none',
                                color: 'var(--danger)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '22px',
                                height: '22px',
                                borderRadius: '4px',
                                padding: 0,
                                flexShrink: 0,
                                transition: 'all 0.15s ease'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'var(--danger)';
                                e.currentTarget.style.color = '#fff';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.12)';
                                e.currentTarget.style.color = 'var(--danger)';
                              }}
                            >
                              <X size={13} strokeWidth={2.5} />
                            </button>
                          </div>
                        ))}

                        {/* Add New Category Action */}
                        <div
                          onClick={() => {
                            setIsCategoryDropdownOpen(false);
                            setIsAddingCategory(true);
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            padding: '0.6rem 0.85rem',
                            cursor: 'pointer',
                            fontSize: '0.84rem',
                            fontWeight: 700,
                            color: 'var(--accent-primary)',
                            borderTop: '1px solid var(--border-color)',
                            marginTop: '0.25rem'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-card-hover)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                          <Plus size={14} />
                          <span>Add New Category</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Product Name</label>
              <input
                type="text"
                name="name"
                className="form-input"
                placeholder="e.g. Liquid Detergent 2L"
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
                  placeholder="0.00"
                  value={formData.costPrice}
                  onChange={handleChange}
                  required
                  min="0"
                  step="0.01"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Selling Price (ETB)</label>
                <input
                  type="number"
                  name="sellingPrice"
                  className="form-input"
                  placeholder="0.00"
                  value={formData.sellingPrice}
                  onChange={handleChange}
                  required
                  min="0"
                  step="0.01"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Current Stock</label>
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
                placeholder="Details, scent, packaging sizes..."
                value={formData.description}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              <Save size={16} />
              <span>{isSubmitting ? 'Saving...' : product ? 'Update Item' : 'Add Item'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

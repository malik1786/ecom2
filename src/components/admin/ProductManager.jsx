import React, { useEffect, useMemo, useState } from 'react';
import { Edit, ImagePlus, PackagePlus, Star, Trash2, X, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  createProduct,
  deleteProduct,
  fetchProducts,
  getAdminToken,
  uploadAdminMedia,
  updateProduct,
} from '../../lib/api';

const EMPTY_PRODUCT = {
  name: '',
  tagline: '',
  scentNo: '',
  price: '',
  category: '',
  images: [],
  description: '',
  inventory_count: '0',
  is_active: true,
  is_featured: false,
  is_trending: false,
  is_new_arrival: false,
  is_limited_edition: false,
  is_best_seller: false,
  is_on_sale: false,
  sale_price: '',
  top_notes: '',
  heart_notes: '',
  base_notes: '',
  narrative_image: '',
  narrative_description: '',
  compare_at_price: '',
  variants: [],
};

const fallbackImage = '/src/assets/hero-bottle.png';

const getProductImages = (product) => {
  if (Array.isArray(product?.images) && product.images.length > 0) {
    return product.images;
  }
  if (product?.image) {
    return [product.image];
  }
  return [];
};

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error(`Unable to read ${file.name}`));
    reader.readAsDataURL(file);
  });

const ProductManager = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_PRODUCT);
  const [imageInput, setImageInput] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const isEditing = useMemo(() => editingId !== null, [editingId]);

  const fetchAllProducts = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await fetchProducts({ includeInactive: true });
      setProducts(data || []);
    } catch (err) {
      setError(err.message || 'Unable to load products');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllProducts();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setForm(EMPTY_PRODUCT);
    setImageInput('');
    setIsFormOpen(false);
    setSaving(false);
  };

  const openCreateForm = () => {
    setEditingId(null);
    setForm(EMPTY_PRODUCT);
    setImageInput('');
    setIsFormOpen(true);
    setError('');
  };

  const openEditForm = (product) => {
    setEditingId(product.id);
    setForm({
      name: product.name || '',
      tagline: product.tagline || '',
      scentNo: product.scentNo || '',
      price: product.price_cents
        ? (product.price_cents / 100).toFixed(2)
        : String(product.price || '').replace(/[^0-9.]/g, ''),
      category: product.category || '',
      images: getProductImages(product),
      description: product.description || '',
      inventory_count: String(product.inventory_count ?? 0),
      is_active: Boolean(product.is_active),
      is_featured: Boolean(product.is_featured),
      is_trending: Boolean(product.is_trending),
      is_new_arrival: Boolean(product.is_new_arrival),
      is_limited_edition: Boolean(product.is_limited_edition),
      is_best_seller: Boolean(product.is_best_seller),
      is_on_sale: Boolean(product.is_on_sale),
      sale_price: product.sale_price_cents ? (product.sale_price_cents / 100).toFixed(2) : '',
      top_notes: (product.top_notes || []).join(', '),
      heart_notes: (product.heart_notes || []).join(', '),
      base_notes: (product.base_notes || []).join(', '),
      narrative_image: product.narrative_image || '',
      narrative_description: product.narrative_description || '',
      compare_at_price: product.compare_at_price_cents ? (product.compare_at_price_cents / 100).toFixed(2) : '',
      variants: product.variants || [],
    });
    setImageInput('');
    setIsFormOpen(true);
    setError('');
  };

  const addImageUrl = () => {
    const value = imageInput.trim();
    if (!value) {
      return;
    }

    setForm((current) => ({
      ...current,
      images: current.images.includes(value) ? current.images : [...current.images, value],
    }));
    setImageInput('');
  };

  const removeImage = (targetIndex) => {
    setForm((current) => ({
      ...current,
      images: current.images.filter((_, index) => index !== targetIndex),
    }));
  };

  const makeCoverImage = (targetIndex) => {
    setForm((current) => {
      const nextImages = [...current.images];
      const [selected] = nextImages.splice(targetIndex, 1);
      if (!selected) {
        return current;
      }
      return {
        ...current,
        images: [selected, ...nextImages],
      };
    });
  };

  const [isUploading, setIsUploading] = useState(false);

  const addVariant = () => {
    setForm((f) => ({ ...f, variants: [...f.variants, { size: '', price: '' }] }));
  };

  const removeVariant = (index) => {
    setForm((f) => ({ ...f, variants: f.variants.filter((_, i) => i !== index) }));
  };

  const updateVariant = (index, key, value) => {
    setForm((f) => {
      const newVariants = [...f.variants];
      newVariants[index] = { ...newVariants[index], [key]: value };
      return { ...f, variants: newVariants };
    });
  };

  const handleImageUpload = async (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    const token = getAdminToken();
    if (!token) {
      setError('Admin session expired. Please login again to upload.');
      return;
    }

    setIsUploading(true);
    setError('');

    try {
      const uploadedUrls = [];
      for (const file of files) {
        const data = await uploadAdminMedia(file, token);
        if (data?.url) uploadedUrls.push(data.url);
      }

      setForm((current) => ({
        ...current,
        images: [...current.images, ...uploadedUrls.filter((url) => !current.images.includes(url))],
      }));
    } catch (err) {
      setError(err.message || 'Unable to add selected images');
    } finally {
      setIsUploading(false);
      event.target.value = '';
    }
  };

  const toPayload = () => ({
    name: form.name,
    tagline: form.tagline,
    scentNo: form.scentNo,
    price: form.price,
    category: form.category,
    image: form.images[0] || '',
    images: form.images,
    description: form.description,
    inventory_count: Number(form.inventory_count || 0),
    is_active: Boolean(form.is_active),
    is_featured: Boolean(form.is_featured),
    is_trending: Boolean(form.is_trending),
    is_new_arrival: Boolean(form.is_new_arrival),
    is_limited_edition: Boolean(form.is_limited_edition),
    is_best_seller: Boolean(form.is_best_seller),
    is_on_sale: Boolean(form.is_on_sale),
    sale_price: form.sale_price,
    top_notes: form.top_notes
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean),
    heart_notes: form.heart_notes
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean),
    base_notes: form.base_notes
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean),
    narrative_image: form.narrative_image,
    narrative_description: form.narrative_description,
    compare_at_price: form.compare_at_price,
    variants: form.variants,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = getAdminToken();
    if (!token) {
      setError('Admin session expired. Please login again.');
      return;
    }

    try {
      setSaving(true);
      setError('');
      const payload = toPayload();
      if (isEditing) {
        await updateProduct(editingId, payload, token);
      } else {
        await createProduct(payload, token);
      }
      await fetchAllProducts();
      resetForm();
    } catch (err) {
      setError(err.message || 'Unable to save product');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    const token = getAdminToken();
    if (!token) {
      setError('Admin session expired. Please login again.');
      return;
    }

    if (!window.confirm('Delete this product permanently?')) {
      return;
    }

    try {
      await deleteProduct(id, token);
      await fetchAllProducts();
    } catch (err) {
      setError(err.message || 'Unable to delete product');
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-cinzel tracking-widest text-perfume-gold">Inventory Portfolio</h1>
          <p className="mt-2 text-[10px] uppercase tracking-[0.2em] text-gray-500">
            Create, edit, and publish fashion products
          </p>
          <div className="mt-4 flex items-center gap-4">
             <button 
                onClick={() => navigate('/admin/vhome')}
                className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.3em] text-perfume-gold/60 hover:text-perfume-gold transition-all"
             >
                <Star size={12} />
                Manage Cinematic Video Wallpaper
             </button>
          </div>
        </div>
        <button
          onClick={openCreateForm}
          className="flex items-center gap-2 rounded-xl bg-black border border-perfume-gold/40 px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-perfume-gold transition-all hover:bg-stone-950 shadow-gold-glow"
        >
          <PackagePlus size={16} />
          Add Creation
        </button>
      </div>

      {error && (
        <div className="border border-red-500/40 bg-red-900/20 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {isFormOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="rounded-md border border-perfume-gold/20 bg-[#0A0A0A] p-8"
        >
          <div className="mb-6 flex items-center justify-between border-b border-white/5 pb-4">
            <h3 className="text-sm uppercase tracking-widest text-perfume-gold">
              {isEditing ? 'Edit Product' : 'Conceive New Masterpiece'}
            </h3>
            <button onClick={resetForm} className="text-gray-400 transition-colors hover:text-white">
              <X size={16} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {[
              { label: 'Name', key: 'name', type: 'text', required: true },
              { label: 'Tagline', key: 'tagline', type: 'text' },
              { label: 'Style Number', key: 'scentNo', type: 'text' },
              { label: 'Current Price (Rs.)', key: 'price', type: 'number', required: true, step: '0.01' },
              { label: 'Original/Crossed-out Price (Rs.)', key: 'compare_at_price', type: 'number', step: '0.01' },
              { label: 'Category', key: 'category', type: 'text' },
              { label: 'Inventory Count', key: 'inventory_count', type: 'number' },
            ].map((field) => (
              <div key={field.key}>
                <label className="mb-2 block text-[9px] uppercase tracking-widest text-gray-500">
                  {field.label}
                </label>
                <input
                  type={field.type}
                  step={field.step}
                  required={Boolean(field.required)}
                  value={form[field.key]}
                  onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                  className="w-full border border-white/10 bg-black p-3 text-xs transition-colors focus:border-perfume-gold focus:outline-none"
                />
              </div>
            ))}

            <div className="md:col-span-2">
              <label className="mb-2 block text-[9px] uppercase tracking-widest text-gray-500">
                Description
              </label>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full border border-white/10 bg-black p-3 text-xs focus:border-perfume-gold focus:outline-none"
              />
            </div>

            <div className="md:col-span-2 space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div>
                  <h4 className="text-[11px] uppercase tracking-[0.3em] font-bold text-perfume-gold">Creative Assets</h4>
                  <p className="text-[10px] text-stone-500 mt-1 uppercase tracking-widest">Manage product perspective & visual gallery</p>
                </div>

                <label className="cursor-pointer group">
                  <div className={`flex items-center gap-3 rounded-full border border-perfume-gold/30 px-6 py-3 text-[10px] uppercase tracking-[0.2em] transition-all ${isUploading ? 'bg-stone-900 text-perfume-gold/50 cursor-not-allowed' : 'bg-black text-perfume-gold hover:bg-stone-950 hover:border-perfume-gold'}`}>
                    {isUploading ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />}
                    {isUploading ? 'Uploading Media...' : 'Import Master Photos'}
                  </div>
                  <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
                </label>
              </div>

              <div className="flex gap-4">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={imageInput}
                    onChange={(e) => setImageInput(e.target.value)}
                    placeholder="Reference a remote asset URL..."
                    className="w-full border border-white/5 bg-black/40 px-5 py-4 text-xs focus:border-perfume-gold/40 focus:outline-none transition-all placeholder:text-stone-800 rounded-2xl"
                  />
                </div>
                <button
                  type="button"
                  onClick={addImageUrl}
                  className="rounded-2xl border border-white/10 px-8 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-white/50 transition-all hover:bg-white/5 hover:text-white"
                >
                  Link Asset
                </button>
              </div>

              {form.images.length === 0 ? (
                <div className="rounded-[2.5rem] border border-dashed border-white/5 bg-white/[0.01] p-12 text-center">
                  <p className="text-[10px] uppercase tracking-[0.3em] text-stone-600">No visual assets defined for this creation</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 pt-4">
                  {form.images.map((image, index) => (
                    <motion.div 
                        key={`${image}-${index}`} 
                        layout
                        className={`group relative rounded-[1.8rem] border overflow-hidden transition-all duration-500 ${index === 0 ? 'border-perfume-gold ring-4 ring-perfume-gold/10' : 'border-white/5 bg-black/20'}`}
                    >
                      <div className="aspect-[4/5] overflow-hidden bg-black/40">
                        <img 
                            src={image || fallbackImage} 
                            alt={`Preview ${index + 1}`} 
                            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" 
                        />
                      </div>
                      
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4 gap-2">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => makeCoverImage(index)}
                          className="w-full py-2 bg-white text-black text-[9px] font-bold uppercase tracking-widest rounded-xl hover:bg-perfume-gold transition-colors disabled:opacity-50"
                        >
                          {index === 0 ? 'Primary' : 'Set as Primary'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setForm({ ...form, narrative_image: image })}
                          className={`w-full py-2 text-[9px] font-bold uppercase tracking-widest rounded-xl transition-colors ${form.narrative_image === image ? 'bg-perfume-gold text-black' : 'bg-white/10 text-white hover:bg-white/20'}`}
                        >
                          {form.narrative_image === image ? 'Narrative Image' : 'Set as Narrative'}
                        </button>
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="w-full py-2 bg-red-500/10 border border-red-500/20 text-red-200 text-[9px] font-bold uppercase tracking-widest rounded-xl hover:bg-red-500/20 transition-colors"
                        >
                          Remove
                        </button>
                      </div>

                      {index === 0 && (
                        <div className="absolute top-4 left-4">
                            <div className="bg-perfume-gold text-black px-3 py-1 rounded-full text-[8px] font-bold uppercase tracking-widest shadow-xl">Cover</div>
                        </div>
                      )}
                      {form.narrative_image === image && (
                        <div className="absolute top-4 right-4">
                            <div className="bg-white text-black px-3 py-1 rounded-full text-[8px] font-bold uppercase tracking-widest shadow-xl">Story</div>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            <div className="md:col-span-2 space-y-4 pt-6 border-t border-white/5">
                <div>
                  <h4 className="text-[11px] uppercase tracking-[0.3em] font-bold text-perfume-gold">Olfactory Narrative</h4>
                  <p className="text-[10px] text-stone-500 mt-1 uppercase tracking-widest">The storytelling piece for the scrolling featured section</p>
                </div>
                <textarea
                  rows={4}
                  value={form.narrative_description}
                  onChange={(e) => setForm({ ...form, narrative_description: e.target.value })}
                  placeholder="Tell the unique story of this creation... This will appear in the large scroll section."
                  className="w-full border border-white/5 bg-black/40 px-5 py-4 text-xs focus:border-perfume-gold/40 focus:outline-none transition-all placeholder:text-stone-800 rounded-2xl leading-relaxed"
                />
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-[9px] uppercase tracking-widest text-gray-500">
                Top Notes (Comma Separated)
              </label>
              <input
                type="text"
                value={form.top_notes}
                onChange={(e) => setForm({ ...form, top_notes: e.target.value })}
                className="w-full border border-white/10 bg-black p-3 text-xs focus:border-perfume-gold"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-[9px] uppercase tracking-widest text-gray-500">
                Heart Notes (Comma Separated)
              </label>
              <input
                type="text"
                value={form.heart_notes}
                onChange={(e) => setForm({ ...form, heart_notes: e.target.value })}
                className="w-full border border-white/10 bg-black p-3 text-xs focus:border-perfume-gold"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-[9px] uppercase tracking-widest text-gray-500">
                Base Notes (Comma Separated)
              </label>
              <input
                type="text"
                value={form.base_notes}
                onChange={(e) => setForm({ ...form, base_notes: e.target.value })}
                className="w-full border border-white/10 bg-black p-3 text-xs focus:border-perfume-gold"
              />
            </div>

            <div className="md:col-span-2 space-y-4 pt-6 border-t border-white/5">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-[11px] uppercase tracking-[0.3em] font-bold text-perfume-gold">Size Variants (ML Pricing)</h4>
                    <p className="text-[10px] text-stone-500 mt-1 uppercase tracking-widest">Optional: Add specific sizes (e.g., 50ML, 100ML) and their prices</p>
                  </div>
                  <button 
                    type="button" 
                    onClick={addVariant}
                    className="text-[9px] font-bold uppercase tracking-widest bg-black text-perfume-gold border border-perfume-gold/30 px-4 py-2 rounded-lg transition-colors hover:bg-stone-950"
                  >
                    + Custom Size
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {['5ML', '10ML', '15ML', '25ML', '30ML', '35ML', '50ML', '100ML', '500ML', '1000ML', '2500ML'].map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, variants: [...f.variants, { size: s, price: '' }] }))}
                      className="text-[8px] font-bold uppercase tracking-widest border border-white/10 hover:border-perfume-gold/50 px-3 py-1.5 rounded-full transition-colors text-stone-500 hover:text-perfume-gold"
                    >
                      + {s}
                    </button>
                  ))}
                </div>
                
                {form.variants.length > 0 && (
                  <div className="space-y-3">
                    {form.variants.map((v, index) => (
                      <div key={index} className="flex items-center gap-4">
                        <input
                          type="text"
                          placeholder="e.g. 50ML"
                          value={v.size}
                          onChange={(e) => updateVariant(index, 'size', e.target.value)}
                          className="flex-1 border border-white/10 bg-black p-3 text-xs focus:border-perfume-gold"
                        />
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Price (Rs.)"
                          value={v.price}
                          onChange={(e) => updateVariant(index, 'price', e.target.value)}
                          className="flex-1 border border-white/10 bg-black p-3 text-xs focus:border-perfume-gold"
                        />
                        <button 
                          type="button"
                          onClick={() => removeVariant(index)}
                          className="p-3 bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
            </div>

            <div className="md:col-span-2 flex items-center justify-between pt-6 border-t border-white/5">
              <label className="inline-flex items-center gap-2 text-[10px] uppercase tracking-widest text-gray-400">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  className="accent-perfume-gold"
                />
                Active Product
              </label>

              <label className="inline-flex items-center gap-2 text-[10px] uppercase tracking-widest text-gray-400">
                <input
                  type="checkbox"
                  checked={form.is_featured}
                  onChange={(e) => setForm({ ...form, is_featured: e.target.checked })}
                  className="accent-perfume-gold"
                />
                Featured (Slider)
              </label>

              <label className="inline-flex items-center gap-2 text-[10px] uppercase tracking-widest text-gray-400">
                <input
                  type="checkbox"
                  checked={form.is_trending}
                  onChange={(e) => setForm({ ...form, is_trending: e.target.checked })}
                  className="accent-perfume-gold"
                />
                Trending (Slider)
              </label>

              <label className="inline-flex items-center gap-2 text-[10px] uppercase tracking-widest text-gray-400">
                <input
                  type="checkbox"
                  checked={form.is_new_arrival}
                  onChange={(e) => setForm({ ...form, is_new_arrival: e.target.checked })}
                  className="accent-perfume-gold"
                />
                New Arrival
              </label>

              <label className="inline-flex items-center gap-2 text-[10px] uppercase tracking-widest text-gray-400">
                <input
                  type="checkbox"
                  checked={form.is_limited_edition}
                  onChange={(e) => setForm({ ...form, is_limited_edition: e.target.checked })}
                  className="accent-perfume-gold"
                />
                Limited Edition
              </label>

              <label className="inline-flex items-center gap-2 text-[10px] uppercase tracking-widest text-gray-400">
                <input
                  type="checkbox"
                  checked={form.is_best_seller}
                  onChange={(e) => setForm({ ...form, is_best_seller: e.target.checked })}
                  className="accent-perfume-gold"
                />
                Best Seller
              </label>

              <label className="inline-flex items-center gap-2 text-[10px] uppercase tracking-widest text-gray-400">
                <input
                  type="checkbox"
                  checked={form.is_on_sale}
                  onChange={(e) => setForm({ ...form, is_on_sale: e.target.checked })}
                  className="accent-perfume-gold"
                />
                On Sale
              </label>

              {form.is_on_sale && (
                <div className="w-full">
                  <label className="mb-2 block text-[9px] uppercase tracking-widest text-gray-500">
                    Sale Price (Rs.)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.sale_price}
                    onChange={(e) => setForm({ ...form, sale_price: e.target.value })}
                    className="w-full border border-perfume-gold/40 bg-black p-3 text-xs focus:border-perfume-gold focus:outline-none"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={saving}
                className="bg-black border border-perfume-gold/50 px-10 py-4 text-[10px] font-bold uppercase tracking-widest text-perfume-gold rounded-full transition-all hover:bg-stone-950 shadow-gold-glow disabled:opacity-60"
              >
                {saving ? 'Saving...' : isEditing ? 'Update Product' : 'Publish to Gallery'}
              </button>
            </div>
          </form>
        </motion.div>
      )}

      <div className="overflow-x-auto rounded-[1.5rem] border border-white/5 bg-[#0A0A0A]">
        <table className="w-full min-w-[900px] border-collapse text-left">
          <thead>
            <tr className="border-b border-white/5 bg-black/50 text-[9px] uppercase tracking-[0.2em] text-gray-400">
              <th className="p-5 font-normal">Item</th>
              <th className="p-5 font-normal">Scent Ref</th>
              <th className="p-5 font-normal">Category</th>
              <th className="p-5 font-normal">Inventory</th>
              <th className="p-5 font-normal">Price</th>
              <th className="p-5 font-normal text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan="6" className="p-8 text-center text-xs uppercase tracking-widest text-perfume-gold animate-pulse">
                  Consulting Archives...
                </td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan="6" className="p-8 text-center text-xs uppercase tracking-widest text-gray-500">
                  The Gallery is Empty
                </td>
              </tr>
            ) : (
              products.map((product) => {
                const images = getProductImages(product);
                return (
                  <tr key={product.id} className="border-b border-white/5 transition-colors hover:bg-white/5">
                    <td className="p-5">
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-sm border border-white/10 bg-black p-1">
                          <img
                            src={images[0] || fallbackImage}
                            className="max-h-full object-contain mix-blend-screen"
                            alt={product.name}
                          />
                        </div>
                        <div>
                          <p className="text-lg font-serif italic text-perfume-gold">{product.name}</p>
                          <p className="text-[9px] uppercase tracking-widest text-gray-500">{product.tagline}</p>
                          <p className="mt-1 text-[9px] uppercase tracking-widest text-white/50">
                            {images.length} photo{images.length === 1 ? '' : 's'}
                          </p>
                          <p className={`mt-1 text-[9px] uppercase tracking-widest ${product.is_active ? 'text-green-400' : 'text-red-400'}`}>
                            {product.is_active ? 'Active' : 'Inactive'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-5 text-xs tracking-wider text-gray-400">{product.scentNo || '-'}</td>
                    <td className="p-5 text-[10px] uppercase tracking-widest text-white/50">{product.category || '-'}</td>
                    <td className="p-5 text-xs text-white/80">{product.inventory_count ?? 0}</td>
                    <td className="p-5 font-serif text-white">{product.price}</td>
                    <td className="p-5 text-right">
                      <div className="flex items-center justify-end gap-3 text-gray-500">
                        <button onClick={() => openEditForm(product)} className="transition-colors hover:text-perfume-gold" aria-label="Edit product">
                          <Edit size={16} />
                        </button>
                        <button onClick={() => handleDelete(product.id)} className="transition-colors hover:text-red-500" aria-label="Delete product">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ProductManager;

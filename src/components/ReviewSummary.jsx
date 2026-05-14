import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, StarHalf, Upload, ThumbsUp, MessageSquare } from 'lucide-react';
import {
  createProductReview,
  fetchProductReviews,
  uploadReviewImage,
} from '../lib/api';

const EMPTY_FORM = {
  reviewer_name: '',
  reviewer_email: '',
  rating: 5,
  comment: '',
  image_url: '',
};

const formatDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
};

const ReviewSummary = ({ productId }) => {
  const [reviews, setReviews] = useState([]);
  const [summary, setSummary] = useState({ average_rating: 0, count: 0 });
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);

  const loadReviews = async () => {
    if (!productId) return;
    setLoading(true);
    try {
      const data = await fetchProductReviews(productId);
      setReviews(data.reviews || []);
      setSummary(data.summary || { average_rating: 0, count: 0 });
    } catch (err) {
      setError(err.message || 'Unable to load reviews');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();
  }, [productId]);

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const data = await uploadReviewImage(file);
      setForm((current) => ({ ...current, image_url: data.url || '' }));
    } catch (err) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploadingImage(false);
    }
  };

  const submitReview = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const data = await createProductReview(productId, form);
      setReviews((current) => [data.review, ...current]);
      setForm(EMPTY_FORM);
      setSuccess('Review submitted successfully.');
      setShowForm(false);
      loadReviews();
    } catch (err) {
      setError(err.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const StarRating = ({ rating, size = 16 }) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star 
            key={i} 
            size={size} 
            fill={i <= Math.round(rating) ? 'var(--brand-gold)' : 'none'} 
            className={i <= Math.round(rating) ? 'text-brand-gold' : 'text-stone-700'} 
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-16 border-t border-white/5 pt-20 relative">
      <div className="flex flex-col lg:flex-row justify-between items-start gap-16">
        
        {/* BOLD RATING SUMMARY (Standard E-commerce Style) */}
        <div className="w-full lg:w-1/3 space-y-8">
          <h2 className="text-2xl font-bold tracking-tight text-white uppercase">Customer Reviews</h2>
          <div className="flex items-center gap-6">
            <span className="text-6xl font-black text-white">{(summary.average_rating || 0).toFixed(1)}</span>
            <div className="space-y-2">
              <StarRating rating={summary.average_rating} size={20} />
              <p className="text-sm font-medium text-stone-500 uppercase tracking-widest">{summary.count || 0} Total Reviews</p>
            </div>
          </div>

          <div className="space-y-3">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = reviews.filter(r => r.rating === star).length;
              const percentage = summary.count > 0 ? Math.round((count / summary.count) * 100) : 0;
              return (
                <div key={star} className="flex items-center gap-4 text-xs">
                  <span className="w-12 text-stone-400 font-bold">{star} Star</span>
                  <div className="flex-1 h-2 bg-stone-900 rounded-full overflow-hidden border border-white/5">
                    <motion.div 
                      initial={{ width: 0 }}
                      whileInView={{ width: `${percentage}%` }}
                      className="h-full bg-brand-gold" 
                    />
                  </div>
                  <span className="w-10 text-right text-stone-500 font-bold">{percentage}%</span>
                </div>
              );
            })}
          </div>

          <button 
            onClick={() => setShowForm(!showForm)}
            className="w-full py-4 border border-white/10 bg-white text-black font-bold text-xs uppercase tracking-widest hover:bg-brand-gold transition-colors shadow-2xl"
          >
            {showForm ? 'Cancel Review' : 'Write a Review'}
          </button>
        </div>

        {/* REVIEW FORM (Toggleable) */}
        <div className="w-full lg:w-2/3">
          <AnimatePresence>
            {showForm && (
              <motion.form 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                onSubmit={submitReview} 
                className="mb-20 bg-stone-950/50 border border-white/5 p-10 rounded-xl space-y-8 shadow-inner"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-stone-500">Your Name</label>
                    <input
                      type="text"
                      required
                      value={form.reviewer_name}
                      onChange={(e) => setForm((curr) => ({ ...curr, reviewer_name: e.target.value }))}
                      className="w-full bg-black border border-white/10 p-4 text-sm focus:outline-none focus:border-brand-gold transition-colors"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-stone-500">Email Address</label>
                    <input
                      type="email"
                      required
                      value={form.reviewer_email}
                      onChange={(e) => setForm((curr) => ({ ...curr, reviewer_email: e.target.value }))}
                      className="w-full bg-black border border-white/10 p-4 text-sm focus:outline-none focus:border-brand-gold transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-stone-500">Rating</label>
                  <div className="flex gap-4">
                    {[1, 2, 3, 4, 5].map((r) => (
                      <button key={r} type="button" onClick={() => setForm((curr) => ({ ...curr, rating: r }))} className="transition-transform active:scale-90">
                        <Star size={24} fill={r <= form.rating ? 'var(--brand-gold)' : 'none'} className={r <= form.rating ? 'text-brand-gold' : 'text-stone-800'} />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-stone-500">Your Feedback</label>
                  <textarea
                    required
                    rows={5}
                    value={form.comment}
                    onChange={(e) => setForm((curr) => ({ ...curr, comment: e.target.value }))}
                    className="w-full bg-black border border-white/10 p-4 text-sm focus:outline-none focus:border-brand-gold transition-colors resize-none"
                    placeholder="Share your experience with this archival scent..."
                  />
                </div>

                <div className="space-y-4 pt-4">
                  {error && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] uppercase tracking-widest font-bold">
                      {error}
                    </div>
                  )}
                  {success && (
                    <div className="p-4 bg-brand-gold/10 border border-brand-gold/20 text-brand-gold text-[10px] uppercase tracking-widest font-bold">
                      {success}
                    </div>
                  )}
                  <div className="flex flex-wrap items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                       <label className="cursor-pointer flex items-center gap-2 bg-stone-900 border border-white/5 px-5 py-3 text-[10px] uppercase font-bold tracking-widest hover:bg-white/5 transition-all">
                         <Upload size={14} />
                         {uploadingImage ? 'Uploading...' : 'Add Photos'}
                         <input type="file" className="hidden" onChange={handleUpload} />
                       </label>
                       {form.image_url && <div className="text-[10px] text-brand-gold font-bold uppercase tracking-widest">Photo Ready ✓</div>}
                    </div>
                    <button type="submit" disabled={submitting} className="bg-brand-gold text-black px-12 py-4 text-[10px] font-bold uppercase tracking-widest hover:bg-white transition-all shadow-xl" style={{ backgroundColor: '#d6b25e' }}>
                       {submitting ? 'Publishing...' : 'Post Review'}
                    </button>
                  </div>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {/* REVIEWS LIST (Standard E-commerce Grid) */}
          <div className="space-y-12">
            <div className="flex items-center justify-between border-b border-white/5 pb-6">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-stone-400">Showing {reviews.length} Experiences</p>
              <select className="bg-transparent border-none text-[10px] uppercase tracking-widest font-bold text-stone-500 focus:outline-none cursor-pointer">
                 <option>Most Recent</option>
                 <option>Highest Rated</option>
              </select>
            </div>

            <div className="divide-y divide-white/5">
              {reviews.length === 0 ? (
                <div className="py-20 text-center">
                   <MessageSquare className="mx-auto mb-4 text-stone-800" size={40} />
                   <p className="text-[10px] uppercase tracking-[0.3em] text-stone-600">Be the first to record a consensus</p>
                </div>
              ) : (
                reviews.map((review) => (
                  <div key={review.id} className="py-12 flex flex-col md:flex-row gap-10">
                    <div className="w-full md:w-1/4 space-y-2">
                       <p className="text-sm font-bold text-white truncate">{review.reviewer_name}</p>
                       <div className="flex items-center gap-2">
                          <div className="w-4 h-4 bg-green-500/20 rounded-full flex items-center justify-center">
                             <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                          </div>
                          <p className="text-[9px] font-bold uppercase tracking-widest text-stone-500">Verified Buyer</p>
                       </div>
                       <p className="text-[10px] text-stone-600 font-bold uppercase tracking-widest">{formatDate(review.created_at)}</p>
                    </div>
                    
                    <div className="flex-1 space-y-6">
                      <StarRating rating={review.rating} />
                      <p className="text-base text-stone-300 leading-relaxed font-light">{review.comment}</p>
                      
                      {review.image_url && (
                        <div className="w-full max-w-sm rounded-xl overflow-hidden border border-white/5 bg-stone-900/40 p-2">
                          <img src={review.image_url} className="w-full h-full object-cover rounded-lg" alt="Review asset" />
                        </div>
                      )}

                      <div className="flex items-center gap-6 pt-4">
                         <button className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-stone-600 hover:text-white transition-colors">
                            <ThumbsUp size={12} /> Helpful (0)
                         </button>
                         <button className="text-[10px] uppercase tracking-widest text-stone-600 hover:text-white transition-colors">
                            Report
                         </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReviewSummary;

import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import bottle1 from '../assets/bottle1.png';
import bottle2 from '../assets/bottle2.png';
import bottle3 from '../assets/bottle3.png';
import { ArrowRight } from 'lucide-react';
import { fetchProducts } from '../lib/api';

const defaultCollections = [
  { id: 1, name: 'The Gilded Noir', scentNo: 'SCENT NO. 24', image: bottle1, price: '$285.00', tagline: 'Saffron, rose, oud', delay: 0 },
  { id: 2, name: 'Midnight Amber', scentNo: 'SCENT NO. 12', image: bottle2, price: '$245.00', tagline: 'Amber, cedar, cardamom', delay: 0.15 },
  { id: 3, name: 'Velvet Moss', scentNo: 'SCENT NO. 07', image: bottle3, price: '$210.00', tagline: 'Moss, iris, soft musk', delay: 0.3 },
];

const CuratedCollections = () => {
  const navigate = useNavigate();
  const [collections, setCollections] = React.useState(defaultCollections);
  const scrollRef = useRef(null);

  React.useEffect(() => {
    const loadProducts = async () => {
      try {
        const data = await fetchProducts();
        const prodArray = Array.isArray(data) ? data : (data.products || []);
        if (prodArray.length > 0) {
          const formatted = prodArray.slice(0, 4).map((product, index) => ({
            id: product.id,
            name: product.name,
            tagline: product.tagline || product.description?.slice(0, 60) + '...',
            image: product.image_url || defaultCollections[index % defaultCollections.length].image,
          }));
          setCollections(formatted);
        }
      } catch {
        setCollections(defaultCollections);
      }
    };
    loadProducts();
  }, []);

  return (
    <section className="relative py-section-gap bg-surface-container-lowest">
      <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
        <div className="flex justify-between items-end mb-16">
          <div>
            <h2 className="text-headline-lg text-primary mb-2">Curated Collections</h2>
            <p className="font-body-md text-on-surface-variant">The essence of rare botanicals.</p>
          </div>
          <button onClick={() => navigate('/search')} className="font-label text-label text-primary border-b border-outline-variant pb-1 hover:border-primary transition-colors">
            View All
          </button>
        </div>

        <div 
          ref={scrollRef}
          className="flex overflow-x-auto hide-scrollbar gap-gutter pb-8 snap-x no-scrollbar"
        >
          {collections.map((item) => (
            <motion.div
              key={item.id}
              className="flex-none w-[80vw] md:w-[45vw] snap-center group cursor-pointer"
              onClick={() => navigate(`/product/${item.id}`)}
            >
              <div className="relative aspect-[16/9] bg-surface overflow-hidden mb-6 rim-light border border-outline-variant/20">
                <img 
                  src={item.image} 
                  alt={item.name}
                  className="w-full h-full object-cover opacity-80 group-hover:scale-105 group-hover:opacity-100 transition-all duration-1000"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
              </div>
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <h3 className="text-2xl font-display text-on-surface group-hover:text-primary transition-colors">{item.name}</h3>
                  <p className="text-sm text-on-surface-variant font-body max-w-sm">{item.tagline}</p>
                </div>
                <ArrowRight className="text-outline-variant group-hover:text-primary group-hover:translate-x-2 transition-all" size={24} strokeWidth={1} />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CuratedCollections;

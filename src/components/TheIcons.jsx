import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import bottle4 from '../assets/hero-bottle.png';
import bottle5 from '../assets/collection.png';
import { fetchProducts } from '../lib/api';

const defaultIcons = [
  { id: 1, name: 'Imperial Oud', price: '$285.00', category: 'WOODY', image: bottle4 },
  { id: 2, name: 'Celestial Silk', price: '$210.00', category: 'FLORAL', image: bottle5 },
  { id: 3, name: 'Emerald Shade', price: '$245.00', category: 'EARTHY', image: bottle4 },
];

const TheIcons = () => {
  const navigate = useNavigate();
  const [icons, setIcons] = React.useState(defaultIcons);

  React.useEffect(() => {
    const loadProducts = async () => {
      try {
        const data = await fetchProducts();
        const prodArray = Array.isArray(data) ? data : (data.products || []);
        
        if (prodArray.length > 0) {
          // Filter for best sellers specifically for "The Icons"
          const bestSellers = prodArray.filter(p => p.is_best_seller);
          const source = bestSellers.length >= 3 ? bestSellers : prodArray;

          setIcons(
            source.slice(0, 3).map((product, index) => ({
              id: product.id,
              name: product.name,
              price: product.price_cents ? `$${(product.price_cents/100).toFixed(2)}` : defaultIcons[index % defaultIcons.length].price,
              category: product.category || 'Signature',
              image: product.image_url || defaultIcons[index % defaultIcons.length].image,
            })),
          );
        }
      } catch {
        setIcons(defaultIcons);
      }
    };
    loadProducts();
  }, []);

  return (
    <section className="relative bg-bg-primary px-8 py-40 border-t border-border-primary" id="icons">
      <div className="max-w-[1400px] mx-auto">
        <div className="mb-32 text-center">
          <p className="luxury-label mb-8">Masterpieces</p>
          <h2 className="text-5xl md:text-7xl leading-tight font-cinzel uppercase tracking-tighter">
            The <span className="italic font-cormorant text-perfume-gold">Icons.</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-16">
          {icons.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 1, delay: index * 0.2 }}
              onClick={() => navigate(`/product/${item.id}`)}
              className="group cursor-pointer"
            >
              <div className="aspect-square bg-[#0a0a0a] border border-border-primary overflow-hidden flex items-center justify-center p-16 transition-all duration-700 group-hover:border-brand-gold/30">
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-full h-full object-contain transition-transform duration-1000 group-hover:scale-105"
                />
              </div>

              <div className="mt-12 space-y-4">
                <div className="flex justify-between items-end">
                   <h3 className="text-2xl font-cinzel uppercase tracking-tight group-hover:italic transition-all duration-500">{item.name}</h3>
                  <p className="text-lg font-light">{item.price}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="h-[1px] w-8 bg-brand-gold/40" />
                  <p className="luxury-label text-[8px] text-muted">{item.category}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-32 text-center">
          <button 
            onClick={() => navigate('/search')}
            className="text-[10px] uppercase tracking-[0.5em] text-secondary hover:text-primary transition-all duration-500 border-b border-transparent hover:border-primary pb-2"
          >
            Explore Full Archive
          </button>
        </div>
      </div>
    </section>
  );
};

export default TheIcons;

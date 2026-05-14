import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import logo from '../../logo.png';

const WelcomeText = ({ onComplete }) => {
  const [exiting, setExiting] = useState(false);

  // Auto-advance after 3 seconds, or user can click to continue sooner
  useEffect(() => {
    const timer = setTimeout(() => {
      setExiting(true);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  const handleClick = () => {
    setExiting(true);
  };

  return (
    <motion.div
      className="fixed inset-0 flex flex-col items-center justify-center z-40 cursor-pointer"
      style={{ background: 'var(--bg-primary)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: exiting ? 0 : 1 }}
      transition={{ duration: exiting ? 1 : 1.5, ease: "easeInOut" }}
      onAnimationComplete={() => {
        if (exiting) onComplete();
      }}
      onClick={handleClick}
    >
      <motion.div
        className="p-8 rounded-[2.5rem] flex flex-col items-center justify-center relative overflow-hidden"
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
      >
        {/* Royal Velvet Halo Background */}
        <div className="absolute inset-0 bg-gradient-to-tr from-velvet/20 via-transparent to-velvet/20 opacity-40" />

        <div className="rotating-gold-box p-[1.5px] rounded-[2rem] overflow-hidden velvet-pulse">
          <div className="rounded-[1.95rem] p-12 flex items-center justify-center bg-[#131313]">
            <motion.img
              src={logo}
              alt="Sufi Perfumes logo"
              className="w-full max-w-[320px] h-auto object-contain drop-shadow-[0_0_50px_rgba(230,196,121,0.2)] mix-blend-screen"
              animate={{ filter: ["brightness(1) contrast(1)", "brightness(1.2) contrast(1.1)", "brightness(1) contrast(1)"] }}
              transition={{ duration: 4, repeat: Infinity }}
            />
          </div>
        </div>

        <motion.div 
            className="mt-12 text-center space-y-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
        >
            <p className="text-[10px] uppercase tracking-[0.8em] text-gold-leaf font-bold">Maison Sufi</p>
            <h2 className="text-4xl font-cormorant italic text-white/90">L'Héritage éternel</h2>
            
            <div className="flex flex-col items-center gap-6 mt-12">
                <div className="h-16 w-[1px] bg-gradient-to-b from-perfume-gold to-transparent opacity-30" />
                <p className="text-stone-600 text-[9px] tracking-[0.4em] uppercase font-bold animate-pulse">
                    Touch to enter the Archive
                </p>
            </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

export default WelcomeText;

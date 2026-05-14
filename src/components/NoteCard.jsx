import React from 'react';
import { motion } from 'framer-motion';
import TypewriterText from './TypewriterText';

const NoteCard = ({ title, notes, delay = 0 }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8, delay }}
      className="p-8 bg-[#0A0A0A] border border-white/5 relative group overflow-hidden"
    >
      {/* Background Accent */}
      <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-perfume-gold opacity-[0.03] group-hover:opacity-10 blur-2xl transition-opacity duration-700" />
      
      <h4 className="font-cinzel text-perfume-gold text-[10px] tracking-[0.4em] uppercase mb-6 flex items-center gap-3">
        <span className="w-8 h-[1px] bg-perfume-gold/30"></span>
        <TypewriterText text={title} delay={delay + 0.1} as="span" />
      </h4>
      
      <div className="flex flex-wrap gap-x-6 gap-y-3">
        {notes.map((note, idx) => (
            <TypewriterText 
              key={`${note}-${idx}`}
              text={note + (idx < notes.length - 1 ? "," : "")}
              delay={delay + 0.3 + idx * 0.1}
              as="span"
            />
        ))}
      </div>
    </motion.div>
  );
};

export default NoteCard;

import React from 'react';
import { Link } from 'react-router-dom';
import Logo from './Logo';

const footerSections = [
  {
    title: 'Collection',
    links: [
      { label: 'All Fragrances',   href: '/search' },
      { label: 'Limited Editions', href: '/search?q=limited' },
      { label: 'New Arrivals',     href: '/search?q=new' },
      { label: 'Best Sellers',     href: '/search?q=bestseller' },
    ],
  },
  {
    title: 'Maison',
    links: [
      { label: 'Our Story',  href: '#atelier' },
      { label: 'Boutiques',  href: '#' },
      { label: 'Careers',    href: '#' },
      { label: 'Press',      href: '#' },
    ],
  },
  {
    title: 'Concierge',
    links: [
      { label: 'Contact Us',      href: '#' },
      { label: 'Shipping Policy', href: '#' },
      { label: 'Returns',         href: '#' },
      { label: 'Track Order',     href: '#' },
    ],
  },
];

const socialLinks = [
  { label: 'Instagram', href: '#' },
  { label: 'TikTok',    href: '#' },
  { label: 'WhatsApp',  href: '#' },
];

const Footer = () => {
  return (
    <footer className="bg-[#020202] border-t border-white/5">

      {/* ── Main content ── */}
      <div className="max-w-[1400px] mx-auto px-8 py-24">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-16 mb-24">

          {/* Brand column */}
          <div className="lg:col-span-2 space-y-8">
            <Link to="/">
              <Logo />
            </Link>
            <p className="text-stone-600 text-sm leading-relaxed max-w-xs">
              Architectural fragrances crafted with rare ingredients. A dialogue between nature and timeless structure.
            </p>
            {/* Social links */}
            <div className="flex gap-6 pt-2">
              {socialLinks.map(s => (
                <a
                  key={s.label}
                  href={s.href}
                  className="text-[9px] font-bold uppercase tracking-[0.4em] text-stone-700 hover:text-brand-gold transition-colors"
                >
                  {s.label}
                </a>
              ))}
            </div>
          </div>

          {/* Nav columns */}
          {footerSections.map(section => (
            <div key={section.title}>
              <h4 className="text-[9px] font-bold uppercase tracking-[0.5em] text-brand-gold mb-8">
                {section.title}
              </h4>
              <ul className="space-y-5">
                {section.links.map(link => (
                  <li key={link.label}>
                    <Link
                      to={link.href}
                      className="text-[10px] uppercase tracking-widest text-stone-600 hover:text-white transition-colors duration-300"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* ── Divider ── */}
        <div className="section-divider mb-10" />

        {/* ── Bottom bar ── */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-[9px] text-stone-800 uppercase tracking-widest">
            © {new Date().getFullYear()} Sufi Perfumes — All Rights Reserved
          </p>
          <div className="flex gap-10">
            {['Privacy Policy', 'Terms of Use', 'Cookie Settings'].map(item => (
              <a
                key={item}
                href="#"
                className="text-[8px] uppercase tracking-[0.4em] text-stone-800 hover:text-stone-400 transition-colors"
              >
                {item}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

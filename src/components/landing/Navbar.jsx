import { useState, useEffect } from 'react';
import { Menu, X, Loader2 } from 'lucide-react';

const NAV_LINKS = [
  { label: 'Cómo funciona', href: '#como-funciona' },
  { label: 'Automatizaciones', href: '#automatizaciones' },
  { label: 'Fast Start', href: '#fast-start' },
];

async function startCheckout(setLoading) {
  setLoading(true);
  try {
    const res = await fetch('/api/create-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: 'monthly' }),
    });
    const data = await res.json();
    if (data.url) {
      window.location.href = data.url;
    } else {
      alert(data.error || 'Error al iniciar el pago. Intenta de nuevo.');
    }
  } catch {
    alert('Error de conexión. Por favor intenta de nuevo.');
  } finally {
    setLoading(false);
  }
}

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleNavClick = (href) => {
    setMenuOpen(false);
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-white border-b border-gray-200 shadow-sm' : 'bg-transparent'
      }`}
    >
      <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">

        {/* Logo */}
        <a href="#" className="flex items-center gap-2.5">
          <img
            src="/Zynergia%20Logo.png"
            alt="Zynergia"
            className="h-8 w-auto"
          />
          <span
            className={`text-lg font-bold tracking-tight transition-colors ${
              scrolled ? 'text-[#0F172A]' : 'text-white'
            }`}
          >
            Zynergia
          </span>
        </a>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-7">
          {NAV_LINKS.map((link) => (
            <button
              key={link.href}
              onClick={() => handleNavClick(link.href)}
              className={`text-sm font-medium transition-colors hover:text-[#004AFE] ${
                scrolled ? 'text-[#64748B]' : 'text-white/80 hover:text-white'
              }`}
            >
              {link.label}
            </button>
          ))}
        </div>

        {/* CTA desktop */}
        <div className="hidden md:flex items-center gap-3">
          <a
            href="/"
            className={`text-sm font-medium transition-colors ${
              scrolled ? 'text-[#64748B] hover:text-[#004AFE]' : 'text-white/70 hover:text-white'
            }`}
          >
            Iniciar sesión
          </a>
          <button
            onClick={() => startCheckout(setLoading)}
            disabled={loading}
            className="bg-[#004AFE] hover:bg-[#0039CC] text-white text-sm font-semibold px-5 py-2.5 rounded-full transition-colors flex items-center gap-2 disabled:opacity-70"
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Suscribirme $17/mes
          </button>
        </div>

        {/* Mobile hamburger */}
        <button
          className={`md:hidden transition-colors ${scrolled ? 'text-[#0F172A]' : 'text-white'}`}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Menú"
        >
          {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 px-5 py-4 flex flex-col gap-4">
          {NAV_LINKS.map((link) => (
            <button
              key={link.href}
              onClick={() => handleNavClick(link.href)}
              className="text-left text-sm font-medium text-[#64748B] hover:text-[#004AFE] transition-colors"
            >
              {link.label}
            </button>
          ))}
          <a
            href="/"
            className="text-sm font-medium text-[#64748B] hover:text-[#004AFE] transition-colors"
          >
            Iniciar sesión
          </a>
          <button
            onClick={() => { setMenuOpen(false); startCheckout(setLoading); }}
            disabled={loading}
            className="bg-[#004AFE] text-white text-sm font-semibold px-5 py-3 rounded-full text-center flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Suscribirme $17/mes
          </button>
        </div>
      )}
    </nav>
  );
}

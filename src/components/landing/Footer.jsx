const FOOTER_LINKS = [
  {
    heading: 'Producto',
    links: [
      { label: 'Cómo funciona', href: '#como-funciona' },
      { label: 'Automatizaciones', href: '#automatizaciones' },
      { label: 'Fast Start', href: '#fast-start' },
    ],
  },
  {
    heading: 'Empresa',
    links: [
      { label: 'Acerca de', href: '#' },
      { label: 'Contacto', href: 'mailto:hola@zynergia.app' },
      { label: 'Blog', href: '#' },
    ],
  },
  {
    heading: 'Legal',
    links: [
      { label: 'Términos de uso', href: '#' },
      { label: 'Privacidad', href: '/privacy' },
    ],
  },
];

export default function Footer() {
  const scrollTo = (href) => {
    if (href.startsWith('#')) {
      const el = document.querySelector(href);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <footer className="bg-[#0A0F1E] border-t border-white/5 px-5 pt-16 pb-8">
      <div className="max-w-6xl mx-auto">

        {/* Top: logo + links */}
        <div className="flex flex-col md:flex-row gap-12 mb-12">

          {/* Brand */}
          <div className="flex-shrink-0 max-w-xs">
            <div className="flex items-center gap-2.5 mb-4">
              <img
                src="/Zynergia%20Logo.png"
                alt="Zynergia"
                className="h-8 w-8 rounded-xl object-cover"
              />
              <span className="text-white font-bold text-lg">Zynergia</span>
            </div>
            <p className="text-white/40 text-sm leading-relaxed">
              La app de seguimiento para distribuidores que quieren crecer sin perder
              ningún contacto en el camino.
            </p>
          </div>

          {/* Links */}
          <div className="flex flex-wrap gap-12 flex-1 justify-start md:justify-end">
            {FOOTER_LINKS.map((group) => (
              <div key={group.heading}>
                <h4 className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-4">
                  {group.heading}
                </h4>
                <ul className="space-y-2.5">
                  {group.links.map((link) => (
                    <li key={link.label}>
                      {link.href.startsWith('#') ? (
                        <button
                          onClick={() => scrollTo(link.href)}
                          className="text-white/50 hover:text-white text-sm transition-colors"
                        >
                          {link.label}
                        </button>
                      ) : (
                        <a
                          href={link.href}
                          className="text-white/50 hover:text-white text-sm transition-colors"
                        >
                          {link.label}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-white/5 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-white/30 text-xs">
            © {new Date().getFullYear()} Zynergia. Todos los derechos reservados.
          </p>
          <div className="flex items-center gap-5 text-white/30 text-xs">
            <span>iOS · Android</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

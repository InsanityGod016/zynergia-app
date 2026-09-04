import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { QrCode, FileText, Package, ChevronRight } from 'lucide-react';
import MainHeader from '@/components/ui/MainHeader';

const marketingItems = [
  {
    icon: QrCode,
    title: 'Crear código QR',
    description: 'Crea un código fácil de compartir',
    page: 'QRGenerator'
  },
  {
    icon: FileText,
    title: 'Mensajes para WhatsApp',
    description: 'Elige y personaliza un mensaje listo para enviar',
    page: 'Templates'
  },
  {
    icon: Package,
    title: 'Mis productos',
    description: 'Revisa y organiza tu lista de productos',
    page: 'Products'
  }
];

export default function Marketing() {
  return (
    <div className="px-5 pb-6 pt-[calc(1.5rem+env(safe-area-inset-top))]">
      <MainHeader title="Herramientas" />

      <p className="mb-5 text-base leading-relaxed text-muted-foreground">
        Elige lo que quieres hacer.
      </p>

      <div className="space-y-3">
        {marketingItems.map(item => (
          <Link
            key={item.page}
            to={createPageUrl(item.page)}
            className="flex min-h-24 items-center gap-4 rounded-3xl border border-border bg-card p-5 outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary"
          >
            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-primary/10">
              <item.icon className="h-6 w-6 text-primary" strokeWidth={2} aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-bold text-foreground">{item.title}</h2>
              <p className="mt-1 text-[15px] leading-relaxed text-muted-foreground">{item.description}</p>
            </div>
            <ChevronRight className="h-6 w-6 shrink-0 text-muted-foreground" aria-hidden="true" />
          </Link>
        ))}
      </div>
    </div>
  );
}

import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { QrCode, FileText, Package } from 'lucide-react';
import MainHeader from '@/components/ui/MainHeader';

const marketingItems = [
  {
    icon: QrCode,
    title: 'Generador QR',
    description: 'Crea códigos QR para tus productos',
    page: 'QRGenerator'
  },
  {
    icon: FileText,
    title: 'Mis Plantillas',
    description: 'Mensajes predefinidos para WhatsApp',
    page: 'Templates'
  },
  {
    icon: Package,
    title: 'Productos',
    description: 'Gestiona tu catálogo de productos',
    page: 'Products'
  }
];

export default function Marketing() {
  return (
    <div className="px-5 pt-8 pb-6">
      <MainHeader title="Marketing" />

      <div className="space-y-3">
        {marketingItems.map(item => (
          <Link
            key={item.page}
            to={createPageUrl(item.page)}
            className="block bg-white rounded-2xl p-5 border border-[#E2E8F0] hover:border-[#CBD5E1] transition-all"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#EEF2FF] flex items-center justify-center flex-shrink-0">
                <item.icon className="w-6 h-6 text-[#004AFE]" strokeWidth={2} />
              </div>
              <div>
                <h3 className="font-semibold text-[#0F172A] text-[15px]">
                  {item.title}
                </h3>
                <p className="text-[13px] text-[#64748B] mt-1">
                  {item.description}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
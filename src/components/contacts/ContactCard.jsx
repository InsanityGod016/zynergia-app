import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const typeLabels = {
  cliente_producto: 'Cliente',
  partner: 'Partner',
  prospecto_producto: 'Prosp. producto',
  prospecto_partner: 'Prosp. partner'
};

const typeColors = {
  cliente_producto: 'bg-emerald-50 text-emerald-600',
  partner: 'bg-blue-50 text-[#004AFE]',
  prospecto_producto: 'bg-amber-50 text-amber-600',
  prospecto_partner: 'bg-purple-50 text-purple-600'
};

export default function ContactCard({ contact }) {
  const initials = contact.full_name
    .split(' ')
    .slice(0, 2)
    .map(n => n[0])
    .join('')
    .toUpperCase();

  return (
    <Link
      to={createPageUrl(`ContactDetail?id=${contact.id}`)}
      className="flex items-center gap-3 bg-white rounded-2xl p-3.5 border border-[#F1F5F9] shadow-sm active:scale-[0.99] transition-transform"
    >
      {/* Avatar */}
      <div className="w-10 h-10 rounded-full bg-[#EEF2FF] flex items-center justify-center flex-shrink-0">
        <span className="text-[13px] font-bold text-[#004AFE]">{initials}</span>
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-[#0F172A] text-[15px] truncate">{contact.full_name}</h3>
        {contact.contact_type && (
          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full inline-block mt-0.5 ${typeColors[contact.contact_type] || 'bg-gray-100 text-gray-500'}`}>
            {typeLabels[contact.contact_type] || contact.contact_type}
          </span>
        )}
      </div>

      <ChevronRight className="w-4 h-4 text-[#CBD5E1] flex-shrink-0" />
    </Link>
  );
}
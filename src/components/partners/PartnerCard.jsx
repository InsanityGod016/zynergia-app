import { differenceInDays, parseISO } from 'date-fns';
import { Smartphone, Download } from 'lucide-react';

const fsColors = {
  activo: { bg: 'bg-[#DCFCE7]', text: 'text-[#16A34A]', label: 'FS Activo' },
  completado: { bg: 'bg-[#EEF2FF]', text: 'text-[#4F46E5]', label: 'Completado' },
  vencido: { bg: 'bg-[#FEE2E2]', text: 'text-[#DC2626]', label: 'FS Vencido' }
};

export default function PartnerCard({ partner, contact, activityStatus, onImportClients, isImporting, onClick }) {
  const today = new Date();
  const deadline = parseISO(partner.fast_start_deadline);
  const startDate = parseISO(partner.start_date);
  const daysLeft = differenceInDays(deadline, today);
  const daysIn = differenceInDays(today, startDate);

  const fsStatus = fsColors[partner.fast_start_status] || fsColors.activo;
  const hasApp = !!partner.partner_user_id;
  const isInactive = activityStatus === 'inactivo';

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl p-4 border shadow-sm active:scale-[0.99] transition-transform cursor-pointer ${isInactive ? 'border-[#FCA5A5]' : 'border-[#F1F5F9]'}`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[16px] font-semibold text-[#0F172A]">
            {contact?.full_name || 'Contacto desconocido'}
          </span>
          {hasApp && !isInactive && (
            <span className="flex items-center gap-1 text-[11px] font-semibold text-[#004AFE] bg-[#EEF2FF] px-2 py-0.5 rounded-full">
              <Smartphone className="w-3 h-3" />
              Activo
            </span>
          )}
          {isInactive && (
            <span className="text-[11px] font-semibold text-[#DC2626] bg-[#FEE2E2] px-2 py-0.5 rounded-full">
              Inactivo
            </span>
          )}
        </div>
        <span className={`text-[12px] font-semibold px-3 py-1 rounded-full ${fsStatus.bg} ${fsStatus.text}`}>
          {fsStatus.label}
        </span>
      </div>

      <div className="flex items-center gap-4 text-[13px] text-[#64748B]">
        <span>Día {daysIn} de Fast Start</span>
        {partner.fast_start_status === 'activo' && (
          <span className={daysLeft <= 10 ? 'text-[#EF4444] font-semibold' : ''}>
            {daysLeft > 0 ? `${daysLeft} días restantes` : 'Vence hoy'}
          </span>
        )}
      </div>

      {isInactive && onImportClients && (
        <button
          onClick={onImportClients}
          disabled={isImporting}
          className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 bg-[#FEF2F2] border border-[#FCA5A5] rounded-xl text-[13px] font-semibold text-[#DC2626] active:scale-[0.98] transition-transform disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          {isImporting ? 'Importando...' : 'Importar clientes'}
        </button>
      )}
    </div>
  );
}
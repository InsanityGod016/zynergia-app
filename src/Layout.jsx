import { useQuery } from '@tanstack/react-query';
import { TriangleAlert } from 'lucide-react';
import BottomNav from '@/components/ui/BottomNav';
import PageTransition from '@/components/ui/PageTransition';
import { getBillingStatus } from '@/lib/subscription';

const pagesWithoutNav = ['ContactDetail', 'NewContact', 'EditContact', 'NewTask', 'Templates', 'Links', 'Products', 'QRGenerator', 'Settings', 'Help', 'EditLink', 'AddImageToQR', 'PreviewQR', 'NewSale1', 'NewSale2', 'NewSale3', 'NewSale4', 'EditProduct', 'EditTemplate', 'SelectMessageTone', 'Notifications'];

export default function Layout({ children, currentPageName }) {
  const hideNav = pagesWithoutNav.includes(currentPageName);
  const { data: billingStatus } = useQuery({
    queryKey: ['billing-status'],
    queryFn: getBillingStatus,
    retry: 1,
    staleTime: 60_000,
  });
  const graceEndDate = billingStatus?.graceEndsAt ? new Date(billingStatus.graceEndsAt) : null;
  const graceEnd = graceEndDate && Number.isFinite(graceEndDate.getTime())
    ? new Intl.DateTimeFormat('es-419', { dateStyle: 'long' }).format(graceEndDate)
    : null;

  return (
    <div className="min-h-dvh bg-background">
      <PageTransition key={currentPageName}>
        <main className={`mx-auto min-h-dvh w-full max-w-lg ${hideNav ? '' : 'pb-[calc(6rem+env(safe-area-inset-bottom))]'}`}>
          {billingStatus?.state === 'grace' && (
            <div className="flex items-start gap-3 border-b border-amber-200 bg-amber-50 px-5 py-4 text-amber-950" role="status">
              <TriangleAlert className="mt-0.5 h-6 w-6 shrink-0" aria-hidden="true" />
              <div>
                <p className="text-[17px] font-bold">Pago pendiente</p>
                <p className="mt-1 text-[15px] leading-relaxed">
                  Puedes usar Zynergia {graceEnd ? `hasta el ${graceEnd}` : 'durante el periodo de gracia'}. Tus datos siguen guardados; abre Ayuda si necesitas resolver el pago.
                </p>
              </div>
            </div>
          )}
          {children}
        </main>
      </PageTransition>
      {!hideNav && <BottomNav />}
    </div>
  );
}

import BottomNav from '@/components/ui/BottomNav';
import PageTransition from '@/components/ui/PageTransition';

const pagesWithoutNav = ['ContactDetail', 'NewContact', 'Templates', 'Links', 'Products', 'QRGenerator', 'Settings', 'Help', 'EditLink', 'AddImageToQR', 'PreviewQR', 'NewSale1', 'NewSale2', 'NewSale3', 'NewSale4', 'EditProduct', 'EditTemplate', 'SelectMessageTone', 'Notifications'];

export default function Layout({ children, currentPageName }) {
  const hideNav = pagesWithoutNav.includes(currentPageName);

  return (
    <div className="bg-[#ffffff] min-h-screen">
      <PageTransition key={currentPageName}>
        <main className={`${hideNav ? '' : 'pb-20'}`}>
          {children}
        </main>
      </PageTransition>
      {!hideNav && <BottomNav />}
    </div>
  );
}
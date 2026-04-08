import { useState, useCallback } from 'react';
import BottomNav from '@/components/ui/BottomNav';
import SplashScreen from '@/components/ui/SplashScreen';
import PageTransition from '@/components/ui/PageTransition';

const pagesWithoutNav = ['ContactDetail', 'NewContact', 'Templates', 'Links', 'Products', 'QRGenerator', 'Settings', 'Help', 'EditLink', 'AddImageToQR', 'PreviewQR', 'NewSale1', 'NewSale2', 'NewSale3', 'NewSale4', 'EditProduct', 'EditTemplate', 'SelectMessageTone', 'Notifications'];

const SPLASH_SHOWN_KEY = 'zynergia_splash_shown';

export default function Layout({ children, currentPageName }) {
  const hideNav = pagesWithoutNav.includes(currentPageName);
  const [showSplash, setShowSplash] = useState(() => {
    if (typeof window === 'undefined') return false;
    const shown = sessionStorage.getItem(SPLASH_SHOWN_KEY);
    return !shown;
  });

  const handleSplashComplete = useCallback(() => {
    sessionStorage.setItem(SPLASH_SHOWN_KEY, '1');
    setShowSplash(false);
  }, []);

  return (
    <div className="bg-[#ffffff] min-h-screen">
      {showSplash && <SplashScreen onComplete={handleSplashComplete} />}
      <PageTransition key={currentPageName}>
        <main className={`${hideNav ? '' : 'pb-20'}`}>
          {children}
        </main>
      </PageTransition>
      {!hideNav && <BottomNav />}
    </div>
  );
}
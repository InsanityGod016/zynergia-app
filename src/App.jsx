import { useState, useEffect, useCallback } from 'react';
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import Onboarding from '@/pages/Onboarding';
import Paywall from '@/pages/Paywall';
import Login from '@/pages/Login';
import Landing from '@/pages/Landing';
import { hasActiveSubscription } from '@/lib/subscription';
import { StatusBar, Style } from '@capacitor/status-bar';
import { App as CapApp } from '@capacitor/app';
import SplashScreen from '@/components/ui/SplashScreen';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const { isLoadingAuth, isAuthenticated, user } = useAuth();
  const [onboardingDone, setOnboardingDone] = useState(null); // null = checking

  useEffect(() => {
    if (!user) return;
    const localDone = !!localStorage.getItem(`zynergia_onboarding_done_${user.id}`);
    if (localDone) {
      setOnboardingDone(true);
    } else {
      // Check Supabase: if profile already exists, skip onboarding (new device / cleared cache)
      import('@/api/db').then(({ db }) => {
        db.Settings.list().then(settings => {
          if (settings?.[0]?.user_name) {
            localStorage.setItem(`zynergia_onboarding_done_${user.id}`, 'true');
            setOnboardingDone(true);
          } else {
            setOnboardingDone(false);
          }
        }).catch(() => setOnboardingDone(false));
      });
    }
  }, [user]);
  const [subscribed, setSubscribed] = useState(null);

  useEffect(() => {
    if (isAuthenticated && onboardingDone) {
      hasActiveSubscription()
        .then(setSubscribed)
        .catch(() => setSubscribed(true)); // on error let user in rather than hard-block
    }
  }, [isAuthenticated, onboardingDone]);

  if (isLoadingAuth || (isAuthenticated && onboardingDone === null)) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  if (onboardingDone === false) {
    return <Onboarding mode="profile" onComplete={() => setOnboardingDone(true)} />;
  }

  if (subscribed === null) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-[#004AFE] rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!subscribed) {
    return <Paywall onSubscribed={() => setSubscribed(true)} />;
  }

  return (
    <Routes>
      <Route path="/" element={
        <LayoutWrapper currentPageName={mainPageKey}>
          <MainPage />
        </LayoutWrapper>
      } />
      {Object.entries(Pages).map(([path, Page]) => (
        <Route
          key={path}
          path={`/${path}`}
          element={
            <LayoutWrapper currentPageName={path}>
              <Page />
            </LayoutWrapper>
          }
        />
      ))}
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {
  const [splashDone, setSplashDone] = useState(false);
  const [introSeen, setIntroSeen] = useState(() => !!localStorage.getItem('zynergia_intro_seen'));

  const handleSplashComplete = useCallback(() => setSplashDone(true), []);
  const handleIntroComplete = useCallback(() => {
    localStorage.setItem('zynergia_intro_seen', 'true');
    setIntroSeen(true);
  }, []);

  useEffect(() => {
    StatusBar.setStyle({ style: Style.Default }).catch(() => {});
    StatusBar.setBackgroundColor({ color: '#ffffff' }).catch(() => {});

    const handlerPromise = CapApp.addListener('backButton', () => {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        CapApp.exitApp();
      }
    });
    return () => { handlerPromise.then(h => h.remove()); };
  }, []);

  // Ruta pública: /landing (no requiere auth ni splash)
  if (window.location.pathname === '/landing') {
    return (
      <Router>
        <Routes>
          <Route path="/landing" element={<Landing />} />
        </Routes>
      </Router>
    );
  }

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        {!splashDone ? (
          <SplashScreen onComplete={handleSplashComplete} />
        ) : !introSeen ? (
          <Onboarding mode="intro" onComplete={handleIntroComplete} />
        ) : (
          <Router>
            <NavigationTracker />
            <AuthenticatedApp />
          </Router>
        )}
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App

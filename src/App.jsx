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
import Register from '@/pages/Register';
import { hasActiveSubscription } from '@/lib/subscription';
import SplashScreen from '@/components/ui/SplashScreen';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const isNative = typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.() === true;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const { isLoadingAuth, isAuthenticated, user } = useAuth();
  const [onboardingDone, setOnboardingDone] = useState(null);

  useEffect(() => {
    if (!user) return;
    const localDone = !!localStorage.getItem(`zynergia_onboarding_done_${user.id}`);
    if (localDone) {
      setOnboardingDone(true);
    } else {
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
        .catch(() => setSubscribed(true));
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
  // On web (non-native), skip splash screen and intro video entirely
  const [splashDone, setSplashDone] = useState(() => !isNative);
  const [introSeen, setIntroSeen] = useState(() =>
    !isNative || !!localStorage.getItem('zynergia_intro_seen')
  );

  const handleSplashComplete = useCallback(() => setSplashDone(true), []);
  const handleIntroComplete = useCallback(() => {
    localStorage.setItem('zynergia_intro_seen', 'true');
    setIntroSeen(true);
  }, []);

  useEffect(() => {
    if (!isNative) return;
    // Dynamic imports so web build never tries to resolve native-only modules
    import('@capacitor/status-bar').then(({ StatusBar, Style }) => {
      StatusBar.setStyle({ style: Style.Default }).catch(() => {});
      StatusBar.setBackgroundColor({ color: '#ffffff' }).catch(() => {});
    }).catch(() => {});

    let cleanup = () => {};
    import('@capacitor/app').then(({ App: CapApp }) => {
      const handlerPromise = CapApp.addListener('backButton', () => {
        if (window.history.length > 1) {
          window.history.back();
        } else {
          CapApp.exitApp();
        }
      });
      cleanup = () => { handlerPromise.then(h => h.remove()); };
    }).catch(() => {});

    return () => cleanup();
  }, []);

  // Public routes — no auth, no splash, no query client needed
  const pathname = window.location.pathname;
  if (pathname === '/landing' || pathname.startsWith('/register')) {
    return (
      <Router>
        <Routes>
          <Route path="/landing" element={<Landing />} />
          <Route path="/register" element={<Register />} />
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

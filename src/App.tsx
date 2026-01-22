import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card } from './components/ui/card';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { Toaster } from './components/ui/sonner';
import { toast } from 'sonner';
import { ConsumerApp, type ConsumerAppView } from './components/consumer-app-complete';
import { ConsumerAppMobile } from './components/consumer-app-mobile';
import { 
  Sparkles, 
  Shield, 
  ChefHat, 
  Lock,
  Mail,
  LogOut,
  Crown,
  User,
  Utensils,
  BookOpen,
  Clock,
  UserCircle,
  Loader2,
  MessageSquare
} from 'lucide-react';
import { onAuthStateChange, signInWithEmail, signUpWithEmail, signInWithGoogle, signOutUser } from './lib/firebase-auth';
import { type UserProfile } from './lib/types';
import type { User as FirebaseUser } from 'firebase/auth';
import { getDemoData } from './lib/demo-data';

export default function App() {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [activePage, setActivePage] = useState('dashboard');
  const [isDemoMode, setIsDemoMode] = useState(false);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      const mobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768;
      setIsMobile(mobile);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Listen for authentication state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChange(async (user) => {
      setCurrentUser(user);
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignUp) {
        if (!displayName.trim()) {
          setError('Please enter your name');
          setLoading(false);
          return;
        }
        if (!username.trim() || username.length < 3) {
          setError('Please enter a valid username (at least 3 characters)');
          setLoading(false);
          return;
        }
        const { user, profile } = await signUpWithEmail(email, password, username, displayName);
        setCurrentUser(user);
        setUserProfile(profile);
        toast.success('Account created successfully!');
        setEmail('');
        setPassword('');
        setUsername('');
        setDisplayName('');
      } else {
        const { user, profile } = await signInWithEmail(email, password);
        setCurrentUser(user);
        setUserProfile(profile);
        toast.success('Welcome back!');
        setEmail('');
        setPassword('');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Authentication failed';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);

    try {
      const { user, profile } = await signInWithGoogle();
      setCurrentUser(user);
      setUserProfile(profile);
      toast.success('Signed in with Google!');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Google sign in failed';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      // Only call Firebase signout if not in demo mode
      if (!isDemoMode) {
        await signOutUser();
      }
      setCurrentUser(null);
      setUserProfile(null);
      setIsDemoMode(false);
      toast.success('Logged out successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to logout';
      toast.error(errorMessage);
    }
  };

  const quickLogin = () => {
    // Demo login - loads demo data for testing
    const demoData = getDemoData();
    
    setCurrentUser({
      uid: demoData.profile.uid,
      email: demoData.profile.email,
      displayName: demoData.profile.displayName,
    } as FirebaseUser);
    
    setUserProfile(demoData.profile);
    setIsDemoMode(true);
    toast.success('Demo mode activated - using demo data');
  };

  // Show loading spinner while checking auth state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  // If user is logged in, show the Diner Portal
  if (currentUser) {
    // Map activePage to ConsumerApp view (desktop)
    const mapPageToView = (page: string): ConsumerAppView => {
      if (page === 'dashboard') return 'discover';
      return page as ConsumerAppView;
    };

    const mapViewToPage = (view: ConsumerAppView): string => {
      if (view === 'discover') return 'dashboard';
      return view;
    };

    // Map activePage to ConsumerAppMobile tab (mobile)
    const mapPageToTab = (page: string): 'home' | 'reservations' | 'saved' | 'waitlist' | 'messages' | 'profile' => {
      if (page === 'dashboard') return 'home';
      if (page === 'experiences') return 'saved';
      if (page === 'waitlist') return 'waitlist';
      if (page === 'messages') return 'messages';
      if (page === 'reservations') return 'reservations';
      return page as 'home' | 'reservations' | 'saved' | 'waitlist' | 'messages' | 'profile';
    };

    const mapTabToPage = (tab: 'home' | 'reservations' | 'saved' | 'waitlist' | 'messages' | 'profile'): string => {
      if (tab === 'home') return 'dashboard';
      if (tab === 'saved') return 'experiences';
      if (tab === 'waitlist') return 'waitlist';
      if (tab === 'messages') return 'messages';
      if (tab === 'reservations') return 'reservations';
      return tab;
    };

    const handleViewChange = (view: ConsumerAppView) => {
      setActivePage(mapViewToPage(view));
    };

    const handleTabChange = (tab: 'home' | 'reservations' | 'saved' | 'waitlist' | 'messages' | 'profile') => {
      setActivePage(mapTabToPage(tab));
    };

    // Mobile view - render ConsumerAppMobile without header
    if (isMobile) {
      return (
        <>
          <Toaster richColors position="top-right" />
          <ConsumerAppMobile 
            activeTab={mapPageToTab(activePage)} 
            onTabChange={handleTabChange}
            isDemoMode={isDemoMode}
            currentUser={currentUser}
            userProfile={userProfile}
          />
        </>
      );
    }

    // Desktop view - render with header and ConsumerApp
    return (
      <>
        <Toaster richColors position="top-right" />
        <div className="min-h-screen bg-slate-900">
          {/* Top Navigation Bar - Slim Semi-Rounded Style */}
          <header className="sticky top-0 z-50" style={{ backgroundColor: '#061322' }}>
            {/* Menu Bar - Top Section */}
            <div className="h-16 flex items-center justify-between px-20 py-3 border-b border-slate-800">
              {/* Left Side - App Icon/Logo */}
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center shadow-lg">
                  <Crown className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg text-slate-100">ReserveAI</h1>
                  <p className="text-xs text-slate-400">Diner Portal</p>
                </div>
              </div>

              {/* Right Side - User Info & Logout Button */}
              <div className="flex items-center gap-4">
                {/* User Info - Now with logout button style */}
                <div 
                  className="rounded-lg flex items-center gap-2 transition-all duration-200"
                  style={{
                    backgroundColor: '#1E2B3C',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.25)',
                    fontFamily: 'Inter, system-ui, sans-serif',
                    fontWeight: 500,
                    fontSize: '14px',
                    color: '#A9B6C5',
                    height: '36px',
                    paddingLeft: '16px',
                    paddingRight: '16px',
                    borderRadius: '12px',
                  }}
                >
                  <User className="w-4 h-4" style={{ color: '#A9B6C5' }} />
                  <span>{userProfile?.displayName || currentUser.displayName || currentUser.email || 'User'}</span>
                </div>

                {/* Logout Button - Now with username container style */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 rounded-lg border border-slate-700 transition-all duration-200 hover:bg-slate-700/70 hover:border-slate-600"
                >
                  <LogOut className="w-4 h-4 text-slate-400" />
                  <span className="text-sm text-slate-300">Logout</span>
                </motion.button>
              </div>
            </div>

            {/* Navbar - Bottom Section */}
            <div className="h-16 flex items-center justify-center px-12 py-3">
              {/* Navbar Container - 90% Width Semi-Rounded Bar */}
              <div 
                className="flex items-center justify-center rounded-xl w-full"
                style={{
                  backgroundColor: '#1E2B3C',
                  height: '36px',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.25)',
                  borderRadius: '12px',
                }}
              >
                {/* Navigation Items - Centered & Evenly Spaced */}
                <nav className="flex items-center w-full h-full px-4" style={{ justifyContent: 'space-evenly' }}>
                  {/* Discover */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    className="rounded-lg flex items-center justify-center transition-all duration-200"
                    style={{
                      backgroundColor: activePage === 'dashboard' ? '#2B3D56' : 'transparent',
                      boxShadow: activePage === 'dashboard' ? '0 2px 6px rgba(0, 0, 0, 0.25)' : 'none',
                      fontFamily: 'Inter, system-ui, sans-serif',
                      fontWeight: 500,
                      fontSize: '14px',
                      color: activePage === 'dashboard' ? '#FFFFFF' : '#A9B6C5',
                      flex: '1',
                      height: '28px',
                      paddingLeft: '12px',
                      paddingRight: '12px',
                      paddingTop: '6px',
                      paddingBottom: '6px',
                      gap: '6px',
                      borderRadius: '8px',
                    }}
                    onClick={() => setActivePage('dashboard')}
                    onMouseEnter={(e) => {
                      if (activePage !== 'dashboard') {
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.04)';
                        const icon = e.currentTarget.querySelector('svg');
                        const text = e.currentTarget.querySelector('span');
                        if (icon) (icon as unknown as HTMLElement).style.color = '#C7D4E1';
                        if (text) (text as HTMLElement).style.color = '#C7D4E1';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (activePage !== 'dashboard') {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        const icon = e.currentTarget.querySelector('svg');
                        const text = e.currentTarget.querySelector('span');
                        if (icon) (icon as unknown as HTMLElement).style.color = '#A9B6C5';
                        if (text) (text as HTMLElement).style.color = '#A9B6C5';
                      }
                    }}
                  >
                    <Utensils className="w-4 h-4" style={{ color: activePage === 'dashboard' ? '#FFFFFF' : '#A9B6C5' }} />
                    <span style={{ color: activePage === 'dashboard' ? '#FFFFFF' : '#A9B6C5' }}>Discover</span>
                  </motion.button>

                  {/* Experiences */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    className="rounded-lg flex items-center justify-center transition-all duration-200"
                    style={{
                      backgroundColor: activePage === 'experiences' ? '#2B3D56' : 'transparent',
                      boxShadow: activePage === 'experiences' ? '0 2px 6px rgba(0, 0, 0, 0.25)' : 'none',
                      fontFamily: 'Inter, system-ui, sans-serif',
                      fontWeight: 500,
                      fontSize: '14px',
                      color: activePage === 'experiences' ? '#FFFFFF' : '#A9B6C5',
                      flex: '1',
                      height: '28px',
                      paddingLeft: '12px',
                      paddingRight: '12px',
                      paddingTop: '6px',
                      paddingBottom: '6px',
                      gap: '6px',
                      borderRadius: '8px',
                    }}
                    onClick={() => setActivePage('experiences')}
                    onMouseEnter={(e) => {
                      if (activePage !== 'experiences') {
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.04)';
                        const icon = e.currentTarget.querySelector('svg');
                        const text = e.currentTarget.querySelector('span');
                        if (icon) (icon as unknown as HTMLElement).style.color = '#C7D4E1';
                        if (text) (text as HTMLElement).style.color = '#C7D4E1';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (activePage !== 'experiences') {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        const icon = e.currentTarget.querySelector('svg');
                        const text = e.currentTarget.querySelector('span');
                        if (icon) (icon as unknown as HTMLElement).style.color = '#A9B6C5';
                        if (text) (text as HTMLElement).style.color = '#A9B6C5';
                      }
                    }}
                  >
                    <Sparkles className="w-4 h-4" style={{ color: activePage === 'experiences' ? '#FFFFFF' : '#A9B6C5' }} />
                    <span style={{ color: activePage === 'experiences' ? '#FFFFFF' : '#A9B6C5' }}>Experiences</span>
                  </motion.button>

                  {/* Reservations */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    className="rounded-lg flex items-center justify-center transition-all duration-200"
                    style={{
                      backgroundColor: activePage === 'reservations' ? '#2B3D56' : 'transparent',
                      boxShadow: activePage === 'reservations' ? '0 2px 6px rgba(0, 0, 0, 0.25)' : 'none',
                      fontFamily: 'Inter, system-ui, sans-serif',
                      fontWeight: 500,
                      fontSize: '14px',
                      color: activePage === 'reservations' ? '#FFFFFF' : '#A9B6C5',
                      flex: '1',
                      height: '28px',
                      paddingLeft: '12px',
                      paddingRight: '12px',
                      paddingTop: '6px',
                      paddingBottom: '6px',
                      gap: '6px',
                      borderRadius: '8px',
                    }}
                    onClick={() => setActivePage('reservations')}
                    onMouseEnter={(e) => {
                      if (activePage !== 'reservations') {
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.04)';
                        const icon = e.currentTarget.querySelector('svg');
                        const text = e.currentTarget.querySelector('span');
                        if (icon) (icon as unknown as HTMLElement).style.color = '#C7D4E1';
                        if (text) (text as HTMLElement).style.color = '#C7D4E1';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (activePage !== 'reservations') {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        const icon = e.currentTarget.querySelector('svg');
                        const text = e.currentTarget.querySelector('span');
                        if (icon) (icon as unknown as HTMLElement).style.color = '#A9B6C5';
                        if (text) (text as HTMLElement).style.color = '#A9B6C5';
                      }
                    }}
                  >
                    <BookOpen className="w-4 h-4" style={{ color: activePage === 'reservations' ? '#FFFFFF' : '#A9B6C5' }} />
                    <span style={{ color: activePage === 'reservations' ? '#FFFFFF' : '#A9B6C5' }}>Reservations</span>
                  </motion.button>

                  {/* Waitlist */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    className="rounded-lg flex items-center justify-center transition-all duration-200"
                    style={{
                      backgroundColor: activePage === 'waitlist' ? '#2B3D56' : 'transparent',
                      boxShadow: activePage === 'waitlist' ? '0 2px 6px rgba(0, 0, 0, 0.25)' : 'none',
                      fontFamily: 'Inter, system-ui, sans-serif',
                      fontWeight: 500,
                      fontSize: '14px',
                      color: activePage === 'waitlist' ? '#FFFFFF' : '#A9B6C5',
                      flex: '1',
                      height: '28px',
                      paddingLeft: '12px',
                      paddingRight: '12px',
                      paddingTop: '6px',
                      paddingBottom: '6px',
                      gap: '6px',
                      borderRadius: '8px',
                    }}
                    onClick={() => setActivePage('waitlist')}
                    onMouseEnter={(e) => {
                      if (activePage !== 'waitlist') {
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.04)';
                        const icon = e.currentTarget.querySelector('svg');
                        const text = e.currentTarget.querySelector('span');
                        if (icon) (icon as unknown as HTMLElement).style.color = '#C7D4E1';
                        if (text) (text as HTMLElement).style.color = '#C7D4E1';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (activePage !== 'waitlist') {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        const icon = e.currentTarget.querySelector('svg');
                        const text = e.currentTarget.querySelector('span');
                        if (icon) (icon as unknown as HTMLElement).style.color = '#A9B6C5';
                        if (text) (text as HTMLElement).style.color = '#A9B6C5';
                      }
                    }}
                  >
                    <Clock className="w-4 h-4" style={{ color: activePage === 'waitlist' ? '#FFFFFF' : '#A9B6C5' }} />
                    <span style={{ color: activePage === 'waitlist' ? '#FFFFFF' : '#A9B6C5' }}>Waitlist</span>
                  </motion.button>

                  {/* Messages */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    className="rounded-lg flex items-center justify-center transition-all duration-200"
                    style={{
                      backgroundColor: activePage === 'messages' ? '#2B3D56' : 'transparent',
                      boxShadow: activePage === 'messages' ? '0 2px 6px rgba(0, 0, 0, 0.25)' : 'none',
                      fontFamily: 'Inter, system-ui, sans-serif',
                      fontWeight: 500,
                      fontSize: '14px',
                      color: activePage === 'messages' ? '#FFFFFF' : '#A9B6C5',
                      flex: '1',
                      height: '28px',
                      paddingLeft: '12px',
                      paddingRight: '12px',
                      paddingTop: '6px',
                      paddingBottom: '6px',
                      gap: '6px',
                      borderRadius: '8px',
                    }}
                    onClick={() => setActivePage('messages')}
                    onMouseEnter={(e) => {
                      if (activePage !== 'messages') {
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.04)';
                        const icon = e.currentTarget.querySelector('svg');
                        const text = e.currentTarget.querySelector('span');
                        if (icon) (icon as unknown as HTMLElement).style.color = '#C7D4E1';
                        if (text) (text as HTMLElement).style.color = '#C7D4E1';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (activePage !== 'messages') {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        const icon = e.currentTarget.querySelector('svg');
                        const text = e.currentTarget.querySelector('span');
                        if (icon) (icon as unknown as HTMLElement).style.color = '#A9B6C5';
                        if (text) (text as HTMLElement).style.color = '#A9B6C5';
                      }
                    }}
                  >
                    <MessageSquare className="w-4 h-4" style={{ color: activePage === 'messages' ? '#FFFFFF' : '#A9B6C5' }} />
                    <span style={{ color: activePage === 'messages' ? '#FFFFFF' : '#A9B6C5' }}>Messages</span>
                  </motion.button>

                  {/* Profile */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    className="rounded-lg flex items-center justify-center transition-all duration-200"
                    style={{
                      backgroundColor: activePage === 'profile' ? '#2B3D56' : 'transparent',
                      boxShadow: activePage === 'profile' ? '0 2px 6px rgba(0, 0, 0, 0.25)' : 'none',
                      fontFamily: 'Inter, system-ui, sans-serif',
                      fontWeight: 500,
                      fontSize: '14px',
                      color: activePage === 'profile' ? '#FFFFFF' : '#A9B6C5',
                      flex: '1',
                      height: '28px',
                      paddingLeft: '12px',
                      paddingRight: '12px',
                      paddingTop: '6px',
                      paddingBottom: '6px',
                      gap: '6px',
                      borderRadius: '8px',
                    }}
                    onClick={() => setActivePage('profile')}
                    onMouseEnter={(e) => {
                      if (activePage !== 'profile') {
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.04)';
                        const icon = e.currentTarget.querySelector('svg');
                        const text = e.currentTarget.querySelector('span');
                        if (icon) (icon as unknown as HTMLElement).style.color = '#C7D4E1';
                        if (text) (text as HTMLElement).style.color = '#C7D4E1';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (activePage !== 'profile') {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        const icon = e.currentTarget.querySelector('svg');
                        const text = e.currentTarget.querySelector('span');
                        if (icon) (icon as unknown as HTMLElement).style.color = '#A9B6C5';
                        if (text) (text as HTMLElement).style.color = '#A9B6C5';
                      }
                    }}
                  >
                    <UserCircle className="w-4 h-4" style={{ color: activePage === 'profile' ? '#FFFFFF' : '#A9B6C5' }} />
                    <span style={{ color: activePage === 'profile' ? '#FFFFFF' : '#A9B6C5' }}>Profile</span>
                  </motion.button>
                </nav>
              </div>
            </div>
          </header>
          
          {/* Page Content - Use ConsumerApp Component */}
          <ConsumerApp 
            activeView={mapPageToView(activePage)} 
            onViewChange={handleViewChange}
            isDemoMode={isDemoMode}
            currentUser={currentUser}
            userProfile={userProfile}
          />
        </div>
      </>
    );
  }

  // Login Screen
  return (
    <>
      <Toaster richColors position="top-right" />
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
      <div className="w-full max-w-6xl">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Side - Branding */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-6"
          >
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-xl">
                <Crown className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl text-slate-100">ReserveAI</h1>
                <p className="text-slate-400">Restaurant Ecosystem</p>
              </div>
            </div>

            <div className="space-y-4 pt-8">
              <h2 className="text-4xl text-slate-100">
                Welcome to the Future of{' '}
                <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                  Dining
                </span>
              </h2>
              <p className="text-lg text-slate-400">
                Your AI-powered platform for discovering and booking unforgettable dining experiences.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-6">
              <Card className="p-4 bg-slate-800 border-slate-700">
                <div className="flex items-center gap-3 mb-2">
                  <Sparkles className="w-5 h-5 text-blue-400" />
                  <span className="text-slate-200">AI-Powered</span>
                </div>
                <p className="text-sm text-slate-400">Intelligent automation throughout</p>
              </Card>
              
              <Card className="p-4 bg-slate-800 border-slate-700">
                <div className="flex items-center gap-3 mb-2">
                  <Shield className="w-5 h-5 text-cyan-400" />
                  <span className="text-slate-200">Secure Access</span>
                </div>
                <p className="text-sm text-slate-400">Role-based permissions</p>
              </Card>
            </div>
          </motion.div>

          {/* Right Side - Login Form */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Card className="p-8 bg-slate-800 border-slate-700 shadow-2xl">
              <div className="mb-6">
                <h3 className="text-2xl text-slate-100 mb-2">
                  {isSignUp ? 'Create Account' : 'Sign In'}
                </h3>
                <p className="text-slate-400">
                  {isSignUp 
                    ? 'Create your account to get started' 
                    : 'Enter your credentials to access your portal'}
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-5">
                {isSignUp && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="displayName" className="text-slate-200">Full Name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-500" />
                        <Input
                          id="displayName"
                          type="text"
                          placeholder="John Doe"
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          className="pl-10 bg-slate-700 border-slate-600 text-slate-100 placeholder:text-slate-500 focus:border-blue-500"
                          required={isSignUp}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="username" className="text-slate-200">Username</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-500" />
                        <Input
                          id="username"
                          type="text"
                          placeholder="johndoe"
                          value={username}
                          onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                          className="pl-10 bg-slate-700 border-slate-600 text-slate-100 placeholder:text-slate-500 focus:border-blue-500"
                          required={isSignUp}
                          minLength={3}
                          maxLength={20}
                        />
                      </div>
                      <p className="text-xs text-slate-500">3-20 characters, lowercase letters, numbers, and underscores only</p>
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-slate-200">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 bg-slate-700 border-slate-600 text-slate-100 placeholder:text-slate-500 focus:border-blue-500"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-slate-200">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 bg-slate-700 border-slate-600 text-slate-100 placeholder:text-slate-500 focus:border-blue-500"
                      required
                    />
                  </div>
                </div>

                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg"
                    >
                      <p className="text-sm text-red-400">{error}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {isSignUp ? 'Creating Account...' : 'Signing In...'}
                    </>
                  ) : (
                    isSignUp ? 'Create Account' : 'Sign In'
                  )}
                </Button>

                {/* Google Sign In Button */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-slate-700" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-slate-800 px-2 text-slate-500">Or continue with</span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  disabled={loading}
                  onClick={handleGoogleSignIn}
                  className="w-full border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white hover:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                  )}
                  Sign in with Google
                </Button>

                {/* Toggle Sign Up / Sign In */}
                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsSignUp(!isSignUp);
                      setError('');
                    }}
                    className="text-sm text-slate-400 hover:text-blue-400 transition-colors"
                  >
                    {isSignUp 
                      ? 'Already have an account? Sign in' 
                      : "Don't have an account? Sign up"}
                  </button>
                </div>
              </form>

              <div className="mt-8 pt-6 border-t border-slate-700">
                <p className="text-sm text-slate-400 mb-4">Quick Access - Demo Account:</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={quickLogin}
                  disabled={loading}
                  className="w-full border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white hover:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChefHat className="w-4 h-4 mr-2" />
                  Login as Diner
                </Button>
                <p className="text-xs text-slate-500 mt-4 text-center">
                  Demo account uses email: <code className="text-slate-400">diner@demo.com</code> / password: <code className="text-slate-400">demo123</code>
                </p>
              </div>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
    </>
  );
}
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card } from './components/ui/card';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { Toaster } from './components/ui/sonner';
import { ConsumerApp } from './components/consumer-app-complete';
import { ConsumerAppMobile } from './components/consumer-app-mobile';
import { 
  Sparkles, 
  Shield, 
  ChefHat, 
  Lock,
  Mail,
  LogOut,
  Crown,
  User
} from 'lucide-react';

interface UserAccount {
  email: string;
  password: string;
  name: string;
}

// Demo account for testing
const demoAccount: UserAccount = {
  email: 'diner@demo.com',
  password: 'demo123',
  name: 'John Doe'
};

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isMobile, setIsMobile] = useState(false);

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

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (email === demoAccount.email && password === demoAccount.password) {
      setCurrentUser(demoAccount);
      setEmail('');
      setPassword('');
    } else {
      setError('Invalid email or password');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

  const quickLogin = () => {
    setCurrentUser(demoAccount);
  };

  // If user is logged in, show the Diner Portal
  if (currentUser) {
    // Choose mobile or desktop version
    const ConsumerComponent = isMobile ? ConsumerAppMobile : ConsumerApp;

    return (
      <>
        <Toaster richColors position="top-right" />
        <div className="min-h-screen bg-slate-900">
          {/* App Header */}
          <div className="border-b bg-slate-800/50 backdrop-blur-sm sticky top-0 z-50 border-slate-700">
            <div className="container mx-auto px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center shadow-lg"
                  >
                    <ChefHat className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </motion.div>
                  <div>
                    <h1 className="text-base sm:text-lg md:text-xl text-slate-100">ReserveAI</h1>
                    <p className="text-xs sm:text-sm text-slate-400">Diner Portal</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
                  <div className="hidden sm:flex items-center gap-2 sm:gap-3 px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 bg-slate-700/50 rounded-lg">
                    <User className="w-3 h-3 sm:w-4 sm:h-4 text-slate-400" />
                    <span className="text-xs sm:text-sm text-slate-200">{currentUser.name}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLogout}
                    className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white h-8 sm:h-9 px-2 sm:px-3"
                  >
                    <LogOut className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
                    <span className="hidden sm:inline">Logout</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
          
          <ConsumerComponent />
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
                <h3 className="text-2xl text-slate-100 mb-2">Sign In</h3>
                <p className="text-slate-400">Enter your credentials to access your portal</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-5">
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
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-lg"
                >
                  Sign In
                </Button>
              </form>

              <div className="mt-8 pt-6 border-t border-slate-700">
                <p className="text-sm text-slate-400 mb-4">Quick Access - Demo Account:</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={quickLogin}
                  className="w-full border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white hover:border-blue-500"
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

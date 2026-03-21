import React, { useState } from 'react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../firebase';
import { ShieldCheck, BarChart3, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

const Login: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setIsLoading(true);
    setError(null);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (e: any) {
      console.error("Login Error:", e);
      setError(e.message || "Failed to sign in. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fffcf0] flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-[3rem] shadow-2xl overflow-hidden border-4 border-[#ffcc00]"
      >
        <div className="bg-[#c1272d] p-12 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
             <BarChart3 className="w-64 h-64 -rotate-12 transform -translate-x-16 -translate-y-16" />
          </div>
          <div className="relative z-10">
            <div className="inline-flex p-4 bg-[#ffcc00] rounded-3xl text-[#c1272d] shadow-xl mb-6">
              <BarChart3 className="w-10 h-10" />
            </div>
            <h1 className="text-4xl font-black text-white uppercase tracking-tight leading-none mb-2">India Post</h1>
            <p className="text-[10px] text-[#ffcc00] font-black uppercase tracking-[0.3em]">Philately Inventory System</p>
          </div>
        </div>

        <div className="p-12">
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-2">Welcome Back</h2>
              <p className="text-sm text-slate-400 font-bold uppercase tracking-widest">Sign in to access your dashboard</p>
            </div>

            {error && (
              <div className="p-4 bg-rose-50 border-2 border-rose-100 rounded-2xl text-rose-600 text-xs font-bold uppercase tracking-tight flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 flex-shrink-0" />
                {error}
              </div>
            )}

            <button
              onClick={handleLogin}
              disabled={isLoading}
              className="w-full py-5 bg-[#c1272d] text-white rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl shadow-red-200 hover:bg-black transition-all flex items-center justify-center gap-3 group disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" referrerPolicy="no-referrer" />
                  Sign in with Google
                </>
              )}
            </button>

            <div className="flex items-center gap-4 text-slate-200">
              <div className="h-px bg-slate-100 flex-1" />
              <span className="text-[10px] font-black uppercase tracking-widest">Secure Access</span>
              <div className="h-px bg-slate-100 flex-1" />
            </div>

            <p className="text-[10px] text-slate-400 text-center font-bold uppercase tracking-widest leading-relaxed">
              This system is for authorized personnel only. All access is monitored and logged.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;


import React, { useState } from 'react';
import Logo from './Logo';

interface LoginOverlayProps {
  onLogin: (email: string) => void;
}

const LoginOverlay: React.FC<LoginOverlayProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    
    setIsAuthenticating(true);
    setTimeout(() => {
      onLogin(email);
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900 flex items-center justify-center p-4 overflow-hidden">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/10 blur-[120px] rounded-full -mr-64 -mt-64"></div>
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-600/10 blur-[120px] rounded-full -ml-64 -mb-64"></div>
      
      <div className="max-w-md w-full animate-in fade-in zoom-in duration-700">
        <div className="text-center mb-10">
          <div className="flex justify-center mb-8">
            <Logo className="h-20 drop-shadow-2xl" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight mb-2 uppercase italic">Veritas Terminal</h1>
          <p className="text-slate-400 text-sm font-medium">Restricted Access: Investigative Personnel Only</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white/5 border border-white/10 p-8 rounded-3xl backdrop-blur-xl shadow-2xl space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Reporter Email</label>
            <input 
              required
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none placeholder:text-slate-600"
              placeholder="e.g. reporter@press.org"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Access Credentials</label>
            <input 
              required
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none placeholder:text-slate-600"
              placeholder="••••••••"
            />
          </div>

          <button 
            type="submit"
            disabled={isAuthenticating}
            className={`w-full py-4 rounded-xl font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 ${
              isAuthenticating 
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
              : 'bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-900/20 active:scale-[0.98]'
            }`}
          >
            {isAuthenticating ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                Decrypting Archive...
              </>
            ) : 'Establish Connection'}
          </button>
          
          <div className="pt-4 text-center">
            <p className="text-[10px] text-slate-500 leading-relaxed">
              By logging in, you agree to the Investigative Integrity Protocols. All data is cached locally.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginOverlay;

'use client';
import { ShieldCheck } from 'lucide-react';

interface Props {
  authForm: { email: string; password: string; name: string };
  setAuthForm: (form: any) => void;
  isRegisterMode: boolean;
  setIsRegisterMode: (v: boolean) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export default function AuthModal({ authForm, setAuthForm, isRegisterMode, setIsRegisterMode, onSubmit }: Props) {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-3xl z-[5000] flex items-center justify-center p-4">
      <div className="glass-dark w-full max-w-md p-8 rounded-[2.5rem] border-white/10 shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="text-center mb-10">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 bg-indigo-600 rounded-3xl rotate-12 shadow-2xl shadow-indigo-600/40" />
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-3xl rotate-12 opacity-80" />
            <div className="absolute inset-0 flex items-center justify-center">
              <ShieldCheck className="w-10 h-10 text-white" />
            </div>
          </div>
          <h2 className="text-3xl font-black uppercase tracking-tighter gradient-text">Nexus Terminal</h2>
          <p className="text-[8px] font-black text-indigo-400/70 uppercase tracking-[0.3em] mt-2">Authorization Required</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          {isRegisterMode && (
            <div className="space-y-1.5">
              <label className="text-[7px] font-black text-zinc-500 uppercase tracking-widest ml-1">Identity Name</label>
              <input required type="text" placeholder="OPERATIVE NAME" className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white font-bold text-xs focus:border-indigo-500 outline-none transition-all" value={authForm.name} onChange={e => setAuthForm({ ...authForm, name: e.target.value })} />
            </div>
          )}
          <div className="space-y-1.5">
            <label className="text-[7px] font-black text-zinc-500 uppercase tracking-widest ml-1">Channel Access</label>
            <input required type="email" placeholder="EMAIL ADDRESS" className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white font-bold text-xs focus:border-indigo-500 outline-none transition-all" value={authForm.email} onChange={e => setAuthForm({ ...authForm, email: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <label className="text-[7px] font-black text-zinc-500 uppercase tracking-widest ml-1">Secure Key</label>
            <input required type="password" placeholder="PASSWORD" className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white font-bold text-xs focus:border-indigo-500 outline-none transition-all" value={authForm.password} onChange={e => setAuthForm({ ...authForm, password: e.target.value })} />
          </div>
          <button className="w-full py-4 bg-white text-black rounded-2xl font-black uppercase tracking-widest text-[10px] mt-4 hover:bg-indigo-50 transition-all shadow-xl shadow-white/5">
            {isRegisterMode ? 'Initialize Identity' : 'Establish Link'}
          </button>
        </form>
        <button onClick={() => setIsRegisterMode(!isRegisterMode)} className="w-full mt-6 text-[8px] font-black text-zinc-500 uppercase tracking-widest hover:text-white transition-colors">
          {isRegisterMode ? 'Existing identity? Access link' : 'New operative? Request ID'}
        </button>
      </div>
    </div>
  );
}

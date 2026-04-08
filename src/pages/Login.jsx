import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';

export default function Login() {
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        toast.success('Cuenta creada. Revisa tu correo para confirmar.');
      }
    } catch (err) {
      toast.error(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-white flex flex-col items-center justify-center px-6">
      {/* Logo */}
      <div className="mb-10 text-center">
        <div className="w-20 h-20 rounded-3xl bg-[#004AFE] flex items-center justify-center mx-auto mb-4">
          <span className="text-white text-3xl font-bold">Z</span>
        </div>
        <h1 className="text-[28px] font-bold text-[#0F172A]">Zynergia</h1>
        <p className="text-[15px] text-[#64748B] mt-1">
          {mode === 'login' ? 'Inicia sesión para continuar' : 'Crea tu cuenta'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <div>
          <label className="block text-[13px] font-medium text-[#64748B] mb-1.5">
            Correo electrónico
          </label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="tu@correo.com"
            required
            className="w-full px-4 py-3.5 rounded-xl border border-[#E2E8F0] text-[15px] text-[#0F172A] placeholder-[#CBD5E1] focus:outline-none focus:border-[#004AFE] focus:ring-2 focus:ring-[#004AFE]/20 transition-colors"
          />
        </div>

        <div>
          <label className="block text-[13px] font-medium text-[#64748B] mb-1.5">
            Contraseña
          </label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            minLength={6}
            className="w-full px-4 py-3.5 rounded-xl border border-[#E2E8F0] text-[15px] text-[#0F172A] placeholder-[#CBD5E1] focus:outline-none focus:border-[#004AFE] focus:ring-2 focus:ring-[#004AFE]/20 transition-colors"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !email || !password}
          className="w-full py-4 bg-[#004AFE] text-white font-bold text-[16px] rounded-2xl active:scale-[0.98] transition-transform disabled:opacity-60 flex items-center justify-center"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : mode === 'login' ? (
            'Iniciar sesión'
          ) : (
            'Crear cuenta'
          )}
        </button>
      </form>

      <button
        onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
        className="mt-6 text-[14px] text-[#004AFE] font-medium"
      >
        {mode === 'login'
          ? '¿No tienes cuenta? Crear una'
          : '¿Ya tienes cuenta? Inicia sesión'}
      </button>
    </div>
  );
}

import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { authApi } from "@/services/api";
import LiquidBackground from "@/components/LiquidBackground";
import GlassButton from "@/components/GlassButton";
import GlassInput from "@/components/GlassInput";
import { Wallet } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      await authApi.forgotPassword(email);
      setSuccess(
        "Se o email existir em nossa base, um link de redefinição foi enviado. Verifique sua caixa de entrada.",
      );
      setEmail("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Erro ao enviar email. Tente novamente.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative px-4">
      <LiquidBackground />

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <span className="font-heading font-bold text-3xl tracking-tighter text-white">
            FINANÇAS
          </span>
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#29C5F6] to-[#3a4b9f] flex items-center justify-center shadow-[0_4px_15px_rgba(41,197,246,0.3)]">
            <Wallet className="w-5 h-5 text-white" strokeWidth={3} />
          </div>
        </div>

        {/* Card */}
        <div className="glass-panel rounded-2xl p-8">
          <div className="text-center mb-8">
            <h2 className="font-heading text-2xl font-semibold text-white mb-2">
              Esqueceu sua senha?
            </h2>
            <p className="text-sm text-gray-400">
              Digite seu email para receber um link de redefinição
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <GlassInput
              id="forgot-email"
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            {error && (
              <div className="glass-panel rounded-xl p-3 border-l-4 border-l-red-400">
                <p className="text-sm text-red-300">{error}</p>
              </div>
            )}
            {success && (
              <div className="glass-panel rounded-xl p-3 border-l-4 border-l-emerald-400">
                <p className="text-sm text-emerald-300">{success}</p>
              </div>
            )}

            <GlassButton type="submit" loading={loading} className="w-full">
              Enviar Link
            </GlassButton>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Lembrou da senha?{" "}
              <Link
                to="/login"
                className="text-[#007bff] hover:text-white transition-colors border-b border-[#007bff]/30 hover:border-[#007bff] pb-0.5"
              >
                Fazer Login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

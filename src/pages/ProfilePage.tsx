import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/hooks/useAuth";
import { authApi } from "@/services/api";
import GlassButton from "@/components/GlassButton";
import GlassInput from "@/components/GlassInput";
import { useToast } from "@/components/Toast";
import { UserCircle } from "lucide-react";

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [idTelegram, setIdTelegram] = useState("");
  const [usernameTelegram, setUsernameTelegram] = useState("");
  const [saving, setSaving] = useState(false);
  const { showSuccess, showError } = useToast();

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || "");
      setEmail(user.email || "");
      setTelefone(user.telefone || "");
      setIdTelegram(user.id_telegram ? String(user.id_telegram) : "");
      setUsernameTelegram(user.username_telegram || "");
    }
  }, [user]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await authApi.updateProfile({
        full_name: fullName,
        telefone: telefone || null,
        id_telegram: idTelegram ? parseInt(idTelegram) : null,
        username_telegram: usernameTelegram || null,
      });
      await refreshUser();
      showSuccess("Perfil atualizado com sucesso!");
    } catch (err) {
      showError(err instanceof Error ? err.message : "Erro ao atualizar perfil");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="font-heading text-4xl font-semibold text-white tracking-tight">
          Meu Perfil
        </h1>
        <p className="text-gray-400 mt-1">Gerencie suas informações pessoais</p>
      </div>

      <div className="glass-panel rounded-2xl p-8">
        {/* Avatar */}
        <div className="flex items-center gap-4 mb-8 pb-8 border-b border-white/10">
          <div className="w-16 h-16 bg-gradient-to-br from-[#007bff] to-purple-500 rounded-2xl flex items-center justify-center text-white shadow-lg">
            <UserCircle className="w-8 h-8" />
          </div>
          <div>
            <h3 className="font-heading text-xl font-medium text-white">
              {fullName || "Usuário"}
            </h3>
            <p className="text-sm text-gray-400">{email}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <GlassInput
              id="profile-name"
              label="Nome Completo"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
            <GlassInput
              id="profile-email"
              label="Email"
              type="email"
              value={email}
              readOnly
              className="opacity-60"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <GlassInput
              id="profile-phone"
              label="Telefone"
              type="tel"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
            />
            <GlassInput
              id="profile-telegram-id"
              label="ID Telegram (opcional)"
              type="number"
              value={idTelegram}
              onChange={(e) => setIdTelegram(e.target.value)}
            />
          </div>

          <GlassInput
            id="profile-telegram-username"
            label="Username Telegram (opcional)"
            value={usernameTelegram}
            onChange={(e) => setUsernameTelegram(e.target.value)}
          />

          <GlassButton type="submit" loading={saving}>
            Salvar Alterações
          </GlassButton>
        </form>
      </div>
    </div>
  );
}

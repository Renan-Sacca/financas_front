import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { authApi } from "@/services/api";
import type { User } from "@/types";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    full_name: string;
    email: string;
    telefone: string;
    password: string;
  }) => Promise<string>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(
    localStorage.getItem("token"),
  );
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const userData = await authApi.getProfile();
      setUser(userData);
    } catch {
      logout();
    }
  }, [logout]);

  useEffect(() => {
    const init = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const tokenData = await authApi.refreshToken();
        if (tokenData?.access_token) {
          localStorage.setItem("token", tokenData.access_token);
          setToken(tokenData.access_token);
        }
        const userData = await authApi.getProfile();
        setUser(userData);
      } catch {
        logout();
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const login = async (email: string, password: string) => {
    const data = await authApi.login(email, password);
    localStorage.setItem("token", data.access_token);
    setToken(data.access_token);
    const userData = await authApi.getProfile();
    setUser(userData);
  };

  const register = async (formData: {
    full_name: string;
    email: string;
    telefone: string;
    password: string;
  }): Promise<string> => {
    const result = await authApi.register(formData);
    return (
      result.message ||
      "Cadastro realizado com sucesso! Verifique seu email."
    );
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        loading,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

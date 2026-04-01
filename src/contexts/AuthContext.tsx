import React, { createContext, useContext, useState, ReactNode } from "react";

export type UserRole = "admin" | "orgao";

interface User {
  email: string;
  name: string;
  role: UserRole;
  orgaoId?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => boolean;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

const USERS: { email: string; password: string; name: string; role: UserRole; orgaoId?: string }[] = [
  { email: "admin@stc.ma.gov.br", password: "12345", name: "Administrador STC", role: "admin" },
  { email: "saude@ma.gov.br", password: "12345", name: "Secretaria de Saúde", role: "orgao", orgaoId: "org-1" },
  { email: "educacao@ma.gov.br", password: "12345", name: "Secretaria de Educação", role: "orgao", orgaoId: "org-2" },
  { email: "seguranca@ma.gov.br", password: "12345", name: "Secretaria de Segurança", role: "orgao", orgaoId: "org-3" },
  { email: "infraestrutura@ma.gov.br", password: "12345", name: "Secretaria de Infraestrutura", role: "orgao", orgaoId: "org-4" },
  { email: "administracao@ma.gov.br", password: "12345", name: "Secretaria de Administração", role: "orgao", orgaoId: "org-5" },
];

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = sessionStorage.getItem("stc-user");
    return saved ? JSON.parse(saved) : null;
  });

  const login = (email: string, password: string) => {
    const found = USERS.find(u => u.email === email && u.password === password);
    if (found) {
      const u: User = { email: found.email, name: found.name, role: found.role, orgaoId: found.orgaoId };
      setUser(u);
      sessionStorage.setItem("stc-user", JSON.stringify(u));
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem("stc-user");
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

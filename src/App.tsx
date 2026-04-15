import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import LoginPage from "@/pages/LoginPage";
import RecuperarSenhaPage from "@/pages/RecuperarSenhaPage";
import DashboardPage from "@/pages/DashboardPage";
import OrgaoDashboardPage from "@/pages/OrgaoDashboardPage";
import NovaSolicitacaoPage from "@/pages/NovaSolicitacaoPage";
import SolicitacoesPage from "@/pages/SolicitacoesPage";
import RankingPage from "@/pages/RankingPage";
import ChatbotPage from "@/pages/ChatbotPage";
import NotFoundPage from "@/pages/NotFoundPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/recuperar-senha" element={<RecuperarSenhaPage />} />
            <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
            <Route path="/orgao-dashboard" element={<ProtectedRoute><OrgaoDashboardPage /></ProtectedRoute>} />
            <Route path="/nova-solicitacao" element={<ProtectedRoute><NovaSolicitacaoPage /></ProtectedRoute>} />
            <Route path="/solicitacoes" element={<ProtectedRoute><SolicitacoesPage /></ProtectedRoute>} />
            <Route path="/ranking" element={<ProtectedRoute><RankingPage /></ProtectedRoute>} />
            <Route path="/chatbot" element={<ProtectedRoute><ChatbotPage /></ProtectedRoute>} />
            <Route path="/chatbot/:solicitacaoId" element={<ProtectedRoute><ChatbotPage /></ProtectedRoute>} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;

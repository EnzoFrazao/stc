import { useState, useMemo } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Send, X, Building2, FileSpreadsheet, Bell, ChevronDown, ChevronRight } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import { orgaos, camposPlanilha, CampoPlanilha, CanalNotificacao } from "@/data/mockData";

const NovaSolicitacaoPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [orgaosSelecionados, setOrgaosSelecionados] = useState<string[]>([]);
  const [camposSelecionados, setCamposSelecionados] = useState<string[]>([]);
  const [prazo, setPrazo] = useState("");
  const [titulo, setTitulo] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [canal, setCanal] = useState<CanalNotificacao>("email");

  const camposDisponiveis = useMemo(() => {
    if (orgaosSelecionados.length === 0) return [];
    return camposPlanilha.filter(c =>
      c.orgaosPermitidos.some(oId => orgaosSelecionados.includes(oId))
    );
  }, [orgaosSelecionados]);

  const camposPorOrgao = useMemo(() => {
    const map: Record<string, CampoPlanilha[]> = {};
    for (const orgaoId of orgaosSelecionados) {
      const orgao = orgaos.find(o => o.id === orgaoId);
      if (!orgao) continue;
      map[orgao.nome] = camposDisponiveis.filter(c => c.orgaosPermitidos.includes(orgaoId));
    }
    return map;
  }, [orgaosSelecionados, camposDisponiveis]);

  const toggleOrgao = (orgaoId: string) => {
    setOrgaosSelecionados(prev => {
      const next = prev.includes(orgaoId)
        ? prev.filter(id => id !== orgaoId)
        : [...prev, orgaoId];
      const novosDisponiveis = camposPlanilha
        .filter(c => c.orgaosPermitidos.some(oId => next.includes(oId)))
        .map(c => c.id);
      setCamposSelecionados(prev => prev.filter(id => novosDisponiveis.includes(id)));
      return next;
    });
  };

  const toggleCampo = (campoId: string) => {
    setCamposSelecionados(prev =>
      prev.includes(campoId) ? prev.filter(id => id !== campoId) : [...prev, campoId]
    );
  };

  const tipoLabel: Record<string, string> = {
    texto: "Texto",
    moeda: "Monetário",
    numero: "Numérico",
    data: "Data",
  };

  const tipoBadgeColor: Record<string, string> = {
    texto: "bg-muted text-muted-foreground",
    moeda: "bg-status-completed-bg text-status-completed",
    numero: "bg-status-progress-bg text-status-progress",
    data: "bg-status-pending-bg text-status-pending",
  };

  const prazoDiasMap: Record<string, number> = { "D+3": 3, "D+7": 7, "D+15": 15 };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (orgaosSelecionados.length === 0 || camposSelecionados.length === 0 || !prazo || !titulo) {
      toast({ title: "Erro", description: "Preencha todos os campos obrigatórios.", variant: "destructive" });
      return;
    }
    const canalTexto = canal === "whatsapp" ? "WhatsApp" : canal === "email" ? "E-mail" : "Outro";
    toast({
      title: "Solicitação enviada!",
      description: `Notificação enviada via ${canalTexto} para ${orgaosSelecionados.length} órgão(s).`,
    });
    setTimeout(() => navigate("/solicitacoes"), 1200);
  };

  return (
    <div className="min-h-screen bg-accent">
      <AppHeader title="Nova Solicitação" showBack />
      <main className="container py-8">
        <form onSubmit={handleSubmit}>
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              {/* Step 1: Select organs */}
              <Card className="border-0 shadow-lg animate-fade-in">
                <CardHeader className="pb-3">
                  <CardTitle className="text-primary flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    1. Selecione os Órgãos *
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {orgaos.map(orgao => {
                      const selected = orgaosSelecionados.includes(orgao.id);
                      return (
                        <button
                          key={orgao.id}
                          type="button"
                          onClick={() => toggleOrgao(orgao.id)}
                          className={`rounded-lg border-2 p-4 text-left text-sm transition-all active:scale-[0.98] ${
                            selected
                              ? "border-secondary bg-secondary/10 shadow-md"
                              : "border-border bg-card hover:border-secondary/40 hover:shadow-sm"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div className={`h-4 w-4 rounded border-2 flex items-center justify-center transition-colors ${
                              selected ? "bg-secondary border-secondary" : "border-muted-foreground/40"
                            }`}>
                              {selected && <span className="text-white text-[10px] font-bold">✓</span>}
                            </div>
                            <span className="font-medium">{orgao.nome}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  {orgaosSelecionados.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-4">
                      {orgaosSelecionados.map(id => {
                        const o = orgaos.find(o => o.id === id)!;
                        return (
                          <Badge key={id} variant="secondary" className="gap-1 pr-1">
                            {o.nome}
                            <button type="button" onClick={() => toggleOrgao(id)} className="ml-1 rounded-full hover:bg-secondary/20 p-0.5">
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Step 2: Select fields */}
              <Card className={`border-0 shadow-lg transition-opacity ${orgaosSelecionados.length === 0 ? "opacity-50 pointer-events-none" : "animate-fade-in"}`}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-primary flex items-center gap-2">
                    <FileSpreadsheet className="h-5 w-5" />
                    2. Selecione os Dados da Planilha *
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {Object.entries(camposPorOrgao).map(([orgaoNome, campos]) => (
                    <div key={orgaoNome}>
                      <h4 className="text-sm font-semibold text-primary mb-2">{orgaoNome}</h4>
                      <div className="space-y-2">
                        {campos.map(campo => {
                          const checked = camposSelecionados.includes(campo.id);
                          return (
                            <button
                              key={campo.id}
                              type="button"
                              onClick={() => toggleCampo(campo.id)}
                              className={`w-full flex items-center justify-between rounded-lg border p-3 text-sm transition-all active:scale-[0.99] ${
                                checked ? "border-secondary bg-secondary/5" : "border-border hover:border-secondary/30"
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`h-4 w-4 rounded border-2 flex items-center justify-center transition-colors ${
                                  checked ? "bg-secondary border-secondary" : "border-muted-foreground/40"
                                }`}>
                                  {checked && <span className="text-white text-[10px] font-bold">✓</span>}
                                </div>
                                <span>{campo.label}</span>
                                {campo.categoria && <span className="text-xs text-muted-foreground">({campo.categoria})</span>}
                              </div>
                              <Badge className={`text-xs ${tipoBadgeColor[campo.tipo]}`}>{tipoLabel[campo.tipo]}</Badge>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  {orgaosSelecionados.length > 0 && camposDisponiveis.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">Nenhum campo disponível para os órgãos selecionados.</p>
                  )}
                </CardContent>
              </Card>

              {/* Step 3: Details */}
              <Card className={`border-0 shadow-lg transition-opacity ${camposSelecionados.length === 0 ? "opacity-50 pointer-events-none" : "animate-fade-in"}`}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-primary flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    3. Detalhes e Notificação
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Título *</Label>
                    <Input placeholder="Título da solicitação" value={titulo} onChange={e => setTitulo(e.target.value)} />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Prazo *</Label>
                      <Select value={prazo} onValueChange={setPrazo}>
                        <SelectTrigger><SelectValue placeholder="Selecione o prazo" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="D+3">D+3 (3 dias)</SelectItem>
                          <SelectItem value="D+7">D+7 (7 dias)</SelectItem>
                          <SelectItem value="D+15">D+15 (15 dias)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Canal de Notificação</Label>
                      <Select value={canal} onValueChange={v => setCanal(v as CanalNotificacao)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="email">E-mail</SelectItem>
                          <SelectItem value="whatsapp">WhatsApp</SelectItem>
                          <SelectItem value="outro">Outro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Observações</Label>
                    <Textarea placeholder="Observações adicionais (opcional)..." rows={3} value={observacoes} onChange={e => setObservacoes(e.target.value)} />
                  </div>
                  <Button type="submit" className="w-full bg-secondary hover:bg-secondary/90 gap-2 h-12 text-base">
                    <Send className="h-5 w-5" />
                    Enviar Solicitação
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar summary */}
            <div>
              <Card className="border-0 shadow-lg animate-slide-up sticky top-24">
                <CardHeader className="pb-3">
                  <CardTitle className="text-primary text-base">Resumo da Solicitação</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div>
                    <span className="font-medium text-muted-foreground">Órgãos selecionados</span>
                    <p className="font-semibold text-primary">{orgaosSelecionados.length}</p>
                  </div>
                  <div>
                    <span className="font-medium text-muted-foreground">Campos selecionados</span>
                    <p className="font-semibold text-primary">{camposSelecionados.length}</p>
                  </div>
                  {camposSelecionados.length > 0 && (
                    <div className="space-y-1.5 max-h-64 overflow-y-auto">
                      {camposSelecionados.map(id => {
                        const campo = camposPlanilha.find(c => c.id === id)!;
                        return (
                          <div key={id} className="flex items-center justify-between rounded-md bg-muted px-3 py-2">
                            <span className="truncate mr-2">{campo.label}</span>
                            <Badge className={`text-[10px] shrink-0 ${tipoBadgeColor[campo.tipo]}`}>{tipoLabel[campo.tipo]}</Badge>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {prazo && (
                    <div>
                      <span className="font-medium text-muted-foreground">Prazo</span>
                      <p className="font-semibold text-primary">{prazo}</p>
                    </div>
                  )}
                  <div>
                    <span className="font-medium text-muted-foreground">Canal de notificação</span>
                    <p className="font-semibold text-primary">
                      {canal === "email" ? "E-mail" : canal === "whatsapp" ? "WhatsApp" : "Outro"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
};

export default NovaSolicitacaoPage;

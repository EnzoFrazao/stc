import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Send, FileSpreadsheet, Bell, CheckCircle2, FileText } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import { objetosTransparencia, ObjetoTransparencia, CanalNotificacao } from "@/data/mockData";

const NovaSolicitacaoPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [objetoSelecionado, setObjetoSelecionado] = useState<string | null>(null);
  const [camposObrigatorios, setCamposObrigatorios] = useState<string[]>([]);
  const [prazo, setPrazo] = useState("");
  const [titulo, setTitulo] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [canal, setCanal] = useState<CanalNotificacao>("email");

  const objeto = useMemo(
    () => objetosTransparencia.find(o => o.id === objetoSelecionado),
    [objetoSelecionado]
  );

  const handleSelectObjeto = (id: string) => {
    setObjetoSelecionado(id);
    const obj = objetosTransparencia.find(o => o.id === id);
    if (obj) {
      setCamposObrigatorios(obj.campos.map(c => c.id));
    }
  };

  const toggleCampoObrigatorio = (campoId: string) => {
    setCamposObrigatorios(prev =>
      prev.includes(campoId) ? prev.filter(id => id !== campoId) : [...prev, campoId]
    );
  };

  const formatoBadgeClass: Record<string, string> = {
    XLSX: "bg-status-enviada-bg text-status-enviada border-status-enviada/30",
    VARIÁVEL: "bg-status-parcial-bg text-status-parcial border-status-parcial/30",
  };

  const tipoCampoLabel: Record<string, string> = {
    texto: "Texto",
    texto_cnpj: "CNPJ",
    numero_inteiro: "Nº Inteiro",
    numero_ano: "Ano",
    moeda: "Monetário",
    data: "Data",
    selecao: "Seleção",
    upload_multiplo: "Upload",
    texto_url: "URL",
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!objetoSelecionado || camposObrigatorios.length === 0 || !prazo || !titulo) {
      toast({ title: "Erro", description: "Preencha todos os campos obrigatórios.", variant: "destructive" });
      return;
    }
    const canalTexto = canal === "whatsapp" ? "WhatsApp" : canal === "email" ? "E-mail" : "Outro";
    toast({
      title: "Solicitação enviada!",
      description: `Objeto ${objeto?.codigo} — Notificação enviada via ${canalTexto}.`,
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
              {/* Step 1: Select transparency object */}
              <Card className="border-0 shadow-lg animate-fade-in">
                <CardHeader className="pb-3">
                  <CardTitle className="text-primary flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    1. Selecione o Objeto de Transparência *
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {objetosTransparencia.map(obj => {
                      const selected = objetoSelecionado === obj.id;
                      return (
                        <button
                          key={obj.id}
                          type="button"
                          onClick={() => handleSelectObjeto(obj.id)}
                          className={`rounded-lg border-2 p-4 text-left text-sm transition-all active:scale-[0.98] ${
                            selected
                              ? "border-secondary bg-secondary/10 shadow-md"
                              : "border-border bg-card hover:border-secondary/40 hover:shadow-sm"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                                selected ? "bg-secondary border-secondary" : "border-muted-foreground/40"
                              }`}>
                                {selected && <span className="text-secondary-foreground text-[10px] font-bold">✓</span>}
                              </div>
                              <span className="font-mono text-xs text-muted-foreground">{obj.codigo}</span>
                            </div>
                            <Badge variant="outline" className={`text-[10px] ${formatoBadgeClass[obj.formato]}`}>
                              {obj.formato}
                            </Badge>
                          </div>
                          <p className="font-semibold text-card-foreground">{obj.nome}</p>
                          <p className="text-xs text-muted-foreground mt-1">{obj.ciclo}</p>
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Step 2: Fields checklist */}
              <Card className={`border-0 shadow-lg transition-opacity ${!objeto ? "opacity-50 pointer-events-none" : "animate-fade-in"}`}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-primary flex items-center gap-2">
                    <FileSpreadsheet className="h-5 w-5" />
                    2. Campos Obrigatórios da Solicitação *
                  </CardTitle>
                  {objeto && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Marque os campos que serão obrigatórios nesta solicitação. Todos vêm selecionados por padrão.
                    </p>
                  )}
                </CardHeader>
                <CardContent className="space-y-2">
                  {objeto && (
                    <div className="rounded-lg bg-status-aberta-bg/50 border border-status-aberta/20 p-3 mb-3">
                      <p className="text-xs text-card-foreground">{objeto.instrucao}</p>
                    </div>
                  )}
                  {objeto?.campos.map(campo => {
                    const checked = camposObrigatorios.includes(campo.id);
                    return (
                      <button
                        key={campo.id}
                        type="button"
                        onClick={() => toggleCampoObrigatorio(campo.id)}
                        className={`w-full flex items-center justify-between rounded-lg border p-3 text-sm transition-all active:scale-[0.99] ${
                          checked ? "border-secondary bg-secondary/5" : "border-border hover:border-secondary/30"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`h-4 w-4 rounded border-2 flex items-center justify-center transition-colors ${
                            checked ? "bg-secondary border-secondary" : "border-muted-foreground/40"
                          }`}>
                            {checked && <span className="text-secondary-foreground text-[10px] font-bold">✓</span>}
                          </div>
                          <span>{campo.label}</span>
                        </div>
                        <Badge variant="outline" className="text-[10px]">
                          {tipoCampoLabel[campo.tipo] || campo.tipo}
                        </Badge>
                      </button>
                    );
                  })}
                </CardContent>
              </Card>

              {/* Step 3: Details */}
              <Card className={`border-0 shadow-lg transition-opacity ${camposObrigatorios.length === 0 ? "opacity-50 pointer-events-none" : "animate-fade-in"}`}>
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
                    <span className="font-medium text-muted-foreground">Objeto</span>
                    {objeto ? (
                      <div className="mt-1">
                        <p className="font-semibold text-primary">{objeto.codigo}</p>
                        <p className="text-xs text-muted-foreground">{objeto.nome}</p>
                      </div>
                    ) : (
                      <p className="text-muted-foreground/60 italic">Nenhum selecionado</p>
                    )}
                  </div>
                  <div>
                    <span className="font-medium text-muted-foreground">Campos obrigatórios</span>
                    <p className="font-semibold text-primary">
                      {camposObrigatorios.length}{objeto ? ` / ${objeto.campos.length}` : ""}
                    </p>
                  </div>
                  {objeto && camposObrigatorios.length > 0 && (
                    <div className="space-y-1.5 max-h-64 overflow-y-auto">
                      {objeto.campos.filter(c => camposObrigatorios.includes(c.id)).map(campo => (
                        <div key={campo.id} className="flex items-center justify-between rounded-md bg-muted px-3 py-2">
                          <span className="truncate mr-2 flex items-center gap-1.5">
                            <CheckCircle2 className="h-3 w-3 text-secondary shrink-0" />
                            {campo.label}
                          </span>
                          <Badge variant="outline" className="text-[10px] shrink-0">
                            {tipoCampoLabel[campo.tipo] || campo.tipo}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                  {prazo && (
                    <div>
                      <span className="font-medium text-muted-foreground">Prazo</span>
                      <p className="font-semibold text-primary">{prazo}</p>
                    </div>
                  )}
                  <div>
                    <span className="font-medium text-muted-foreground">Formato esperado</span>
                    <p className="font-semibold text-primary">{objeto?.formato || "—"}</p>
                  </div>
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

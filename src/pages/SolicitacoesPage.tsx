import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { mockSolicitacoes, Solicitacao, SolicitacaoStatus, ItemValidacao, orgaos } from "@/data/mockData";
import { Search, Eye, CheckCircle, XCircle, Clock, AlertCircle, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import AppHeader from "@/components/AppHeader";

const statusStyles: Record<SolicitacaoStatus, string> = {
  Pendente: "bg-status-pending-bg text-status-pending border-status-pending/30",
  "Em Andamento": "bg-status-progress-bg text-status-progress border-status-progress/30",
  Concluída: "bg-status-completed-bg text-status-completed border-status-completed/30",
  Atrasada: "bg-status-overdue-bg text-status-overdue border-status-overdue/30",
};

const validacaoIcon = {
  pendente: <Clock className="h-4 w-4 text-status-pending" />,
  validado: <CheckCircle className="h-4 w-4 text-status-completed" />,
  recusado: <XCircle className="h-4 w-4 text-status-overdue" />,
};

const ITEMS_PER_PAGE = 10;

const SolicitacoesPage = () => {
  const { toast } = useToast();
  const [solicitacoes, setSolicitacoes] = useState(mockSolicitacoes);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Todas");
  const [orgaoFilter, setOrgaoFilter] = useState("Todos");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Solicitacao | null>(null);

  const orgaoNomes = ["Todos", ...orgaos.map(o => o.nome)];

  const filtered = solicitacoes.filter(s => {
    if (search && !s.assunto.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== "Todas" && s.statusGeral !== statusFilter) return false;
    if (orgaoFilter !== "Todos" && !s.orgaos.some(o => o.orgaoNome === orgaoFilter)) return false;
    return true;
  });

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const handleValidar = (solId: string, orgaoId: string, itemId: string) => {
    setSolicitacoes(prev => prev.map(s => {
      if (s.id !== solId) return s;
      const orgaos = s.orgaos.map(o => {
        if (o.orgaoId !== orgaoId) return o;
        const itens = o.itens.map(i => i.id === itemId ? { ...i, validacao: "validado" as ItemValidacao } : i);
        const done = itens.filter(i => i.validacao === "validado").length;
        return { ...o, itens, progresso: Math.round((done / itens.length) * 100) };
      });
      return { ...s, orgaos };
    }));
    // Update selected if open
    setSelected(prev => {
      if (!prev || prev.id !== solId) return prev;
      const updated = solicitacoes.find(s => s.id === solId);
      return updated ? { ...prev, ...updated } : prev;
    });
    toast({ title: "Dado validado", description: "O dado foi validado e salvo no banco de dados." });
  };

  const handleRecusar = (solId: string, orgaoId: string, itemId: string) => {
    setSolicitacoes(prev => prev.map(s => {
      if (s.id !== solId) return s;
      const orgaos = s.orgaos.map(o => {
        if (o.orgaoId !== orgaoId) return o;
        const itens = o.itens.map(i => i.id === itemId ? { ...i, validacao: "recusado" as ItemValidacao, reenvioSolicitado: true } : i);
        return { ...o, itens };
      });
      return { ...s, orgaos };
    }));
    toast({
      title: "Dado recusado",
      description: "Uma nova solicitação de reenvio foi gerada automaticamente para o órgão.",
      variant: "destructive",
    });
  };

  // Sync selected with state
  const currentSelected = selected ? solicitacoes.find(s => s.id === selected.id) || null : null;

  return (
    <div className="min-h-screen bg-accent">
      <AppHeader title="Minhas Solicitações" showBack />
      <main className="container py-8">
        <Card className="border-0 shadow-lg animate-fade-in">
          <CardHeader>
            <CardTitle className="text-primary">Solicitações Enviadas</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="flex flex-wrap gap-3 mb-6">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input className="pl-9" placeholder="Buscar por assunto..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
              </div>
              <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1); }}>
                <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Todas", "Pendente", "Em Andamento", "Concluída", "Atrasada"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={orgaoFilter} onValueChange={v => { setOrgaoFilter(v); setPage(1); }}>
                <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {orgaoNomes.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Table */}
            <div className="rounded-lg border overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Protocolo</TableHead>
                    <TableHead>Órgãos</TableHead>
                    <TableHead>Assunto</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Prazo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map(s => (
                    <TableRow key={s.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-mono text-sm">{s.protocolo}</TableCell>
                      <TableCell className="text-sm">
                        <div className="flex flex-wrap gap-1">
                          {s.orgaos.map(o => (
                            <Badge key={o.orgaoId} variant="outline" className="text-xs">{o.orgaoNome.replace("Secretaria de ", "")}</Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate">{s.assunto}</TableCell>
                      <TableCell className="text-sm">{s.dataEnvio}</TableCell>
                      <TableCell className="text-sm">{s.prazo}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusStyles[s.statusGeral]}>{s.statusGeral}</Badge>
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost" className="gap-1 text-secondary" onClick={() => setSelected(s)}>
                          <Eye className="h-4 w-4" /> Ver
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">{filtered.length} resultado(s)</p>
                <div className="flex gap-1">
                  {Array.from({ length: totalPages }, (_, i) => (
                    <Button key={i} size="sm" variant={page === i + 1 ? "default" : "outline"} onClick={() => setPage(i + 1)}>{i + 1}</Button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detail dialog with validation */}
        <Dialog open={!!currentSelected} onOpenChange={() => setSelected(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-primary flex items-center gap-3">
                {currentSelected?.protocolo}
                {currentSelected && (
                  <Badge variant="outline" className={statusStyles[currentSelected.statusGeral]}>{currentSelected.statusGeral}</Badge>
                )}
              </DialogTitle>
            </DialogHeader>
            {currentSelected && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">Assunto:</span> <span className="font-medium">{currentSelected.assunto}</span></div>
                  <div><span className="text-muted-foreground">Data:</span> {currentSelected.dataEnvio}</div>
                  <div><span className="text-muted-foreground">Prazo:</span> {currentSelected.prazo}</div>
                  <div><span className="text-muted-foreground">Canal:</span> {currentSelected.canalNotificacao === "email" ? "E-mail" : currentSelected.canalNotificacao === "whatsapp" ? "WhatsApp" : "Ambos"}</div>
                </div>
                {currentSelected.observacoes && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Observações:</span> {currentSelected.observacoes}
                  </div>
                )}

                {/* Per-organ items with validation */}
                {currentSelected.orgaos.map(orgao => (
                  <Card key={orgao.orgaoId} className="border shadow-sm">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-semibold">{orgao.orgaoNome}</CardTitle>
                        <Badge variant="outline" className={statusStyles[orgao.status]}>{orgao.status}</Badge>
                      </div>
                      <Progress value={orgao.progresso} className="h-2 mt-2" />
                      <p className="text-xs text-muted-foreground mt-1">{orgao.progresso}% concluído</p>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {orgao.itens.map(item => (
                        <div key={item.id} className={`flex items-center justify-between rounded-lg p-3 text-sm ${
                          item.validacao === "validado" ? "bg-status-completed-bg" :
                          item.validacao === "recusado" ? "bg-status-overdue-bg" : "bg-muted"
                        }`}>
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {validacaoIcon[item.validacao]}
                            <div className="min-w-0">
                              <p className="font-medium truncate">{item.campoNome}</p>
                              {item.valorRecebido ? (
                                <p className="text-xs text-muted-foreground">Recebido: {item.valorRecebido}</p>
                              ) : (
                                <p className="text-xs text-muted-foreground italic">Aguardando envio</p>
                              )}
                              {item.reenvioSolicitado && (
                                <p className="text-xs text-status-overdue flex items-center gap-1 mt-0.5">
                                  <RotateCcw className="h-3 w-3" /> Reenvio solicitado
                                </p>
                              )}
                            </div>
                          </div>
                          {item.valorRecebido && item.validacao === "pendente" && (
                            <div className="flex gap-1.5 ml-2 shrink-0">
                              <Button
                                size="sm"
                                className="h-8 bg-status-completed hover:bg-status-completed/90 text-white gap-1"
                                onClick={() => handleValidar(currentSelected.id, orgao.orgaoId, item.id)}
                              >
                                <CheckCircle className="h-3.5 w-3.5" /> Validar
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                className="h-8 gap-1"
                                onClick={() => handleRecusar(currentSelected.id, orgao.orgaoId, item.id)}
                              >
                                <XCircle className="h-3.5 w-3.5" /> Recusar
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default SolicitacoesPage;

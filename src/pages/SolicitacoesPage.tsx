import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import {
  mockSolicitacoes, mockRespostas, mockReenvios,
  Solicitacao, SolicitacaoStatus, RespostaOrgao, ValidacaoStatus,
  orgaos, getCampoById, getOrgaoById, getRespostasForSolicitacao, calcProgresso,
} from "@/data/mockData";
import { Search, Eye, CheckCircle, XCircle, Clock, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import AppHeader from "@/components/AppHeader";

const statusStyles: Record<SolicitacaoStatus, string> = {
  aberta: "bg-status-pending-bg text-status-pending border-status-pending/30",
  parcial: "bg-status-progress-bg text-status-progress border-status-progress/30",
  concluida: "bg-status-completed-bg text-status-completed border-status-completed/30",
};

const statusLabel: Record<SolicitacaoStatus, string> = {
  aberta: "Aberta",
  parcial: "Parcial",
  concluida: "Concluída",
};

const validacaoIcon: Record<ValidacaoStatus, React.ReactNode> = {
  pendente: <Clock className="h-4 w-4 text-status-pending" />,
  validado: <CheckCircle className="h-4 w-4 text-status-completed" />,
  recusado: <XCircle className="h-4 w-4 text-status-overdue" />,
};

const ITEMS_PER_PAGE = 10;

const SolicitacoesPage = () => {
  const { toast } = useToast();
  const [respostas, setRespostas] = useState(mockRespostas);
  const [reenvios, setReenvios] = useState(mockReenvios);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Todas");
  const [orgaoFilter, setOrgaoFilter] = useState("Todos");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Solicitacao | null>(null);

  const orgaoNomes = ["Todos", ...orgaos.map(o => o.nome)];

  const filtered = mockSolicitacoes.filter(s => {
    if (search && !s.titulo.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== "Todas" && s.status !== statusFilter) return false;
    if (orgaoFilter !== "Todos") {
      const orgao = orgaos.find(o => o.nome === orgaoFilter);
      if (orgao && !s.orgaosSelecionados.includes(orgao.id)) return false;
    }
    return true;
  });

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const handleValidar = (respostaId: string, itemId: string) => {
    setRespostas(prev => prev.map(r => {
      if (r.id !== respostaId) return r;
      return {
        ...r,
        itens: r.itens.map(i => i.id === itemId ? { ...i, validacaoStatus: "validado" as ValidacaoStatus } : i),
        updatedAt: new Date().toISOString().split("T")[0],
      };
    }));
    toast({ title: "Dado validado", description: "O dado foi validado e salvo no banco de dados." });
  };

  const handleRecusar = (respostaId: string, itemId: string, orgaoId: string, campoId: string, solId: string) => {
    setRespostas(prev => prev.map(r => {
      if (r.id !== respostaId) return r;
      return {
        ...r,
        itens: r.itens.map(i => i.id === itemId ? { ...i, validacaoStatus: "recusado" as ValidacaoStatus, motivoRecusa: "Dado inconsistente" } : i),
        updatedAt: new Date().toISOString().split("T")[0],
      };
    }));
    setReenvios(prev => [...prev, {
      id: `reenvio-${Date.now()}`,
      solicitacaoOriginalId: solId,
      respostaOrgaoId: respostaId,
      orgaoId,
      campoId,
      motivo: "Dado inconsistente — reenvio solicitado automaticamente",
      status: "aberto" as const,
      createdAt: new Date().toISOString().split("T")[0],
    }]);
    toast({
      title: "Dado recusado",
      description: "Uma nova solicitação de reenvio foi gerada automaticamente para o órgão.",
      variant: "destructive",
    });
  };

  const getRespostasForSelected = (sol: Solicitacao): RespostaOrgao[] => {
    return respostas.filter(r => r.solicitacaoId === sol.id);
  };

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
                <Input className="pl-9" placeholder="Buscar por título..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
              </div>
              <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1); }}>
                <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Todas", "aberta", "parcial", "concluida"].map(s => (
                    <SelectItem key={s} value={s}>{s === "Todas" ? "Todas" : statusLabel[s as SolicitacaoStatus]}</SelectItem>
                  ))}
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
                    <TableHead>ID</TableHead>
                    <TableHead>Órgãos</TableHead>
                    <TableHead>Título</TableHead>
                    <TableHead>Criação</TableHead>
                    <TableHead>Prazo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map(s => (
                    <TableRow key={s.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-mono text-sm">{s.id}</TableCell>
                      <TableCell className="text-sm">
                        <div className="flex flex-wrap gap-1">
                          {s.orgaosSelecionados.map(oId => {
                            const orgao = getOrgaoById(oId);
                            return orgao ? (
                              <Badge key={oId} variant="outline" className="text-xs">{orgao.nome.replace("Secretaria de ", "")}</Badge>
                            ) : null;
                          })}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate">{s.titulo}</TableCell>
                      <TableCell className="text-sm">{s.createdAt}</TableCell>
                      <TableCell className="text-sm">D+{s.prazoDias}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusStyles[s.status]}>{statusLabel[s.status]}</Badge>
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

        {/* Detail dialog */}
        <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-primary flex items-center gap-3">
                {selected?.id}
                {selected && (
                  <Badge variant="outline" className={statusStyles[selected.status]}>{statusLabel[selected.status]}</Badge>
                )}
              </DialogTitle>
            </DialogHeader>
            {selected && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">Título:</span> <span className="font-medium">{selected.titulo}</span></div>
                  <div><span className="text-muted-foreground">Criação:</span> {selected.createdAt}</div>
                  <div><span className="text-muted-foreground">Prazo:</span> D+{selected.prazoDias}</div>
                  <div><span className="text-muted-foreground">Canal:</span> {selected.canalNotificacao === "email" ? "E-mail" : selected.canalNotificacao === "whatsapp" ? "WhatsApp" : "Outro"}</div>
                </div>
                {selected.observacoes && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Observações:</span> {selected.observacoes}
                  </div>
                )}

                {/* Per-organ responses with validation */}
                {getRespostasForSelected(selected).map(resposta => {
                  const orgao = getOrgaoById(resposta.orgaoId);
                  const progresso = calcProgresso(resposta);
                  return (
                    <Card key={resposta.id} className="border shadow-sm">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm font-semibold">{orgao?.nome || resposta.orgaoId}</CardTitle>
                          <Badge variant="outline" className="text-xs">{resposta.status}</Badge>
                        </div>
                        <Progress value={progresso} className="h-2 mt-2" />
                        <p className="text-xs text-muted-foreground mt-1">{progresso}% concluído</p>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {resposta.itens.map(item => {
                          const campo = getCampoById(item.campoId);
                          const hasReenvio = reenvios.some(r => r.campoId === item.campoId && r.respostaOrgaoId === resposta.id && r.status === "aberto");
                          return (
                            <div key={item.id} className={`flex items-center justify-between rounded-lg p-3 text-sm ${
                              item.validacaoStatus === "validado" ? "bg-status-completed-bg" :
                              item.validacaoStatus === "recusado" ? "bg-status-overdue-bg" : "bg-muted"
                            }`}>
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                {validacaoIcon[item.validacaoStatus]}
                                <div className="min-w-0">
                                  <p className="font-medium truncate">{campo?.nome || item.campoId}</p>
                                  {item.valor ? (
                                    <p className="text-xs text-muted-foreground">Recebido: {String(item.valor)}</p>
                                  ) : (
                                    <p className="text-xs text-muted-foreground italic">Aguardando envio</p>
                                  )}
                                  {item.motivoRecusa && (
                                    <p className="text-xs text-status-overdue">Motivo: {item.motivoRecusa}</p>
                                  )}
                                  {hasReenvio && (
                                    <p className="text-xs text-status-overdue flex items-center gap-1 mt-0.5">
                                      <RotateCcw className="h-3 w-3" /> Reenvio solicitado
                                    </p>
                                  )}
                                </div>
                              </div>
                              {item.valor && item.validacaoStatus === "pendente" && (
                                <div className="flex gap-1.5 ml-2 shrink-0">
                                  <Button
                                    size="sm"
                                    className="h-8 bg-status-completed hover:bg-status-completed/90 text-white gap-1"
                                    onClick={() => handleValidar(resposta.id, item.id)}
                                  >
                                    <CheckCircle className="h-3.5 w-3.5" /> Validar
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    className="h-8 gap-1"
                                    onClick={() => handleRecusar(resposta.id, item.id, resposta.orgaoId, item.campoId, selected.id)}
                                  >
                                    <XCircle className="h-3.5 w-3.5" /> Recusar
                                  </Button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default SolicitacoesPage;

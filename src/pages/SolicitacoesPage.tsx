import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  mockSolicitacoes, mockRespostas, mockReenvios,
  Solicitacao, SolicitacaoStatus, RespostaOrgao, ValidacaoStatus,
  orgaos, getCampoById, getOrgaoById, calcProgresso, calcularStatusSolicitacao,
} from "@/data/mockData";
import { Search, Eye, CheckCircle, XCircle, Clock, RotateCcw, Send, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import AppHeader from "@/components/AppHeader";

const statusStyles: Record<SolicitacaoStatus, string> = {
  enviada: "bg-status-enviada-bg text-status-enviada border-status-enviada/30",
  aberta: "bg-status-aberta-bg text-status-aberta border-status-aberta/30",
  parcial: "bg-status-parcial-bg text-status-parcial border-status-parcial/30",
  nao_enviada: "bg-status-nao-enviada-bg text-status-nao-enviada border-status-nao-enviada/30",
  fechada: "bg-status-fechada-bg text-status-fechada border-status-fechada/30",
};

const statusLabel: Record<SolicitacaoStatus, string> = {
  enviada: "Enviada",
  aberta: "Aberta",
  parcial: "Parcial",
  nao_enviada: "Não Enviada",
  fechada: "Fechada",
};

const validacaoIcon: Record<ValidacaoStatus, React.ReactNode> = {
  pendente: <Clock className="h-4 w-4 text-muted-foreground" />,
  validado: <CheckCircle className="h-4 w-4 text-status-enviada" />,
  recusado: <XCircle className="h-4 w-4 text-status-nao-enviada" />,
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
  const [rejectingItemId, setRejectingItemId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const orgaoNomes = ["Todos", ...orgaos.map(o => o.nome)];

  // Calculate status dynamically for each solicitacao
  const solicitacoesComStatus = useMemo(() => {
    return mockSolicitacoes.map(s => ({
      ...s,
      status: calcularStatusSolicitacao(s, respostas),
    }));
  }, [respostas]);

  const filtered = solicitacoesComStatus.filter(s => {
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

  const handleVerificar = (respostaId: string, itemId: string) => {
    setRespostas(prev => prev.map(r => {
      if (r.id !== respostaId) return r;
      return {
        ...r,
        itens: r.itens.map(i => i.id === itemId ? { ...i, validacaoStatus: "validado" as ValidacaoStatus, motivoRecusa: undefined } : i),
        updatedAt: new Date().toISOString().split("T")[0],
      };
    }));
    toast({ title: "Item verificado", description: "O dado foi marcado como correto." });
  };

  const handleRejeitar = (respostaId: string, itemId: string, motivo: string) => {
    setRespostas(prev => prev.map(r => {
      if (r.id !== respostaId) return r;
      return {
        ...r,
        itens: r.itens.map(i => i.id === itemId ? { ...i, validacaoStatus: "recusado" as ValidacaoStatus, motivoRecusa: motivo || "Dado incorreto" } : i),
        updatedAt: new Date().toISOString().split("T")[0],
      };
    }));
    setRejectingItemId(null);
    setRejectReason("");
    toast({
      title: "Item rejeitado",
      description: "O item foi marcado como rejeitado.",
      variant: "destructive",
    });
  };

  const handleConcluirVerificacao = () => {
    toast({ title: "Verificação concluída", description: "Todos os itens foram verificados com sucesso." });
    setSelected(null);
  };

  const handleReenviarRejeitados = (sol: Solicitacao) => {
    const respsForSol = respostas.filter(r => r.solicitacaoId === sol.id);
    const novosReenvios = respsForSol.flatMap(resp =>
      resp.itens
        .filter(i => i.validacaoStatus === "recusado")
        .map(i => ({
          id: `reenvio-${Date.now()}-${i.id}`,
          solicitacaoOriginalId: sol.id,
          respostaOrgaoId: resp.id,
          orgaoId: resp.orgaoId,
          campoId: i.campoId,
          motivo: i.motivoRecusa || "Dado incorreto — reenvio solicitado",
          status: "aberto" as const,
          createdAt: new Date().toISOString().split("T")[0],
        }))
    );
    setReenvios(prev => [...prev, ...novosReenvios]);
    toast({
      title: "Reenvio solicitado",
      description: `${novosReenvios.length} item(ns) rejeitado(s) foram reenviados aos órgãos.`,
    });
    setSelected(null);
  };

  const getRespostasForSelected = (sol: Solicitacao): RespostaOrgao[] => {
    return respostas.filter(r => r.solicitacaoId === sol.id);
  };

  // Check if all items with value are verified (none pending, none rejected)
  const getVerificationState = (sol: Solicitacao) => {
    const resps = getRespostasForSelected(sol);
    const allItens = resps.flatMap(r => r.itens).filter(i => !!i.valor && String(i.valor).trim() !== "");
    const totalWithValue = allItens.length;
    const verified = allItens.filter(i => i.validacaoStatus === "validado").length;
    const rejected = allItens.filter(i => i.validacaoStatus === "recusado").length;
    const allVerified = totalWithValue > 0 && verified === totalWithValue;
    const hasRejected = rejected > 0;
    return { allVerified, hasRejected, totalWithValue };
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
                <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Todas", "enviada", "aberta", "parcial", "nao_enviada", "fechada"].map(s => (
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

        {/* Detail / Verification dialog */}
        <Dialog open={!!selected} onOpenChange={() => { setSelected(null); setRejectingItemId(null); setRejectReason(""); }}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-primary flex items-center gap-3">
                {selected?.id}
                {selected && (
                  <Badge variant="outline" className={statusStyles[calcularStatusSolicitacao(selected, respostas)]}>
                    {statusLabel[calcularStatusSolicitacao(selected, respostas)]}
                  </Badge>
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

                {/* Per-organ responses with verification */}
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
                        <p className="text-xs text-muted-foreground mt-1">{progresso}% verificado</p>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {resposta.itens.map(item => {
                          const campo = getCampoById(item.campoId);
                          const hasReenvio = reenvios.some(r => r.campoId === item.campoId && r.respostaOrgaoId === resposta.id && r.status === "aberto");
                          const isRejectingThis = rejectingItemId === item.id;

                          return (
                            <div key={item.id} className="space-y-2">
                              <div className={`flex items-center justify-between rounded-lg p-3 text-sm ${
                                item.validacaoStatus === "validado" ? "bg-status-enviada-bg" :
                                item.validacaoStatus === "recusado" ? "bg-status-nao-enviada-bg" : "bg-muted"
                              }`}>
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  {validacaoIcon[item.validacaoStatus]}
                                  <div className="min-w-0">
                                    <p className="font-medium truncate">{campo?.label || item.campoId}</p>
                                    {item.valor ? (
                                      <p className="text-xs text-muted-foreground">Recebido: {String(item.valor)}</p>
                                    ) : (
                                      <p className="text-xs text-muted-foreground italic">Aguardando envio</p>
                                    )}
                                    {item.validacaoStatus === "validado" && (
                                      <p className="text-xs text-status-enviada font-medium">✓ Verificado</p>
                                    )}
                                    {item.motivoRecusa && (
                                      <p className="text-xs text-status-nao-enviada">Motivo: {item.motivoRecusa}</p>
                                    )}
                                    {hasReenvio && (
                                      <p className="text-xs text-status-nao-enviada flex items-center gap-1 mt-0.5">
                                        <RotateCcw className="h-3 w-3" /> Reenvio solicitado
                                      </p>
                                    )}
                                  </div>
                                </div>
                                {item.valor && item.validacaoStatus === "pendente" && (
                                  <div className="flex gap-1.5 ml-2 shrink-0">
                                    <Button
                                      size="sm"
                                      className="h-8 bg-status-enviada hover:bg-status-enviada/90 text-white gap-1"
                                      onClick={() => handleVerificar(resposta.id, item.id)}
                                    >
                                      <Check className="h-3.5 w-3.5" /> Verificar
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      className="h-8 gap-1"
                                      onClick={() => { setRejectingItemId(item.id); setRejectReason(""); }}
                                    >
                                      <XCircle className="h-3.5 w-3.5" /> Rejeitar
                                    </Button>
                                  </div>
                                )}
                              </div>

                              {/* Reject reason inline */}
                              {isRejectingThis && (
                                <div className="ml-6 p-3 border rounded-lg bg-card space-y-2 animate-fade-in">
                                  <p className="text-sm font-medium text-muted-foreground">Motivo da rejeição (opcional):</p>
                                  <Textarea
                                    placeholder="Descreva o motivo da rejeição..."
                                    value={rejectReason}
                                    onChange={e => setRejectReason(e.target.value)}
                                    rows={2}
                                  />
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => handleRejeitar(resposta.id, item.id, rejectReason)}
                                    >
                                      Confirmar rejeição
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => { setRejectingItemId(null); setRejectReason(""); }}
                                    >
                                      Cancelar
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </CardContent>
                    </Card>
                  );
                })}

                {/* Final action buttons */}
                {(() => {
                  const { allVerified, hasRejected, totalWithValue } = getVerificationState(selected);
                  if (totalWithValue === 0) return null;
                  return (
                    <DialogFooter className="flex gap-3 pt-4 border-t sm:justify-between">
                      <Button
                        disabled={!hasRejected}
                        className={`gap-2 ${hasRejected ? "bg-destructive hover:bg-destructive/90 text-white" : "bg-muted text-muted-foreground cursor-not-allowed"}`}
                        onClick={() => handleReenviarRejeitados(selected)}
                      >
                        <Send className="h-4 w-4" /> Reenviar solicitação
                      </Button>
                      <Button
                        disabled={!allVerified}
                        className={`gap-2 ${allVerified ? "bg-status-enviada hover:bg-status-enviada/90 text-white" : "bg-muted text-muted-foreground cursor-not-allowed"}`}
                        onClick={handleConcluirVerificacao}
                      >
                        <CheckCircle className="h-4 w-4" /> Concluir verificação
                      </Button>
                    </DialogFooter>
                  );
                })()}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default SolicitacoesPage;

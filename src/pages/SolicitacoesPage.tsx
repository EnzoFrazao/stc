import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { mockSolicitacoes, Solicitacao, SolicitacaoStatus } from "@/data/mockData";
import { Search, Eye } from "lucide-react";
import AppHeader from "@/components/AppHeader";

const statusStyles: Record<SolicitacaoStatus, string> = {
  Pendente: "bg-status-pending-bg text-status-pending border-status-pending/30",
  "Em Andamento": "bg-status-progress-bg text-status-progress border-status-progress/30",
  Concluída: "bg-status-completed-bg text-status-completed border-status-completed/30",
  Atrasada: "bg-status-overdue-bg text-status-overdue border-status-overdue/30",
};

const ITEMS_PER_PAGE = 10;

const SolicitacoesPage = () => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Todas");
  const [orgaoFilter, setOrgaoFilter] = useState("Todos");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Solicitacao | null>(null);

  const orgaos = ["Todos", ...new Set(mockSolicitacoes.map(s => s.orgao))];

  const filtered = mockSolicitacoes.filter(s => {
    if (search && !s.assunto.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== "Todas" && s.status !== statusFilter) return false;
    if (orgaoFilter !== "Todos" && s.orgao !== orgaoFilter) return false;
    return true;
  });

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

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
                  {orgaos.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Table */}
            <div className="rounded-lg border overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Protocolo</TableHead>
                    <TableHead>Órgão</TableHead>
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
                      <TableCell className="text-sm">{s.orgao}</TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate">{s.assunto}</TableCell>
                      <TableCell className="text-sm">{s.dataEnvio}</TableCell>
                      <TableCell className="text-sm">{s.prazo}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusStyles[s.status]}>{s.status}</Badge>
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

            {/* Pagination */}
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
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-primary">{selected?.protocolo}</DialogTitle>
            </DialogHeader>
            {selected && (
              <div className="space-y-3 text-sm">
                <div><strong>Órgão:</strong> {selected.orgao}</div>
                <div><strong>Assunto:</strong> {selected.assunto}</div>
                <div><strong>Data de envio:</strong> {selected.dataEnvio}</div>
                <div><strong>Prazo:</strong> {selected.prazo}</div>
                <div><strong>Status:</strong> <Badge variant="outline" className={statusStyles[selected.status]}>{selected.status}</Badge></div>
                <div><strong>Descrição:</strong> {selected.descricao}</div>
                <div>
                  <strong>Checklist:</strong>
                  <ul className="mt-1 space-y-1">
                    {selected.checklist.map((c, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <span className={c.concluido ? "text-status-completed" : "text-status-pending"}>{c.concluido ? "✓" : "○"}</span>
                        {c.nome}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default SolicitacoesPage;

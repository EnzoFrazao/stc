import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { FileText, Trash2, Upload, Send, Plus } from "lucide-react";
import AppHeader from "@/components/AppHeader";

const orgaos = [
  "Secretaria de Saúde",
  "Secretaria de Educação",
  "Secretaria de Segurança",
  "Secretaria de Infraestrutura",
  "Secretaria de Administração",
];

const NovaSolicitacaoPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [orgao, setOrgao] = useState("");
  const [assunto, setAssunto] = useState("");
  const [prazo, setPrazo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [checklist, setChecklist] = useState<string[]>(["Relatório de execução", "Planilha de gastos", "Contrato administrativo"]);
  const [novoDoc, setNovoDoc] = useState("");
  const [anexos, setAnexos] = useState<string[]>([]);

  const addDoc = () => {
    if (novoDoc.trim()) {
      setChecklist([...checklist, novoDoc.trim()]);
      setNovoDoc("");
    }
  };

  const removeDoc = (i: number) => setChecklist(checklist.filter((_, idx) => idx !== i));

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAnexos([...anexos, ...Array.from(e.target.files).map(f => f.name)]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgao || !assunto || !prazo) {
      toast({ title: "Erro", description: "Preencha todos os campos obrigatórios.", variant: "destructive" });
      return;
    }
    toast({ title: "Solicitação enviada!", description: "Sua solicitação foi registrada com sucesso." });
    setTimeout(() => navigate("/solicitacoes"), 1000);
  };

  return (
    <div className="min-h-screen bg-accent">
      <AppHeader title="Nova Solicitação" showBack />
      <main className="container py-8">
        <form onSubmit={handleSubmit}>
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Form */}
            <div className="lg:col-span-2">
              <Card className="border-0 shadow-lg animate-fade-in">
                <CardHeader>
                  <CardTitle className="text-primary">Dados da Solicitação</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Órgão Destinatário *</Label>
                      <Select value={orgao} onValueChange={setOrgao}>
                        <SelectTrigger><SelectValue placeholder="Selecione o órgão" /></SelectTrigger>
                        <SelectContent>
                          {orgaos.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Prazo *</Label>
                      <Select value={prazo} onValueChange={setPrazo}>
                        <SelectTrigger><SelectValue placeholder="Selecione o prazo" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="D+3">D+3</SelectItem>
                          <SelectItem value="D+7">D+7</SelectItem>
                          <SelectItem value="D+15">D+15</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Assunto *</Label>
                    <Input placeholder="Assunto da solicitação" value={assunto} onChange={e => setAssunto(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Instruções / Descrição</Label>
                    <Textarea placeholder="Descreva os dados solicitados..." rows={4} value={descricao} onChange={e => setDescricao(e.target.value)} />
                  </div>
                  {/* Anexos */}
                  <div className="space-y-2">
                    <Label>Anexos</Label>
                    <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-secondary transition-colors">
                      <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground mb-2">Arraste arquivos ou clique para selecionar</p>
                      <input type="file" multiple className="hidden" id="file-upload" onChange={handleFileChange} />
                      <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById("file-upload")?.click()}>
                        Selecionar arquivos
                      </Button>
                    </div>
                    {anexos.map((a, i) => (
                      <div key={i} className="flex items-center justify-between rounded-md bg-muted px-3 py-2 text-sm">
                        <span className="flex items-center gap-2"><FileText className="h-4 w-4 text-secondary" />{a}</span>
                        <button type="button" onClick={() => setAnexos(anexos.filter((_, idx) => idx !== i))}><Trash2 className="h-4 w-4 text-destructive" /></button>
                      </div>
                    ))}
                  </div>
                  <Button type="submit" className="w-full bg-secondary hover:bg-secondary/90 gap-2">
                    <Send className="h-4 w-4" />
                    Enviar Solicitação
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Checklist sidebar */}
            <div>
              <Card className="border-0 shadow-lg animate-slide-up">
                <CardHeader>
                  <CardTitle className="text-primary text-base">Checklist de Documentos</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex gap-2">
                    <Input placeholder="Nome do documento" value={novoDoc} onChange={e => setNovoDoc(e.target.value)} onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addDoc())} />
                    <Button type="button" size="icon" variant="outline" onClick={addDoc}><Plus className="h-4 w-4" /></Button>
                  </div>
                  <div className="space-y-2">
                    {checklist.map((doc, i) => (
                      <div key={i} className="flex items-center justify-between rounded-md bg-muted px-3 py-2 text-sm animate-fade-in">
                        <span className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-secondary" />{doc}
                        </span>
                        <button type="button" onClick={() => removeDoc(i)}><Trash2 className="h-4 w-4 text-destructive hover:text-destructive/80" /></button>
                      </div>
                    ))}
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

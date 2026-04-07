import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  mockChats, mockRespostas, mockSolicitacoes, ChatConversation, ChatMessage, RespostaItem,
  getCampoById, TipoCampo, getObjetoById, objetosTransparencia, MetadatoCampo, TipoCampoMetadado,
} from "@/data/mockData";
import { Send, Paperclip, Bot, User, CheckCircle, AlertCircle, Upload, PenLine, ImageIcon, AlertTriangle, Calendar, Clock, FileUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import AppHeader from "@/components/AppHeader";

const tipoPlaceholder: Record<string, string> = {
  texto: "Digite o texto...",
  texto_cnpj: "XX.XXX.XXX/XXXX-XX",
  moeda: "R$ 0,00",
  numero: "0",
  numero_inteiro: "0",
  numero_ano: "2025",
  data: "DD/MM/AAAA",
  selecao: "Selecione...",
  upload_multiplo: "Selecione arquivos...",
  texto_url: "https://...",
};

const ChatbotPage = () => {
  const { toast } = useToast();
  const { solicitacaoId } = useParams<{ solicitacaoId?: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const orgaoId = user?.orgaoId || "";

  // Find the relevant chat based on solicitacaoId + orgaoId
  const initialChat = useMemo(() => {
    if (solicitacaoId && orgaoId) {
      return mockChats.find(c => c.solicitacaoId === solicitacaoId && c.orgaoId === orgaoId) || mockChats[0];
    }
    return mockChats[0];
  }, [solicitacaoId, orgaoId]);

  const solicitacao = useMemo(() => {
    const sid = solicitacaoId || initialChat?.solicitacaoId;
    return mockSolicitacoes.find(s => s.id === sid);
  }, [solicitacaoId, initialChat]);

  const objetoTransp = useMemo(() => {
    if (solicitacao?.objetoId) return getObjetoById(solicitacao.objetoId);
    return undefined;
  }, [solicitacao]);

  const getMetadatoCampo = (campoId: string): MetadatoCampo | undefined => {
    if (!objetoTransp) return undefined;
    return objetoTransp.campos.find(c => c.id === campoId);
  };

  const [conversations, setConversations] = useState<ChatConversation[]>(mockChats);
  const [respostas, setRespostas] = useState(mockRespostas);
  const [activeId, setActiveId] = useState(initialChat?.id || mockChats[0].id);
  const [input, setInput] = useState("");

  const [showFormModal, setShowFormModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showBadImageModal, setShowBadImageModal] = useState(false);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [extractedData, setExtractedData] = useState<Record<string, string>>({});

  const active = conversations.find(c => c.id === activeId)!;
  const resposta = respostas.find(r => r.id === active.respostaOrgaoId);
  const pendingItens = resposta?.itens.filter(i => i.validacaoStatus === "pendente" && !i.valor) || [];

  const addMessage = (msgs: ChatMessage[]) => {
    setConversations(prev =>
      prev.map(c => c.id === activeId ? { ...c, messages: [...c.messages, ...msgs] } : c)
    );
  };

  const sendMessage = () => {
    if (!input.trim()) return;
    const time = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    const userMsg: ChatMessage = { id: `m-${Date.now()}`, sender: "user", text: input, time };
    const botReply: ChatMessage = {
      id: `m-${Date.now() + 1}`,
      sender: "bot",
      text: "Recebido! Use os botões 'Enviar Arquivo' ou 'Preencher Dados' para enviar as informações solicitadas.",
      time,
    };
    addMessage([userMsg, botReply]);
    setInput("");
  };

  const openFormModal = () => {
    const vals: Record<string, string> = {};
    pendingItens.forEach(i => { vals[i.id] = ""; });
    setFormValues(vals);
    setShowFormModal(true);
  };

  const submitForm = () => {
    const time = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    const filledItems = pendingItens.filter(i => formValues[i.id]?.trim());
    if (filledItems.length === 0) {
      toast({ title: "Erro", description: "Preencha ao menos um campo.", variant: "destructive" });
      return;
    }

    setRespostas(prev => prev.map(r => {
      if (r.id !== active.respostaOrgaoId) return r;
      return {
        ...r,
        itens: r.itens.map(i => formValues[i.id]?.trim() ? { ...i, valor: formValues[i.id].trim(), origem: "preenchimento_manual" as const } : i),
        status: "enviado" as const,
        updatedAt: new Date().toISOString().split("T")[0],
      };
    }));

    const botMsg: ChatMessage = {
      id: `m-${Date.now()}`,
      sender: "bot",
      text: `Dados preenchidos recebidos para ${filledItems.length} campo(s): ${filledItems.map(i => getCampoById(i.campoId)?.nome || i.campoId).join(", ")}. Aguardando validação pela Secretaria.`,
      time,
    };
    addMessage([botMsg]);
    setShowFormModal(false);
    toast({ title: "Dados enviados!", description: "Seus dados foram registrados com sucesso." });
  };

  const handleFileUpload = () => {
    const isBadQuality = Math.random() > 0.5;
    if (isBadQuality) {
      setShowBadImageModal(true);
    } else {
      const extracted: Record<string, string> = {};
      pendingItens.forEach(i => {
        if (i.tipoValor === "moeda") extracted[i.id] = "R$ " + (Math.floor(Math.random() * 90000) + 1000).toLocaleString("pt-BR");
        else if (i.tipoValor === "numero") extracted[i.id] = String(Math.floor(Math.random() * 9000) + 100);
        else if (i.tipoValor === "data") extracted[i.id] = "15/03/2025";
        else extracted[i.id] = "Dado extraído automaticamente";
      });
      setExtractedData(extracted);
      setShowImageModal(true);
    }
  };

  const confirmExtractedData = () => {
    const time = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    setRespostas(prev => prev.map(r => {
      if (r.id !== active.respostaOrgaoId) return r;
      return {
        ...r,
        itens: r.itens.map(i => extractedData[i.id] ? { ...i, valor: extractedData[i.id], origem: "imagem" as const } : i),
        status: "enviado" as const,
        updatedAt: new Date().toISOString().split("T")[0],
      };
    }));
    const botMsg: ChatMessage = {
      id: `m-${Date.now()}`,
      sender: "bot",
      text: "Dados extraídos da imagem foram confirmados e registrados.",
      time,
    };
    addMessage([botMsg]);
    setShowImageModal(false);
    toast({ title: "Dados confirmados!", description: "Os dados extraídos da imagem foram registrados." });
  };

  const currentProgresso = resposta ? (() => {
    const done = resposta.itens.filter(i => !!i.valor || i.validacaoStatus === "validado").length;
    return Math.round((done / resposta.itens.length) * 100);
  })() : 0;

  const itensEnviados = resposta ? resposta.itens.filter(i => !!i.valor && String(i.valor).trim() !== "").length : 0;
  const totalItens = resposta ? resposta.itens.length : 0;

  // Calculate prazo
  const prazoDate = solicitacao ? (() => {
    const d = new Date(solicitacao.createdAt);
    d.setDate(d.getDate() + solicitacao.prazoDias);
    return d;
  })() : null;
  const diasRestantes = prazoDate ? Math.ceil((prazoDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 0;

  const backTo = user?.role === "orgao" ? "/orgao-dashboard" : "/dashboard";

  return (
    <div className="min-h-screen bg-accent flex flex-col">
      <AppHeader title="Assistente de Coleta de Dados" showBack backTo={backTo} />

      {/* Solicitation info bar */}
      {solicitacao && (
        <div className="bg-card border-b border-border">
          <div className="container py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="font-semibold text-card-foreground text-sm">{solicitacao.titulo}</h2>
              <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Prazo: {prazoDate?.toLocaleDateString("pt-BR")}
                </span>
                <span className={`flex items-center gap-1 ${diasRestantes < 0 ? "text-destructive font-medium" : ""}`}>
                  <Clock className="h-3 w-3" />
                  {diasRestantes < 0 ? `${Math.abs(diasRestantes)} dia(s) atrasado` : `${diasRestantes} dia(s) restante(s)`}
                </span>
              </div>
            </div>
            <Badge variant="outline" className="text-xs shrink-0">
              {itensEnviados}/{totalItens} itens enviados
            </Badge>
          </div>
        </div>
      )}

      <main className="flex-1 container py-6 flex flex-col lg:flex-row gap-6 min-h-0">
        <div className="flex-1 flex flex-col lg:w-[70%] min-h-0">
          <Card className="flex-1 border-0 shadow-lg flex flex-col min-h-0 overflow-hidden">
            <CardContent className="flex-1 overflow-y-auto p-4 space-y-3">
              {active.messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"} animate-fade-in`}>
                  <div className={`flex items-end gap-2 max-w-[80%] ${msg.sender === "user" ? "flex-row-reverse" : ""}`}>
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      msg.sender === "user" ? "bg-secondary" : "bg-muted"
                    }`}>
                      {msg.sender === "user" ? <User className="h-4 w-4 text-secondary-foreground" /> : <Bot className="h-4 w-4 text-muted-foreground" />}
                    </div>
                    <div className={`rounded-xl px-4 py-2.5 ${
                      msg.sender === "user"
                        ? "bg-chat-user text-chat-user-foreground"
                        : "bg-chat-bot text-chat-bot-foreground border border-border"
                    }`}>
                      <p className="text-sm">{msg.text}</p>
                      <p className={`text-[10px] mt-1 ${msg.sender === "user" ? "text-chat-user-foreground/60" : "text-muted-foreground"}`}>{msg.time}</p>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>

            {pendingItens.length > 0 && (
              <div className="border-t px-4 py-3 flex gap-3">
                <Button className="flex-1 bg-secondary hover:bg-secondary/90 gap-2" onClick={handleFileUpload}>
                  <Upload className="h-4 w-4" /> Enviar Arquivo
                </Button>
                <Button className="flex-1 gap-2" variant="outline" onClick={openFormModal}>
                  <PenLine className="h-4 w-4" /> Preencher Dados
                </Button>
              </div>
            )}

            <div className="border-t p-3 flex gap-2">
              <Button variant="ghost" size="icon" className="text-muted-foreground"><Paperclip className="h-5 w-5" /></Button>
              <Input
                placeholder="Digite sua mensagem..."
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && sendMessage()}
                className="flex-1"
              />
              <Button size="icon" className="bg-secondary hover:bg-secondary/90" onClick={sendMessage}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        </div>

        <div className="lg:w-[30%]">
          <Card className="border-0 shadow-lg animate-slide-up sticky top-24">
            <CardHeader className="pb-3">
              <CardTitle className="text-primary text-base">Status de Conformidade</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{currentProgresso}% concluído</span>
                  <span className="text-xs text-muted-foreground">{itensEnviados}/{totalItens} itens</span>
                </div>
                <Progress value={currentProgresso} className="h-3" />
              </div>
              <div className="space-y-2">
                {resposta?.itens.map(item => {
                  const campo = getCampoById(item.campoId);
                  return (
                    <div key={item.id} className={`flex items-center justify-between rounded-lg p-3 text-sm ${
                      item.valor ? "bg-status-completed-bg" : "bg-status-pending-bg"
                    }`}>
                      <span className="flex items-center gap-2">
                        {item.valor
                          ? <CheckCircle className="h-4 w-4 text-status-completed" />
                          : <AlertCircle className="h-4 w-4 text-status-pending" />
                        }
                        <span className="truncate">{campo?.label || campo?.nome || item.campoId}</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Dynamic Form Modal */}
      <Dialog open={showFormModal} onOpenChange={setShowFormModal}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-primary flex items-center gap-2">
              <PenLine className="h-5 w-5" /> Preencher Dados
            </DialogTitle>
          </DialogHeader>
          {objetoTransp && (objetoTransp.formato === "XLSX") && (
            <div className="rounded-lg bg-status-aberta-bg/50 border border-status-aberta/20 p-3">
              <p className="text-xs text-card-foreground">Este dado deve ser enviado em formato XLSX.</p>
            </div>
          )}
          {objetoTransp && (
            <div className="rounded-lg bg-muted/50 border border-border p-3">
              <p className="text-xs text-muted-foreground">{objetoTransp.instrucao}</p>
            </div>
          )}
          <div className="space-y-4">
            {pendingItens.map(item => {
              const campo = getCampoById(item.campoId);
              const meta = getMetadatoCampo(item.campoId);
              const tipo = meta?.tipo || item.tipoValor;
              const isObrigatorio = solicitacao?.camposObrigatorios?.includes(item.campoId);
              const label = meta?.label || campo?.label || campo?.nome || item.campoId;

              return (
                <div key={item.id} className="space-y-1.5">
                  <Label className="flex items-center gap-2">
                    {label}
                    {isObrigatorio && <span className="text-destructive">*</span>}
                    <Badge variant="outline" className="text-[10px]">{tipoPlaceholder[tipo] ? tipo : item.tipoValor}</Badge>
                  </Label>
                  {tipo === "selecao" && meta?.opcoes ? (
                    <Select value={formValues[item.id] || ""} onValueChange={v => setFormValues(prev => ({ ...prev, [item.id]: v }))}>
                      <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        {meta.opcoes.map(op => (
                          <SelectItem key={op} value={op}>{op}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : tipo === "upload_multiplo" ? (
                    <div className="flex items-center gap-2">
                      <Button type="button" variant="outline" className="gap-2 flex-1" onClick={() => {
                        setFormValues(prev => ({ ...prev, [item.id]: "documentos_anexados.pdf" }));
                        toast({ title: "Arquivo(s) selecionado(s)", description: "Simulação de upload realizada." });
                      }}>
                        <FileUp className="h-4 w-4" />
                        {formValues[item.id] ? formValues[item.id] : "Selecionar arquivos"}
                      </Button>
                    </div>
                  ) : tipo === "texto_cnpj" ? (
                    <Input
                      placeholder="XX.XXX.XXX/XXXX-XX"
                      maxLength={18}
                      value={formValues[item.id] || ""}
                      onChange={e => {
                        let v = e.target.value.replace(/\D/g, "").slice(0, 14);
                        if (v.length > 12) v = v.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})/, "$1.$2.$3/$4-$5");
                        else if (v.length > 8) v = v.replace(/^(\d{2})(\d{3})(\d{3})(\d{0,4})/, "$1.$2.$3/$4");
                        else if (v.length > 5) v = v.replace(/^(\d{2})(\d{3})(\d{0,3})/, "$1.$2.$3");
                        else if (v.length > 2) v = v.replace(/^(\d{2})(\d{0,3})/, "$1.$2");
                        setFormValues(prev => ({ ...prev, [item.id]: v }));
                      }}
                    />
                  ) : tipo === "numero_ano" ? (
                    <Input
                      type="number"
                      min={1900}
                      max={2099}
                      placeholder="2025"
                      value={formValues[item.id] || ""}
                      onChange={e => setFormValues(prev => ({ ...prev, [item.id]: e.target.value.slice(0, 4) }))}
                    />
                  ) : tipo === "numero_inteiro" ? (
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      placeholder="0"
                      value={formValues[item.id] || ""}
                      onChange={e => setFormValues(prev => ({ ...prev, [item.id]: e.target.value.replace(/[^0-9]/g, "") }))}
                    />
                  ) : tipo === "texto_url" ? (
                    <Input
                      type="url"
                      placeholder="https://..."
                      value={formValues[item.id] || ""}
                      onChange={e => setFormValues(prev => ({ ...prev, [item.id]: e.target.value }))}
                    />
                  ) : (
                    <Input
                      type={tipo === "numero" ? "number" : tipo === "moeda" ? "number" : tipo === "data" ? "date" : "text"}
                      step={tipo === "moeda" ? "0.01" : undefined}
                      placeholder={tipoPlaceholder[tipo] || tipoPlaceholder[item.tipoValor] || ""}
                      value={formValues[item.id] || ""}
                      onChange={e => setFormValues(prev => ({ ...prev, [item.id]: e.target.value }))}
                    />
                  )}
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFormModal(false)}>Cancelar</Button>
            <Button className="bg-secondary hover:bg-secondary/90 gap-2" onClick={submitForm}>
              <Send className="h-4 w-4" /> Enviar Dados
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image OCR Review Modal */}
      <Dialog open={showImageModal} onOpenChange={setShowImageModal}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-primary flex items-center gap-2">
              <ImageIcon className="h-5 w-5" /> Dados Extraídos da Imagem
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-4">
            Revise os dados extraídos automaticamente. Edite se necessário antes de confirmar.
          </p>
          <div className="space-y-4">
            {pendingItens.map(item => {
              const campo = getCampoById(item.campoId);
              return (
                <div key={item.id} className="space-y-1.5">
                  <Label>{campo?.label || campo?.nome || item.campoId}</Label>
                  <Input
                    value={extractedData[item.id] || ""}
                    onChange={e => setExtractedData(prev => ({ ...prev, [item.id]: e.target.value }))}
                  />
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImageModal(false)}>Cancelar</Button>
            <Button className="bg-status-completed hover:bg-status-completed/90 text-primary-foreground gap-2" onClick={confirmExtractedData}>
              <CheckCircle className="h-4 w-4" /> Confirmar Dados
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bad Image Quality Modal */}
      <Dialog open={showBadImageModal} onOpenChange={setShowBadImageModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-status-overdue flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" /> Qualidade Insuficiente
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            A imagem enviada não possui qualidade suficiente para extração automática dos dados. O que deseja fazer?
          </p>
          <div className="flex gap-3 mt-4">
            <Button className="flex-1 gap-2" variant="outline" onClick={() => {
              setShowBadImageModal(false);
              const extracted: Record<string, string> = {};
              pendingItens.forEach(i => {
                if (i.tipoValor === "moeda") extracted[i.id] = "R$ " + (Math.floor(Math.random() * 90000) + 1000).toLocaleString("pt-BR");
                else if (i.tipoValor === "numero") extracted[i.id] = String(Math.floor(Math.random() * 9000) + 100);
                else if (i.tipoValor === "data") extracted[i.id] = "15/03/2025";
                else extracted[i.id] = "Dado extraído";
              });
              setExtractedData(extracted);
              setShowImageModal(true);
            }}>
              <Upload className="h-4 w-4" /> Enviar outra foto
            </Button>
            <Button className="flex-1 gap-2" onClick={() => {
              setShowBadImageModal(false);
              openFormModal();
            }}>
              <PenLine className="h-4 w-4" /> Preencher tabela
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ChatbotPage;

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { mockChats, ChatConversation, ChatMessage, ItemSolicitacao, camposPlanilha } from "@/data/mockData";
import { Send, Paperclip, Bot, User, CheckCircle, AlertCircle, Upload, FileText, PenLine, ImageIcon, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import AppHeader from "@/components/AppHeader";

const tipoPlaceholder: Record<string, string> = {
  texto: "Digite o texto...",
  monetario: "R$ 0,00",
  numerico: "0",
  data: "DD/MM/AAAA",
  arquivo: "Selecione um arquivo",
};

const ChatbotPage = () => {
  const { toast } = useToast();
  const [conversations, setConversations] = useState<ChatConversation[]>(mockChats);
  const [activeId, setActiveId] = useState(mockChats[0].id);
  const [input, setInput] = useState("");

  // Modals
  const [showFormModal, setShowFormModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showBadImageModal, setShowBadImageModal] = useState(false);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [extractedData, setExtractedData] = useState<Record<string, string>>({});

  const active = conversations.find(c => c.id === activeId)!;
  const pendingItens = active.itens.filter(i => i.validacao === "pendente");

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

  // Handle "Preencher Dados" — open dynamic form
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

    setConversations(prev =>
      prev.map(c => {
        if (c.id !== activeId) return c;
        const newItens = c.itens.map(i => {
          if (formValues[i.id]?.trim()) {
            return { ...i, valorRecebido: formValues[i.id].trim() };
          }
          return i;
        });
        const done = newItens.filter(i => i.valorRecebido).length;
        const botMsg: ChatMessage = {
          id: `m-${Date.now()}`,
          sender: "bot",
          text: `Dados preenchidos recebidos para ${filledItems.length} campo(s): ${filledItems.map(i => i.campoNome).join(", ")}. Aguardando validação pela Secretaria.`,
          time,
        };
        return {
          ...c,
          itens: newItens,
          progresso: Math.round((done / newItens.length) * 100),
          messages: [...c.messages, botMsg],
        };
      })
    );
    setShowFormModal(false);
    toast({ title: "Dados enviados!", description: "Seus dados foram registrados com sucesso." });
  };

  // Handle file upload / image OCR simulation
  const handleFileUpload = () => {
    // Simulate: 50% chance of "bad image quality"
    const isBadQuality = Math.random() > 0.5;
    if (isBadQuality) {
      setShowBadImageModal(true);
    } else {
      // Simulate OCR extraction
      const extracted: Record<string, string> = {};
      pendingItens.forEach(i => {
        if (i.campoTipo === "monetario") extracted[i.id] = "R$ " + (Math.floor(Math.random() * 90000) + 1000).toLocaleString("pt-BR");
        else if (i.campoTipo === "numerico") extracted[i.id] = String(Math.floor(Math.random() * 9000) + 100);
        else if (i.campoTipo === "data") extracted[i.id] = "15/03/2025";
        else extracted[i.id] = "Dado extraído automaticamente";
      });
      setExtractedData(extracted);
      setShowImageModal(true);
    }
  };

  const confirmExtractedData = () => {
    const time = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    setConversations(prev =>
      prev.map(c => {
        if (c.id !== activeId) return c;
        const newItens = c.itens.map(i => {
          if (extractedData[i.id]) return { ...i, valorRecebido: extractedData[i.id] };
          return i;
        });
        const done = newItens.filter(i => i.valorRecebido).length;
        const botMsg: ChatMessage = {
          id: `m-${Date.now()}`,
          sender: "bot",
          text: `Dados extraídos da imagem foram confirmados e registrados. ${done} de ${newItens.length} campos preenchidos.`,
          time,
        };
        return {
          ...c,
          itens: newItens,
          progresso: Math.round((done / newItens.length) * 100),
          messages: [...c.messages, botMsg],
        };
      })
    );
    setShowImageModal(false);
    toast({ title: "Dados confirmados!", description: "Os dados extraídos da imagem foram registrados." });
  };

  const handleUploadFile = (checkIndex: number) => {
    const item = active.itens[checkIndex];
    setConversations(prev =>
      prev.map(c => {
        if (c.id !== activeId) return c;
        const newItens = [...c.itens];
        newItens[checkIndex] = { ...newItens[checkIndex], valorRecebido: "arquivo_enviado.pdf" };
        const done = newItens.filter(i => i.valorRecebido).length;
        return { ...c, itens: newItens, progresso: Math.round((done / newItens.length) * 100) };
      })
    );
    toast({ title: "Arquivo enviado", description: `Arquivo para "${item.campoNome}" registrado.` });
  };

  return (
    <div className="min-h-screen bg-accent flex flex-col">
      <AppHeader title="Assistente de Coleta de Dados" showBack />
      <main className="flex-1 container py-6 flex flex-col lg:flex-row gap-6 min-h-0">
        {/* Chat column */}
        <div className="flex-1 flex flex-col lg:w-[70%] min-h-0">
          {/* Protocol list */}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
            {conversations.map(c => (
              <button
                key={c.id}
                onClick={() => setActiveId(c.id)}
                className={`flex-shrink-0 rounded-lg px-4 py-2 text-left text-sm transition-all active:scale-[0.98] ${
                  c.id === activeId
                    ? "bg-secondary text-secondary-foreground shadow-md"
                    : "bg-card hover:bg-muted border border-border"
                }`}
              >
                <div className="font-medium">{c.protocolo}</div>
                <div className="text-xs opacity-80">{c.orgao}</div>
              </button>
            ))}
          </div>

          {/* Messages */}
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

            {/* Action buttons */}
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

        {/* Compliance panel */}
        <div className="lg:w-[30%]">
          <Card className="border-0 shadow-lg animate-slide-up sticky top-24">
            <CardHeader className="pb-3">
              <CardTitle className="text-primary text-base">Status de Conformidade</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{active.progresso}% concluído</span>
                  <span className="text-xs text-muted-foreground">{active.protocolo}</span>
                </div>
                <Progress value={active.progresso} className="h-3" />
              </div>
              <div className="space-y-2">
                {active.itens.map((item, i) => (
                  <div key={item.id} className={`flex items-center justify-between rounded-lg p-3 text-sm ${
                    item.valorRecebido ? "bg-status-completed-bg" : "bg-status-pending-bg"
                  }`}>
                    <span className="flex items-center gap-2">
                      {item.valorRecebido
                        ? <CheckCircle className="h-4 w-4 text-status-completed" />
                        : <AlertCircle className="h-4 w-4 text-status-pending" />
                      }
                      <span className="truncate">{item.campoNome}</span>
                    </span>
                    {!item.valorRecebido && (
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1 shrink-0" onClick={() => handleUploadFile(i)}>
                        <Upload className="h-3 w-3" /> Carregar
                      </Button>
                    )}
                  </div>
                ))}
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
          <div className="space-y-4">
            {pendingItens.map(item => (
              <div key={item.id} className="space-y-1.5">
                <Label className="flex items-center gap-2">
                  {item.campoNome}
                  <Badge variant="outline" className="text-[10px]">{item.campoTipo}</Badge>
                </Label>
                <Input
                  type={item.campoTipo === "numerico" ? "number" : item.campoTipo === "data" ? "date" : "text"}
                  placeholder={tipoPlaceholder[item.campoTipo]}
                  value={formValues[item.id] || ""}
                  onChange={e => setFormValues(prev => ({ ...prev, [item.id]: e.target.value }))}
                />
              </div>
            ))}
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
            {pendingItens.map(item => (
              <div key={item.id} className="space-y-1.5">
                <Label>{item.campoNome}</Label>
                <Input
                  value={extractedData[item.id] || ""}
                  onChange={e => setExtractedData(prev => ({ ...prev, [item.id]: e.target.value }))}
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImageModal(false)}>Cancelar</Button>
            <Button className="bg-status-completed hover:bg-status-completed/90 text-white gap-2" onClick={confirmExtractedData}>
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
              // Simulate retrying with good result
              const extracted: Record<string, string> = {};
              pendingItens.forEach(i => {
                if (i.campoTipo === "monetario") extracted[i.id] = "R$ " + (Math.floor(Math.random() * 90000) + 1000).toLocaleString("pt-BR");
                else if (i.campoTipo === "numerico") extracted[i.id] = String(Math.floor(Math.random() * 9000) + 100);
                else if (i.campoTipo === "data") extracted[i.id] = "15/03/2025";
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

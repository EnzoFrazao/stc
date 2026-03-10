import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { mockChats, ChatConversation, ChatMessage } from "@/data/mockData";
import { Send, Paperclip, Bot, User, CheckCircle, AlertCircle, Upload } from "lucide-react";
import AppHeader from "@/components/AppHeader";

const ChatbotPage = () => {
  const [conversations, setConversations] = useState<ChatConversation[]>(mockChats);
  const [activeId, setActiveId] = useState(mockChats[0].id);
  const [input, setInput] = useState("");

  const active = conversations.find(c => c.id === activeId)!;

  const sendMessage = () => {
    if (!input.trim()) return;
    const newMsg: ChatMessage = {
      id: `m-${Date.now()}`,
      sender: "user",
      text: input,
      time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    };
    const botReply: ChatMessage = {
      id: `m-${Date.now() + 1}`,
      sender: "bot",
      text: "Recebido! Estou processando sua solicitação. Caso tenha documentos para enviar, utilize o botão de anexo.",
      time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    };
    setConversations(prev =>
      prev.map(c => c.id === activeId ? { ...c, messages: [...c.messages, newMsg, botReply] } : c)
    );
    setInput("");
  };

  const handleFileUpload = (checkIndex: number) => {
    setConversations(prev =>
      prev.map(c => {
        if (c.id !== activeId) return c;
        const newChecklist = [...c.checklist];
        newChecklist[checkIndex] = { ...newChecklist[checkIndex], concluido: true };
        const done = newChecklist.filter(x => x.concluido).length;
        return { ...c, checklist: newChecklist, progresso: Math.round((done / newChecklist.length) * 100) };
      })
    );
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
                className={`flex-shrink-0 rounded-lg px-4 py-2 text-left text-sm transition-all ${
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
                {active.checklist.map((item, i) => (
                  <div key={i} className={`flex items-center justify-between rounded-lg p-3 text-sm ${
                    item.concluido ? "bg-status-completed-bg" : "bg-status-pending-bg"
                  }`}>
                    <span className="flex items-center gap-2">
                      {item.concluido
                        ? <CheckCircle className="h-4 w-4 text-status-completed" />
                        : <AlertCircle className="h-4 w-4 text-status-pending" />
                      }
                      {item.nome}
                    </span>
                    {!item.concluido && (
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => handleFileUpload(i)}>
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
    </div>
  );
};

export default ChatbotPage;

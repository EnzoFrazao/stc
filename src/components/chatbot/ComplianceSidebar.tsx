import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { CheckCircle, AlertCircle, Upload, RefreshCw } from "lucide-react";
import { RespostaItem, getCampoById } from "@/data/mockData";

interface ComplianceSidebarProps {
  itens: RespostaItem[];
  currentProgresso: number;
  itensEnviados: number;
  totalItens: number;
  onItemUpload: (item: RespostaItem) => void;
}

const ComplianceSidebar = ({ itens, currentProgresso, itensEnviados, totalItens, onItemUpload }: ComplianceSidebarProps) => {
  return (
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

        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Para complementar um dado específico, use o botão de envio ao lado do item correspondente.
        </p>

        <div className="space-y-2">
          {itens.map(item => {
            const campo = getCampoById(item.campoId);
            const filled = !!item.valor && String(item.valor).trim() !== "";
            const label = campo?.label || campo?.nome || item.campoId;

            return (
              <div
                key={item.id}
                className={`flex items-center justify-between rounded-lg p-3 text-sm gap-2 ${
                  filled ? "bg-status-completed-bg" : "bg-status-pending-bg"
                }`}
              >
                <span className="flex items-center gap-2 min-w-0">
                  {filled
                    ? <CheckCircle className="h-4 w-4 text-status-completed shrink-0" />
                    : <AlertCircle className="h-4 w-4 text-status-pending shrink-0" />
                  }
                  <span className="truncate">{label}</span>
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  className={`shrink-0 h-7 px-2 text-xs gap-1 ${
                    filled
                      ? "text-muted-foreground hover:text-secondary"
                      : "text-secondary hover:text-secondary/80"
                  }`}
                  onClick={() => onItemUpload(item)}
                  title={filled ? "Substituir arquivo" : "Enviar arquivo para este item"}
                >
                  {filled ? <RefreshCw className="h-3 w-3" /> : <Upload className="h-3 w-3" />}
                  {filled ? "Substituir" : "Enviar"}
                </Button>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default ComplianceSidebar;

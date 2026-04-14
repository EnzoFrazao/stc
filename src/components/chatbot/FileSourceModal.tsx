import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, Image, FileUp, FileText, X } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface FileSourceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectSource: (source: "camera" | "gallery" | "file" | "document") => void;
  targetItemLabel?: string;
}

const FileSourceModal = ({ open, onOpenChange, onSelectSource, targetItemLabel }: FileSourceModalProps) => {
  const isMobile = useIsMobile();

  const sources = [
    { id: "camera" as const, label: "Tirar foto", icon: Camera, description: "Usar a câmera do dispositivo" },
    { id: "gallery" as const, label: "Escolher da galeria", icon: Image, description: "Selecionar uma imagem existente" },
    { id: "file" as const, label: "Abrir arquivos", icon: FileUp, description: "Selecionar um arquivo do dispositivo" },
    { id: "document" as const, label: "Selecionar documento", icon: FileText, description: "Escolher um documento (PDF, XLSX...)" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${isMobile ? "max-w-[95vw] rounded-t-2xl" : "max-w-sm"}`}>
        <DialogHeader>
          <DialogTitle className="text-primary text-base flex items-center gap-2">
            <FileUp className="h-5 w-5" />
            {targetItemLabel ? `Enviar arquivo — ${targetItemLabel}` : "Enviar Arquivo"}
          </DialogTitle>
        </DialogHeader>
        {targetItemLabel && (
          <p className="text-xs text-muted-foreground -mt-2">
            O arquivo enviado será analisado para preencher o campo <strong>{targetItemLabel}</strong>.
          </p>
        )}
        {!targetItemLabel && (
          <p className="text-xs text-muted-foreground -mt-2">
            O arquivo será analisado como um todo para identificar quais dados do checklist podem ser preenchidos automaticamente.
          </p>
        )}
        <div className="space-y-2 mt-1">
          {sources.map(s => (
            <Button
              key={s.id}
              variant="outline"
              className="w-full justify-start gap-3 h-auto py-3 px-4"
              onClick={() => {
                onSelectSource(s.id);
                onOpenChange(false);
              }}
            >
              <s.icon className="h-5 w-5 text-secondary shrink-0" />
              <div className="text-left">
                <p className="text-sm font-medium">{s.label}</p>
                <p className="text-xs text-muted-foreground">{s.description}</p>
              </div>
            </Button>
          ))}
        </div>
        <Button variant="ghost" className="w-full mt-1 gap-2 text-muted-foreground" onClick={() => onOpenChange(false)}>
          <X className="h-4 w-4" /> Cancelar
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default FileSourceModal;

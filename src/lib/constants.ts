export const ROLES = {
  ADMIN: "admin",
  ORGAO: "orgao",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const STATUS_LABELS: Record<string, string> = {
  enviada: "Enviada",
  aberta: "Aberta",
  parcial: "Parcial",
  nao_enviada: "Não Enviada",
  fechada: "Fechada",
};

export const CANAIS_NOTIFICACAO = {
  EMAIL: "email",
  WHATSAPP: "whatsapp",
  OUTRO: "outro",
} as const;

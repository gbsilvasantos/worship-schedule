export interface Membro {
  id: number;
  nome: string;
  sobrenome: string;
  funcoes: Funcao[] | string; // Array de funções que o membro pode exercer ou string do PostgreSQL
  // Campos calculados para estatísticas (vindos de queries específicas)
  ultima_escalacao?: string;
  dias_desde_ultima?: number;
  total_escalacoes_90_dias?: number;
  proxima_escalacao?: string;
  ultima_funcao?: string; // Última função que o membro exerceu
}

// Interface para ausência
export interface Ausencia {
  id: number;
  membro_id: number;
  data_inicio: string;
  data_fim: string;
  motivo?: string;
  // Campos calculados com informações do membro
  nome_membro?: string;
  funcoes_membro?: Funcao[]; // Array de funções do membro
}

// Interface para histórico de escalas
export interface HistoricoEscala {
  id: number;
  membro_id: number;
  data_culto: string; // TIMESTAMP como string ISO
  funcao: Funcao;
  escalado_em: string;
  // Campos calculados
  nome_membro?: string;
  funcoes_membro?: Funcao[]; // Array de funções atuais do membro
}

// Interface para escala gerada
export interface EscalaGerada {
  id: number;
  data_culto: string; // TIMESTAMP como string ISO
  dados_escala: DadosEscala;
  ativo: boolean;
}

// Interface para dados de uma escala
export interface DadosEscala {
  [data: string]: {
    [funcao: string]: Membro[];
  };
}

// Interface MembroComEstatisticas removida - usar Membro diretamente

// Tipo para funções musicais
export type Funcao = 
  | 'Vocalista'
  | 'Guitarrista' 
  | 'Violão'
  | 'Baixista'
  | 'Baterista'
  | 'Tecladista';

// Manter Role como alias para compatibilidade
export type Role = Funcao;

// Interface para criação de novo membro
export interface CreateMemberRequest {
  nome: string;
  sobrenome: string;
  funcoes: Funcao[]; // Array de funções que o membro pode exercer
}

// Interface para criação de nova ausência
export interface CreateAbsenceRequest {
  membro_id: number;
  data_inicio: string;
  data_fim: string;
  motivo?: string;
}

// Interface para geração de escala
export interface GenerateScheduleRequest {
  datas: string[]; // Cada string agora deve conter data + horário (ISO format)
  horario?: string; // Horário padrão se não especificado nas datas
}

// Lista de funções disponíveis
export const FUNCOES: Funcao[] = [
  'Vocalista',
  'Guitarrista',
  'Violão',
  'Baixista',
  'Baterista',
  'Tecladista'
];

// Mapeamento de ícones para cada função
export const ICONES_FUNCOES: Record<Funcao, string> = {
  'Vocalista': '🎤',
  'Guitarrista': '🎸',
  'Violão': '🪕',
  'Baixista': '🎻',
  'Baterista': '🥁',
  'Tecladista': '🎹'
};

// Eventos do Socket.IO
export interface EventosSocket {
  'membro-registrado': (membro: Membro) => void;
  'membro-atualizado': (membro: Membro) => void;
  'ausencia-marcada': (ausencia: Ausencia) => void;
  'ausencia-removida': (idAusencia: number) => void;
  'escala-gerada': (escala: DadosEscala) => void;
  'escala-confirmada': (escala: DadosEscala) => void;
  'estatisticas-membros-atualizadas': (membros: Membro[]) => void;
}

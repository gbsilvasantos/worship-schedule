// Interface para dados do membro
export interface Membro {
  id: number;
  nome: string;
  sobrenome: string;
  funcoes: Funcao[]; // Array de funções que o membro pode exercer
  // Campos calculados para estatísticas
  ultima_escalacao?: string;
  total_escalacoes_90_dias?: number;
  total_ausencias_90_dias?: number;
  proxima_escalacao?: string;
}

// Interface para dados de ausência
export interface Ausencia {
  id: number;
  membro_id: number;
  nome_membro: string;
  funcoes_membro: Funcao[]; // Array de funções do membro
  data_inicio: string;
  data_fim: string;
  motivo?: string;
}

// Interface para histórico de escalas
export interface HistoricoEscala {
  id: number;
  membro_id: number;
  nome_membro: string;
  funcoes_membro: Funcao[]; // Array de funções do membro
  data_culto: string; // Agora inclui timestamp
  funcao: Funcao; // Função específica nesta escala
  escalado_em: string;
  gerado_por?: string;
}

// Interface para dados de uma escala
export interface DadosEscala {
  [data: string]: {
    [funcao: string]: Membro[];
  };
}

// Tipo para funções musicais
export type Funcao = 
  | 'Vocalista'
  | 'Guitarrista' 
  | 'Violão'
  | 'Baixista'
  | 'Baterista'
  | 'Tecladista';

// Interface para requisição de criação de membro
export interface RequisicaoCriarMembro {
  nome: string;
  sobrenome: string;
  funcoes: Funcao[]; // Array de funções que o membro pode exercer
}

// Interface para requisição de criação de ausência
export interface RequisicaoCriarAusencia {
  membro_id: number;
  data_inicio: string;
  data_fim: string;
  motivo?: string;
}

// Interface para resposta da API
export interface RespostaApi<T> {
  message: string;
  data?: T;
  error?: string;
}

// Interface para dados do formulário de membro
export interface DadosFormularioMembro {
  primeiroNome: string;
  ultimoNome: string;
  funcoes: Funcao[]; // Array de funções que o membro pode exercer
}

// Interface para dados do formulário de ausência
export interface DadosFormularioAusencia {
  membroId: number;
  dataInicio: string;
  dataFim: string;
  motivo: string;
}

// Interface para requisição de edição de escala
export interface RequisicaoEditarEscala {
  data_original: string;
  nova_data_culto: string;
  membros: {
    [funcao: string]: Membro[];
  };
}

// Interface para dados do formulário de edição de escala
export interface DadosFormularioEditarEscala {
  data: string;
  horario: string;
  membrosEscalados: {
    [funcao: string]: Membro[];
  };
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

// Aliases para compatibilidade com código existente
export type Member = Membro;
export type Absence = Ausencia;
export type ScheduleHistory = HistoricoEscala;
export type ScheduleData = DadosEscala;
export type Role = Funcao;
export type CreateMemberRequest = RequisicaoCriarMembro;
export type CreateAbsenceRequest = RequisicaoCriarAusencia;
export type ApiResponse<T> = RespostaApi<T>;
export type MemberFormData = DadosFormularioMembro;
export type AbsenceFormData = DadosFormularioAusencia;
export const ROLES = FUNCOES;
export const ROLE_ICONS = ICONES_FUNCOES;

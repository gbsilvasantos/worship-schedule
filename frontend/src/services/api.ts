import axios from 'axios';
import { 
  Membro, 
  Ausencia, 
  HistoricoEscala, 
  RequisicaoCriarMembro, 
  RequisicaoCriarAusencia, 
  DadosEscala,
  RequisicaoEditarEscala
} from '../types';

// URL base da API - configurada via variável de ambiente
const URL_BASE_API = process.env.REACT_APP_API_URL;

// Cliente HTTP configurado para a API
const clienteApi = axios.create({
  baseURL: URL_BASE_API,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptador para logging de chamadas
clienteApi.interceptors.request.use(
  (config) => {
    console.log(`🌐 API: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('🔥 API Request Error:', error);
    return Promise.reject(error);
  }
);

clienteApi.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('🔥 API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// ==================== MEMBROS ====================

export const membrosApi = {
  // Listar todos os membros
  listarTodos: async (): Promise<Membro[]> => {
    const response = await clienteApi.get('/membros');
    return response.data;
  },

  // Listar membros com estatísticas
  listarTodosComEstatisticas: async (): Promise<Membro[]> => {
    const response = await clienteApi.get('/membros/estatisticas');
    return response.data;
  },

  // Buscar membro por ID
  buscarPorId: async (id: number): Promise<Membro> => {
    const response = await clienteApi.get(`/membros/${id}`);
    return response.data;
  },

  // Buscar estatísticas de um membro
  buscarEstatisticas: async (id: number): Promise<Membro> => {
    const response = await clienteApi.get(`/membros/${id}/estatisticas`);
    return response.data;
  },

  // Criar novo membro
  criar: async (dados: RequisicaoCriarMembro): Promise<{ membro: Membro; atualizado: boolean }> => {
    const response = await clienteApi.post('/membros', dados);
    return response.data;
  },

  // Atualizar membro
  atualizar: async (id: number, dados: Partial<RequisicaoCriarMembro>): Promise<{ membro: Membro }> => {
    const response = await clienteApi.put(`/membros/${id}`, dados);
    return response.data;
  },

  // Deletar membro
  excluir: async (id: number): Promise<{ membro: Membro }> => {
    const response = await clienteApi.delete(`/membros/${id}`);
    return response.data;
  },
};

// ==================== AUSÊNCIAS ====================

export const ausenciasApi = {
  // Listar todas as ausências ativas
  listarTodas: async (): Promise<Ausencia[]> => {
    const response = await clienteApi.get('/ausencias');
    return response.data;
  },

  // Buscar ausências de um membro
  buscarPorMembro: async (idMembro: number): Promise<Ausencia[]> => {
    const response = await clienteApi.get(`/ausencias/membro/${idMembro}`);
    return response.data;
  },

  // Verificar se membro está ausente em uma data
  verificarAusencia: async (idMembro: number, data: string): Promise<{ esta_ausente: boolean; ausencia: Ausencia | null }> => {
    const response = await clienteApi.get(`/ausencias/verificar/${idMembro}/${data}`);
    return response.data;
  },

  // Criar nova ausência
  criar: async (dados: RequisicaoCriarAusencia): Promise<{ ausencia: Ausencia }> => {
    const response = await clienteApi.post('/ausencias', dados);
    return response.data;
  },

  // Atualizar ausência
  atualizar: async (id: number, dados: Partial<Omit<RequisicaoCriarAusencia, 'membro_id'>>): Promise<{ ausencia: Ausencia }> => {
    const response = await clienteApi.put(`/ausencias/${id}`, dados);
    return response.data;
  },

  // Deletar ausência
  excluir: async (id: number): Promise<{ ausencia: Ausencia }> => {
    const response = await clienteApi.delete(`/ausencias/${id}`);
    return response.data;
  },
};

// ==================== ESCALAS ====================

export const escalasApi = {
  // Gerar escala
  gerar: async (datas: string[], configuracao: Record<string, number>): Promise<{ escalas: DadosEscala }> => {
    const response = await clienteApi.post('/escalas/gerar', { 
      datas: datas,
      configuracao: configuracao
    });
    return response.data;
  },

  // Confirmar e salvar escala
  confirmar: async (escala: DadosEscala): Promise<{ mensagem: string }> => {
    const response = await clienteApi.post('/escalas/confirmar', { escala: escala });
    return response.data;
  },

  // Buscar histórico
  buscarHistorico: async (parametros?: {
    limite?: number;
    membro_id?: number;
    data_inicial?: string;
    data_final?: string;
  }): Promise<HistoricoEscala[]> => {
    const params = {
      limite: parametros?.limite,
      membro_id: parametros?.membro_id,
      data_inicial: parametros?.data_inicial,
      data_final: parametros?.data_final
    };
    const response = await clienteApi.get('/escalas/historico', { params });
    return response.data;
  },

  // Buscar escalas salvas
  buscarSalvas: async (parametros?: {
    limite?: number;
    data_inicial?: string;
    data_final?: string;
  }): Promise<DadosEscala[]> => {
    const params = {
      limite: parametros?.limite,
      data_inicial: parametros?.data_inicial,
      data_final: parametros?.data_final
    };
    const response = await clienteApi.get('/escalas/salvas', { params });
    return response.data;
  },

  // Buscar estatísticas
  buscarEstatisticas: async (): Promise<any> => {
    const response = await clienteApi.get('/escalas/estatisticas');
    return response.data;
  },

  // Excluir uma escala salva
  excluir: async (data: string): Promise<{ mensagem: string }> => {
    // A API já retorna e espera o formato 'YYYY-MM-DD HH:mm:ss' diretamente
    const response = await clienteApi.delete(`/escalas/data/${encodeURIComponent(data)}`);
    return response.data;
  },

  // Editar uma escala existente
  editar: async (dados: RequisicaoEditarEscala): Promise<{ message: string; data_original: string; nova_data_culto: string }> => {
    const response = await clienteApi.put('/escalas/editar', dados);
    return response.data;
  },
};

// ==================== SAÚDE DO SISTEMA ====================

export const saudeApi = {
  verificar: async (): Promise<{ status: string; timestamp: string }> => {
    const response = await clienteApi.get('/health');
    return response.data;
  },
};

// Exportando o cliente API para uso direto
export default clienteApi;

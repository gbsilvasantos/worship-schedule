import { query } from '../database/connection';
import { Membro, DadosEscala, Funcao } from '../types';

/**
 * Serviço para geração e gerenciamento de escalas de louvor
 * Implementa algoritmo de igualdade para distribuição justa entre os membros
 */
export class ServicoGeradorEscala {
  
  /**
   * Formatar data para logs no formato brasileiro
   */
  private formatarDataLog(data: string): string {
    try {
      // Se a data está em formato ISO (2025-07-29T19:00:00)
      if (data.includes('T')) {
        const dateObj = new Date(data);
        return dateObj.toLocaleString('pt-BR', {
          timeZone: 'America/Sao_Paulo',
          day: '2-digit',
          month: '2-digit', 
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }).replace(',', '');
      }
      // Se já está em formato brasileiro, retornar como está
      return data;
    } catch (error) {
      return data; // Fallback para o formato original
    }
  }
  // Versão atualizada com distribuição igualitária e verificação de ausências
  
  /**
   * Gera escalas para as datas selecionadas
   * Implementa algoritmo de distribuição igualitária entre datas e funções
   */
  async gerarEscalas(datas: string[], configuracao: Record<string, number>): Promise<DadosEscala> {
    const resultado: DadosEscala = {};

    // Verificar se já existem escalas nas datas selecionadas
    const datasComEscala = await this.verificarDatasComEscala(datas);
    
    if (datasComEscala.length > 0) {
      const datasFormatadas = datasComEscala.map((data: any) => {
        try {
          let dataObj: Date;
          
          if (data instanceof Date) {
            dataObj = data;
          } else if (typeof data === 'string' && data.includes('T')) {
            dataObj = new Date(data);
          } else if (typeof data === 'string') {
            dataObj = new Date(data + 'T00:00:00');
          } else {
            dataObj = new Date(data);
          }
          
          if (isNaN(dataObj.getTime())) {
            return String(data);
          }
          
          const dataFormatada = dataObj.toLocaleDateString('pt-BR');
          const horarioFormatado = dataObj.toLocaleTimeString('pt-BR', { 
            hour: '2-digit', 
            minute: '2-digit' 
          });
          
          return `${dataFormatada} no horário ${horarioFormatado}`;
        } catch (error) {
          return String(data);
        }
      });
      
      if (datasFormatadas.length === 1) {
        throw new Error(`Já existe escala dia ${datasFormatadas[0]}`);
      } else {
        throw new Error(`Já existem escalas nos dias ${datasFormatadas.join(', ')}`);
      }
    }

    // **NOVO ALGORITMO DE DISTRIBUIÇÃO IGUALITÁRIA**
    return await this.gerarEscalasComDistribuicaoIgualitaria(datas, configuracao);
  }

  /**
   * Algoritmo aprimorado que distribui membros igualitariamente entre todas as datas
   * e alterna funções para membros multifuncionais
   * MELHORADO: Garante que um membro não seja escalado em mais de uma função na mesma data
   */
  private async gerarEscalasComDistribuicaoIgualitaria(datas: string[], configuracao: Record<string, number>): Promise<DadosEscala> {
    const resultado: DadosEscala = {};
    const todasFuncoes = ['Vocalista', 'Tecladista', 'Violão', 'Guitarrista', 'Baixista', 'Baterista'];
    
    // 1. Coletar todos os membros disponíveis para todas as datas
    const membrosDisponiveisPorData: { [data: string]: Membro[] } = {};
    for (const data of datas) {
      membrosDisponiveisPorData[data] = await this.buscarMembrosDisponiveis(data);
    }

    // 2. Criar mapa de controle de escalações por membro
    const controleEscalacoes: { [membroId: number]: { 
      totalEscalacoes: number;
      ultimaFuncao?: string;
      datasEscaladas: string[];
      funcoesEscaladas: string[];
      // Novo: histórico de funções para melhor alternância
      historicoFuncoes: { [funcao: string]: number };
    } } = {};

    // 3. Inicializar controle para cada membro
    const todosOsMembros = new Set<number>();
    Object.values(membrosDisponiveisPorData).forEach(membros => {
      membros.forEach(membro => {
        todosOsMembros.add(membro.id);
        if (!controleEscalacoes[membro.id]) {
          controleEscalacoes[membro.id] = {
            totalEscalacoes: 0,
            datasEscaladas: [],
            funcoesEscaladas: [],
            historicoFuncoes: {}
          };
        }
      });
    });

    // 4. Para cada data, distribuir membros de forma igualitária
    for (let dataIndex = 0; dataIndex < datas.length; dataIndex++) {
      const data = datas[dataIndex];
      
      // NOVO: Rastrear membros já escalados nesta data para evitar múltiplas funções
      const membrosJaEscaladosNaData = new Set<number>();
      
      const membrosDisponiveis = membrosDisponiveisPorData[data];
      const membrosPorFuncao = this.agruparPorFuncao(membrosDisponiveis);
      const escala: { [funcao: string]: Membro[] } = {};
      
      // Inicializar todas as funções
      todasFuncoes.forEach(funcao => {
        escala[funcao] = [];
      });

      // 5. ESTRATÉGIA DE ALTERNÂNCIA: Ordenar funções de forma diferente para cada data
      // Isso força membros multifuncionais a serem escalados em funções diferentes
      let funcoesParaProcessar = todasFuncoes.filter(funcao => (configuracao[funcao] || 0) > 0);
      
      // ALTERNÂNCIA INTELIGENTE: Para datas pares/ímpares, inverter ordem de certas funções
      if (dataIndex % 2 === 1) {
        // Para datas ímpares, priorizar segundas funções de membros multifuncionais
        const funcoesReordenadas = [];
        const funcoesProcessadas = new Set();
        
        // Primeiro, adicionar funções "secundárias" de membros multifuncionais
        for (const funcao of ['Violão', 'Baterista', 'Guitarrista', 'Baixista']) {
          if (funcoesParaProcessar.includes(funcao)) {
            funcoesReordenadas.push(funcao);
            funcoesProcessadas.add(funcao);
          }
        }
        
        // Depois, adicionar funções "primárias"
        for (const funcao of ['Vocalista', 'Tecladista']) {
          if (funcoesParaProcessar.includes(funcao)) {
            funcoesReordenadas.push(funcao);
            funcoesProcessadas.add(funcao);
          }
        }
        
        // Adicionar qualquer função restante
        for (const funcao of funcoesParaProcessar) {
          if (!funcoesProcessadas.has(funcao)) {
            funcoesReordenadas.push(funcao);
          }
        }
        
        funcoesParaProcessar = funcoesReordenadas;
      }
      
      const funcoesOrdenadas = funcoesParaProcessar;
      
      // 6. Para cada função, selecionar membros priorizando distribuição igualitária
      for (const funcao of funcoesOrdenadas) {
        const quantidadeNecessaria = configuracao[funcao] || 0;
        if (quantidadeNecessaria === 0) continue;
        
        // FILTRO ABSOLUTO: UMA FUNÇÃO POR PESSOA POR DATA (obrigatório)
        let membrosDisponivelsFuncao = (membrosPorFuncao[funcao] || [])
          .filter(membro => !membrosJaEscaladosNaData.has(membro.id));
        
        if (membrosDisponivelsFuncao.length === 0) {
          continue;
        }

        // 7. Algoritmo de priorização com distribuição igualitária
        const membrosComPrioridade = membrosDisponivelsFuncao.map(membro => {
          const controle = controleEscalacoes[membro.id];
          const jaFoiEscaladoNessaFuncao = controle.funcoesEscaladas.includes(funcao);
          const vezesEscaladoNessaFuncao = controle.historicoFuncoes[funcao] || 0;
          
          // Calcular score de prioridade (menor = maior prioridade)
          let score = 0;
          
          // 1. NUNCA FOI ESCALADO (prioridade máxima)
          if (membro.ultima_escalacao === null) {
            score += 0;
            
            // BONUS ESPECIAL: Para membros multifuncionais sem histórico, 
            // usar uma lógica determinista para distribuir funções iniciais
            if (Array.isArray(membro.funcoes) && membro.funcoes.length > 1) {
              // Usar o ID do membro + hash da função para distribuição consistente
              const funcaoIndex = membro.funcoes.indexOf(funcao as any);
              if (funcaoIndex !== -1) {
                // Dar leve preferência à primeira função do membro para diversificar
                score += funcaoIndex * 10;
              }
            }
          } else {
            score += 1000;
          }
          
          // 2. MENOS ESCALAÇÕES NOS ÚLTIMOS 90 DIAS
          score += (membro.total_escalacoes_90_dias || 0) * 100;
          
          // 3. MAIS DIAS SEM ESCALAR (inverso para que mais dias = menor score)
          score -= (membro.dias_desde_ultima || 0) * 10;
          
          // 4. DESEMPATE POR ID (cadastro mais antigo)
          score += membro.id;
          
          // 5. BONUS: Distribuição igualitária entre datas
          score += controle.totalEscalacoes * 50;
          
          // 6. MELHORADO: Alternância forçada de funções para membros multifuncionais
        
        // Extrair funções do membro considerando formato PostgreSQL
        let funcoesMembro: string[] = [];
        if (Array.isArray(membro.funcoes)) {
          funcoesMembro = membro.funcoes;
        } else if (typeof membro.funcoes === 'string') {
          if (membro.funcoes.startsWith('{') && membro.funcoes.endsWith('}')) {
            // Formato PostgreSQL: {Vocalista,Tecladista}
            funcoesMembro = membro.funcoes.slice(1, -1).split(',').map(f => f.trim()).filter(f => f !== '');
          } else {
            // String simples
            funcoesMembro = [membro.funcoes];
          }
        }
        
        // Se o membro tem múltiplas funções (é multifuncional)
        if (funcoesMembro.length > 1) {
          // ALTERNÂNCIA INTELIGENTE (funciona mesmo sem histórico anterior)
          
          // 1. Verificar se já foi escalado na mesma função durante esta sessão de geração
          if (controle.ultimaFuncao === funcao) {
            // Penalidade ALTA para repetir função dentro da mesma sessão de geração
            score += 3000;
          }
          
          // 2. Verificar histórico do banco de dados (se existir)
          if (membro.ultima_funcao === funcao) {
            // Penalidade EXTREMA para repetir a mesma função do histórico
            score += 5000;
          }
          
          // 3. Distribuição equilibrada entre as funções do membro
          score += vezesEscaladoNessaFuncao * 50;
          
          // 4. BONUS: Priorizar funções menos utilizadas do membro
          // Calcular quantas vezes cada função foi usada
          const totalVezesOutrasFuncoes = Object.values(controle.historicoFuncoes)
            .filter((_, index) => Object.keys(controle.historicoFuncoes)[index] !== funcao)
            .reduce((sum, count) => sum + count, 0);
          
          // Se nunca usou outras funções, dar bonus para diversificar
          if (totalVezesOutrasFuncoes === 0 && vezesEscaladoNessaFuncao > 0) {
            score -= 200; // Bonus para usar função diferente
          }
          
        } else {
          // Para membros com apenas uma função, usar lógica normal
          score += vezesEscaladoNessaFuncao * 30;
        }
          
          // 7. BONUS: Evitar mesma função consecutiva
          if (controle.ultimaFuncao === funcao) {
            score += 15;
          }
          
          return { membro, score, controle };
        });

        // 8. Ordenar por score (menor score = maior prioridade)
        membrosComPrioridade.sort((a, b) => a.score - b.score);
        
        // 9. Selecionar os membros necessários
        const membrosSelecionados = membrosComPrioridade.slice(0, quantidadeNecessaria);
        escala[funcao] = membrosSelecionados.map(item => item.membro);
        
        // 10. Atualizar controle de escalações e marcar membros como já escalados
        membrosSelecionados.forEach(({ membro, controle }) => {
          // NOVO: Marcar membro como já escalado para esta data
          membrosJaEscaladosNaData.add(membro.id);
          
          controle.totalEscalacoes++;
          controle.ultimaFuncao = funcao;
          controle.datasEscaladas.push(data);
          
          // Registrar ou incrementar o histórico para esta função
          if (!controle.historicoFuncoes[funcao]) {
            controle.historicoFuncoes[funcao] = 0;
          }
          controle.historicoFuncoes[funcao]++;
          
          if (!controle.funcoesEscaladas.includes(funcao)) {
            controle.funcoesEscaladas.push(funcao);
          }
        });
      }

      // Armazenar resultado
      const dataFormatadaBr = this.formatarDataLog(data);
      resultado[dataFormatadaBr] = escala;
    }

    return resultado;
  }

  /**
   * Verifica se já existem escalas nas datas e horários especificados
   */
  private async verificarDatasComEscala(datasComHorario: string[]): Promise<string[]> {
    try {
      const placeholders = datasComHorario.map((_, index) => `$${index + 1}`).join(', ');
      const result = await query(
        `SELECT DISTINCT data_culto 
         FROM historico_escalas 
         WHERE data_culto IN (${placeholders})`,
        datasComHorario
      );
      
      return result.rows.map((row: any) => row.data_culto);
    } catch (error) {
      return [];
    }
  }

  /**
   * Confirma e salva a escala no histórico
   */
  async confirmarEscala(dadosEscala: DadosEscala): Promise<void> {
    try {
      await query('BEGIN');

      for (const [data, escala] of Object.entries(dadosEscala)) {
        // Salvar cada pessoa escalada no histórico
        for (const [funcao, membros] of Object.entries(escala)) {
          for (const membro of membros) {
            await query(
              `INSERT INTO historico_escalas (membro_id, data_culto, funcao, escalado_em) 
               VALUES ($1, $2::timestamp, $3, NOW() AT TIME ZONE 'America/Sao_Paulo')`,
              [membro.id, data, funcao]
            );
          }
        }

        // Registramos a escala através das entradas individuais no historico_escalas
        // Escala registrada com sucesso
      }

      await query('COMMIT');
      // Escala confirmada e salva no histórico
    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }
  }

  /**
   * Busca membros disponíveis para uma data (sem ausência)
   */
  private async buscarMembrosDisponiveis(data: string): Promise<Membro[]> {
    // Query atualizada para trabalhar com múltiplas funções por membro
    // Adicionada última função do membro para alternância entre datas
    const resultado = await query(`
      SELECT DISTINCT m.id,
             m.nome,
             m.sobrenome,
             array_agg(DISTINCT mf.funcao) as funcoes,
             ultima_escala.data_culto as ultima_escalacao,
             ultima_escala.ultima_funcao, -- Nova coluna para alternância
              CASE 
                WHEN ultima_escala.data_culto IS NULL THEN NULL
                ELSE EXTRACT(DAY FROM ($1::timestamp - ultima_escala.data_culto))::integer
              END as dias_desde_ultima,
             COALESCE(escalacoes_recentes.contagem, 0) as total_escalacoes_90_dias
      FROM membros m
      LEFT JOIN membro_funcoes mf ON m.id = mf.membro_id
      LEFT JOIN (
        -- Selecionar a data mais recente e a função dessa escala
        SELECT he.membro_id, 
               MAX(he.data_culto) as data_culto,
               (SELECT funcao FROM historico_escalas 
                WHERE membro_id = he.membro_id 
                ORDER BY data_culto DESC LIMIT 1) as ultima_funcao
        FROM historico_escalas he
        GROUP BY he.membro_id
      ) ultima_escala ON m.id = ultima_escala.membro_id
      LEFT JOIN (
        SELECT membro_id, COUNT(*) as contagem
        FROM historico_escalas 
        WHERE data_culto >= (CURRENT_DATE - INTERVAL '90 days')
        GROUP BY membro_id
      ) escalacoes_recentes ON m.id = escalacoes_recentes.membro_id
      LEFT JOIN (
        -- Verifica se o membro tem ausência nesta data
        SELECT DISTINCT membro_id 
        FROM ausencias 
        WHERE $1::date BETWEEN data_inicio AND data_fim
      ) ausencias_na_data ON m.id = ausencias_na_data.membro_id
      WHERE ausencias_na_data.membro_id IS NULL -- Garante que só pega membros SEM ausências
      GROUP BY m.id, m.nome, m.sobrenome, ultima_escala.data_culto, ultima_escala.ultima_funcao, escalacoes_recentes.contagem
      ORDER BY m.nome
    `, [data]);

    const membros = resultado.rows;
    return membros;
  }

  /**
   * Agrupa membros por função - atualizado para múltiplas funções
   */
  private agruparPorFuncao(membros: Membro[]): { [funcao: string]: Membro[] } {
    return membros.reduce((acc, membro) => {
      // Processar múltiplas funções do membro
      let funcoesMembro: string[] = [];
      
      if (Array.isArray(membro.funcoes)) {
        funcoesMembro = membro.funcoes;
      } else if (typeof membro.funcoes === 'string') {
        // Se veio como string do PostgreSQL (formato {func1,func2})
        const funcoesStr = membro.funcoes as string;
        if (funcoesStr.startsWith('{') && funcoesStr.endsWith('}')) {
          funcoesMembro = funcoesStr.slice(1, -1).split(',').map((f: string) => f.trim()).filter((f: string) => f !== '');
        } else {
          funcoesMembro = [funcoesStr];
        }
      }
      
      // Adicionar o membro a cada uma de suas funções
      funcoesMembro.forEach(funcao => {
        if (!acc[funcao]) {
          acc[funcao] = [];
        }
        acc[funcao].push(membro);
      });
      
      return acc;
    }, {} as { [funcao: string]: Membro[] });
  }

  /**
   * Prioriza membros baseado no algoritmo de igualdade
   * Algoritmo aprimorado para garantir distribuição mais justa
   */
  private async priorizarMembros(membros: Membro[], data: string): Promise<Membro[]> {
    // Priorizando membros
    
    return membros.sort((a, b) => {
      // 1. Prioridade: Nunca escalado (prioriza quem nunca foi escalado)
      if (a.ultima_escalacao === null && b.ultima_escalacao !== null) return -1;
      if (a.ultima_escalacao !== null && b.ultima_escalacao === null) return 1;
      if (a.ultima_escalacao === null && b.ultima_escalacao === null) {
        // Se ambos nunca foram escalados, distribui aleatoriamente
        // Isso cria uma ordenação aleatória entre 0.5 e -0.5
        return Math.random() - 0.5;
      }

      // 2. Prioridade principal: Menos escalações nos últimos 90 dias (distribuição igualitária)
      const contagemA = a.total_escalacoes_90_dias || 0;
      const contagemB = b.total_escalacoes_90_dias || 0;
      if (contagemA !== contagemB) return contagemA - contagemB;
      
      // 3. Prioridade secundária: Mais dias sem escalar
      const diasA = a.dias_desde_ultima || 0;
      const diasB = b.dias_desde_ultima || 0;
      if (diasA !== diasB) return diasB - diasA;

      // 4. Desempate: ID menor (cadastro mais antigo)
      return a.id - b.id;
    });
  }

  // Removida implementação duplicada de buscarTodasEstatisticasMembros

  /**
   * Define quantas pessoas são necessárias por função
   * @param funcao Função/instrumento
   * @param configuracao Configuração obrigatória do frontend
   */
  private obterQuantidadeNecessaria(funcao: Funcao, configuracao: Record<string, number>): number {
    // Usa a configuração fornecida pelo frontend
    if (configuracao[funcao] !== undefined) {
      return configuracao[funcao];
    }
    
    // Caso a configuração não tenha esta função especificada, retorna 0
    return 0;
  }

  /**
   * Busca estatísticas de um membro
   */
  async buscarEstatisticasMembro(membroId: number): Promise<Membro | null> {
    const resultado = await query(`
      SELECT m.*, 
             ultima_escala.data_culto as ultima_escalacao,
             CASE 
               WHEN ultima_escala.data_culto IS NULL THEN NULL
               ELSE (CURRENT_DATE - ultima_escala.data_culto)::integer
             END as dias_desde_ultima,
             COALESCE(escalacoes_recentes.contagem, 0) as total_escalacoes_90_dias,
             COALESCE(total_escalacoes.contagem, 0) as total_escalacoes_historico
      FROM membros m
      LEFT JOIN (
        SELECT membro_id, MAX(data_culto) as data_culto
        FROM historico_escalas 
        WHERE membro_id = $1
        GROUP BY membro_id
      ) ultima_escala ON m.id = ultima_escala.membro_id
      LEFT JOIN (
        SELECT membro_id, COUNT(*) as contagem
        FROM historico_escalas 
        WHERE membro_id = $1 AND data_culto >= (CURRENT_DATE - INTERVAL '90 days')
        GROUP BY membro_id
      ) escalacoes_recentes ON m.id = escalacoes_recentes.membro_id
      LEFT JOIN (
        SELECT membro_id, COUNT(*) as contagem
        FROM historico_escalas 
        WHERE membro_id = $1
        GROUP BY membro_id
      ) total_escalacoes ON m.id = total_escalacoes.membro_id
      WHERE m.id = $1
    `, [membroId]);

    return resultado.rows[0] || null;
  }

  /**
   * Busca estatísticas de todos os membros
   */
  async buscarTodasEstatisticasMembros(): Promise<Membro[]> {
    const resultado = await query(`
      SELECT m.id,
             m.nome,
             m.sobrenome,
             array_agg(DISTINCT mf.funcao) as funcoes,
             ultima_escala.data_culto as ultima_escalacao,
             CASE 
               WHEN ultima_escala.data_culto IS NULL THEN NULL
               ELSE (CURRENT_DATE - ultima_escala.data_culto)::integer
             END as dias_desde_ultima,
             COALESCE(escalacoes_recentes.contagem, 0) as total_escalacoes_90_dias,
             COALESCE(total_escalacoes.contagem, 0) as total_escalacoes_historico
      FROM membros m
      LEFT JOIN membro_funcoes mf ON m.id = mf.membro_id
      LEFT JOIN (
        SELECT membro_id, MAX(data_culto) as data_culto
        FROM historico_escalas 
        GROUP BY membro_id
      ) ultima_escala ON m.id = ultima_escala.membro_id
      LEFT JOIN (
        SELECT membro_id, COUNT(*) as contagem
        FROM historico_escalas 
        WHERE data_culto >= (CURRENT_DATE - INTERVAL '90 days')
        GROUP BY membro_id
      ) escalacoes_recentes ON m.id = escalacoes_recentes.membro_id
      LEFT JOIN (
        SELECT membro_id, COUNT(*) as contagem
        FROM historico_escalas 
        GROUP BY membro_id
      ) total_escalacoes ON m.id = total_escalacoes.membro_id
      GROUP BY m.id, m.nome, m.sobrenome, ultima_escala.data_culto, escalacoes_recentes.contagem, total_escalacoes.contagem
      ORDER BY m.nome
    `);

    return resultado.rows;
  }
}

// Manter alias para compatibilidade
export const ScheduleGeneratorService = ServicoGeradorEscala;

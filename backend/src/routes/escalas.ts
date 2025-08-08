import { Router } from 'express';
import { query } from '../database/connection';
import { ServicoGeradorEscala } from '../services/geradorEscalas';

const router = Router();
const servicoGeradorEscalas = new ServicoGeradorEscala();

/**
 * Formatar data para logs no formato brasileiro
 */
const formatarDataLog = (data: string): string => {
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
};

/**
 * @swagger
 * /escalas/historico:
 *   get:
 *     summary: Lista o histórico de escalas
 *     tags: [Escalas]
 *     description: Retorna um histórico de todas as escalas, ordenado por data de culto e com paginação
 *     parameters:
 *       - in: query
 *         name: limite
 *         description: Número máximo de registros por página
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: pagina
 *         description: Número da página a ser consultada
 *         schema:
 *           type: integer
 *           default: 1
 *     responses:
 *       200:
 *         description: Lista de escalas retornada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/EscalaHistorico'
 *       500:
 *         description: Erro interno do servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/historico', async (req, res) => {
  try {
    const { limite = 50, pagina = 1 } = req.query;
    const offset = (Number(pagina) - 1) * Number(limite);

    const result = await query(`
      SELECT h.id,
             h.membro_id,
             m.nome, 
             m.sobrenome, 
             ARRAY_AGG(DISTINCT mf.funcao ORDER BY mf.funcao) as funcoes_membro,
             to_char(h.data_culto, 'DD/MM/YYYY HH24:MI:SS') as data_culto,
             h.funcao,
             to_char(h.escalado_em, 'DD/MM/YYYY HH24:MI:SS') as escalado_em
      FROM historico_escalas h
      JOIN membros m ON h.membro_id = m.id
      LEFT JOIN membro_funcoes mf ON m.id = mf.membro_id
      GROUP BY h.id, m.nome, m.sobrenome, h.data_culto, h.funcao, h.escalado_em
      ORDER BY h.data_culto DESC, h.funcao
      LIMIT $1 OFFSET $2
    `, [limite, offset]);
    
    const escalas = result.rows.map(row => ({
      id: row.id,
      membro_id: row.membro_id,
      nome_membro: `${row.nome} ${row.sobrenome}`,
      funcoes_membro: row.funcoes_membro || [],
      data_culto: row.data_culto,
      funcao: row.funcao,
      escalado_em: row.escalado_em,
    }));
    
    res.json(escalas);
  } catch (error) {
    console.error('Erro ao buscar histórico de escalas:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * @swagger
 * /escalas/data/{data}:
 *   get:
 *     summary: Busca escalas por data
 *     tags: [Escalas]
 *     description: Retorna todas as escalas de uma data específica
 *     parameters:
 *       - in: path
 *         name: data
 *         required: true
 *         description: Data do culto no formato YYYY-MM-DD
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Escalas retornadas com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/EscalaHistorico'
 *       500:
 *         description: Erro interno do servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/data/:data', async (req, res) => {
  try {
    const { data } = req.params;
    
    // Converter data para formato ISO se estiver em formato brasileiro
    let dataFormatada = data;
    if (data.includes('/')) {
      // Formato DD/MM/YYYY -> YYYY-MM-DD
      const [dia, mes, ano] = data.split('/');
      dataFormatada = `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
    }
    
    const result = await query(`
      SELECT h.id,
             h.membro_id,
             m.nome, 
             m.sobrenome, 
             ARRAY_AGG(DISTINCT mf.funcao ORDER BY mf.funcao) as funcoes_membro,
             to_char(h.data_culto, 'DD/MM/YYYY HH24:MI:SS') as data_culto,
             h.funcao,
             to_char(h.escalado_em, 'DD/MM/YYYY HH24:MI:SS') as escalado_em
      FROM historico_escalas h
      JOIN membros m ON h.membro_id = m.id
      LEFT JOIN membro_funcoes mf ON m.id = mf.membro_id
      WHERE DATE(h.data_culto) = DATE($1)
      GROUP BY h.id, m.nome, m.sobrenome, h.data_culto, h.funcao, h.escalado_em
      ORDER BY h.funcao
    `, [dataFormatada]);
    
    const escalas = result.rows.map(row => ({
      id: row.id,
      membro_id: row.membro_id,
      nome_membro: `${row.nome} ${row.sobrenome}`,
      funcoes_membro: row.funcoes_membro || [],
      data_culto: row.data_culto,
      funcao: row.funcao,
      escalado_em: row.escalado_em,
    }));
    
    res.json(escalas);
  } catch (error) {
    console.error('Erro ao buscar escalas por data:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * @swagger
 * /escalas/membro/{id}:
 *   get:
 *     summary: Busca escalas de um membro específico
 *     tags: [Escalas]
 *     description: Retorna todas as escalas de um membro pelo seu ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID do membro
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limite
 *         description: Número máximo de registros a retornar
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Escalas do membro retornadas com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/EscalaHistorico'
 *       500:
 *         description: Erro interno do servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/membro/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { limite = 20 } = req.query;
    
    const result = await query(`
      SELECT h.id,
             h.membro_id,
             m.nome, 
             m.sobrenome, 
             ARRAY_AGG(DISTINCT mf.funcao ORDER BY mf.funcao) as funcoes_membro,
             to_char(h.data_culto, 'DD/MM/YYYY HH24:MI:SS') as data_culto,
             h.funcao,
             to_char(h.escalado_em, 'DD/MM/YYYY HH24:MI:SS') as escalado_em
      FROM historico_escalas h
      JOIN membros m ON h.membro_id = m.id
      LEFT JOIN membro_funcoes mf ON m.id = mf.membro_id
      WHERE h.membro_id = $1
      GROUP BY h.id, m.nome, m.sobrenome, h.data_culto, h.funcao, h.escalado_em
      ORDER BY h.data_culto DESC
      LIMIT $2
    `, [id, limite]);
    
    const escalas = result.rows.map(row => ({
      id: row.id,
      membro_id: row.membro_id,
      nome_membro: `${row.nome} ${row.sobrenome}`,
      funcoes_membro: row.funcoes_membro || [],
      data_culto: row.data_culto,
      funcao: row.funcao,
      escalado_em: row.escalado_em,
    }));
    
    res.json(escalas);
  } catch (error) {
    console.error('Erro ao buscar escalas do membro:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * @swagger
 * /escalas/gerar:
 *   post:
 *     summary: Gera uma nova escala
 *     tags: [Escalas]
 *     description: Gera uma escala para uma ou mais datas especificadas
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/EscalaHistorico'
 *     responses:
 *       200:
 *         description: Escala gerada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EscalaHistorico'
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Mensagem de sucesso
 *                 escalas:
 *                   $ref: '#/components/schemas/DadosEscala'
 *                 total_datas:
 *                   type: integer
 *                   description: Total de datas processadas
 *       400:
 *         description: Dados inválidos
 *       500:
 *         description: Erro interno do servidor
 */
router.post('/gerar', async (req, res) => {
  try {
    const { datas, configuracao } = req.body;

    if (!datas || !Array.isArray(datas) || datas.length === 0) {
      return res.status(400).json({ 
        error: 'Datas são obrigatórias e devem ser um array' 
      });
    }
    
    if (!configuracao || typeof configuracao !== 'object') {
      return res.status(400).json({
        error: 'Configuração de membros por função é obrigatória'
      });
    }

    // Gerando escala para múltiplas datas
    
    // Validar formato das datas (agora aceita timestamp)
    for (const data of datas) {
      // Aceitar tanto formato de data (YYYY-MM-DD) quanto timestamp (ISO 8601)
      const isValidDate = data.match(/^\d{4}-\d{2}-\d{2}$/);
      const isValidTimestamp = data.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(\.\d{3})?Z?$/);
      
      if (!isValidDate && !isValidTimestamp) {
        return res.status(400).json({ 
          error: `Data inválida: ${data}. Use o formato YYYY-MM-DD ou YYYY-MM-DDTHH:mm:ss` 
        });
      }
    }

    const escalasGeradas = await servicoGeradorEscalas.gerarEscalas(datas, configuracao);
    
    // Emitir evento via socket.io
    if (req.app.get('io')) {
      req.app.get('io').emit('schedule-generated', escalasGeradas);
    }

    res.json({
      message: `Escalas geradas com sucesso para ${datas.length} data(s)`,
      escalas: escalasGeradas,
      total_datas: datas.length
    });
  } catch (error) {
    console.error('Erro ao gerar escala:', error);
    
    // Se for erro de validação (escalas duplicadas), retornar 400
    if (error instanceof Error && error.message.includes('Já exist')) {
      return res.status(400).json({ 
        error: error.message
      });
    }
    
    // Outros erros retornam 500
    return res.status(500).json({ 
      error: 'Erro ao gerar escala',
      detalhes: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

/**
 * @swagger
 * /escalas/confirmar:
 *   post:
 *     summary: Confirma e salva uma escala gerada
 *     tags: [Escalas]
 *     description: Confirma e salva uma escala gerada previamente no banco de dados
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/EscalaHistorico'
 *             required:
 *               - escala
 *             properties:
 *               escala:
 *                   $ref: '#/components/schemas/DadosEscala'
 *     responses:
 *       200:
 *         description: Escala confirmada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EscalaHistorico'
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Mensagem de sucesso
 *                 escalas_salvas:
 *                   type: integer
 *                   description: Total de escalas salvas
 *                 escalas:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/EscalaHistorico'
 *                   description: Lista das escalas inseridas
 *       400:
 *         description: Dados inválidos ou incompletos
 *       409:
 *         description: Conflito - já existe uma escala para esta data
 *       500:
 *         description: Erro interno do servidor
 */
router.post('/confirmar', async (req, res) => {
  try {
    const { escala } = req.body;

    if (!escala || typeof escala !== 'object') {
      return res.status(400).json({ 
        error: 'Dados da escala são obrigatórios' 
      });
    }

    // A escala vem no formato: { "2025-07-25": { "Vocalista": [membro1], "Guitarrista": [membro2] } }
    const escalasInseridas = [];
    let totalInseridos = 0;

    // Processar cada data na escala
    for (const [dataCulto, funcoesMembros] of Object.entries(escala)) {
      // Converter data brasileira para formato ISO se necessário
      let dataCultoISO = dataCulto;
      if (dataCulto.includes('/')) {
        // Formato DD/MM/YYYY HH:mm:ss -> converter para ISO
        const [datePart, timePart] = dataCulto.split(' ');
        const [dia, mes, ano] = datePart.split('/');
        const timePartFormatted = timePart || '00:00:00';
        dataCultoISO = `${ano}-${mes}-${dia}T${timePartFormatted}`;
      }
      
      // Verificar se já existe escala para esta data (remover registros existentes)
      await query('DELETE FROM historico_escalas WHERE data_culto = $1', [dataCultoISO]);

      // Processar cada função e seus membros
      for (const [funcao, membros] of Object.entries(funcoesMembros as { [funcao: string]: any[] })) {
        if (Array.isArray(membros) && membros.length > 0) {
          for (const membro of membros) {
            const result = await query(
              'INSERT INTO historico_escalas (membro_id, data_culto, funcao, escalado_em) VALUES ($1, $2, $3, NOW() AT TIME ZONE \'America/Sao_Paulo\') RETURNING *',
              [membro.id, dataCultoISO, funcao]
            );
            escalasInseridas.push(result.rows[0]);
            totalInseridos++;
          }
        }
      }
    }

    // Emitir evento via socket.io
    if (req.app.get('io')) {
      req.app.get('io').emit('schedule-confirmed', {
        escalas_salvas: totalInseridos,
        escalas: escalasInseridas
      });
    }

    res.json({
      message: 'Escala confirmada e salva com sucesso',
      escalas_salvas: totalInseridos,
      escalas: escalasInseridas
    });
  } catch (error) {
    console.error('Erro ao confirmar escala:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * @swagger
 * /escalas/data/{data}:
 *   delete:
 *     summary: Remove escalas de uma data e horário específico
 *     tags: [Escalas]
 *     description: Remove todas as escalas de um culto específico (data e horário)
 *     parameters:
 *       - in: path
 *         name: data
 *         required: true
 *         description: Data e horário do culto (YYYY-MM-DD HH:mm:ss ou DD/MM/YYYY HH:mm:ss)
 *         schema:
 *           type: string
 *           example: "07/08/2025 19:00:00"
 *     responses:
 *       200:
 *         description: Escalas removidas com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EscalaHistorico'
 *               properties:
 *                 message:
 *                   type: string
 *                 data_culto:
 *                   type: string
 *                   format: date
 *                 escalas_removidas:
 *                   type: integer
 *       404:
 *         description: Não existem escalas para esta data
 *       500:
 *         description: Erro interno do servidor
 */
router.delete('/data/:data', async (req, res) => {
  try {
    const { data } = req.params;
    
    // Converter formato DD/MM/YYYY HH:mm:ss para YYYY-MM-DD HH:mm:ss
    const convertDataFormat = (dateStr: string): string => {
      if (dateStr.includes('/')) {
        const [datePart, timePart] = dateStr.split(' ');
        const [dia, mes, ano] = datePart.split('/');
        return `${ano}-${mes}-${dia} ${timePart}`;
      }
      return dateStr; // Se já estiver no formato correto
    };
    
    const dataFormatada = convertDataFormat(data);
    
    // Verificar se existem escalas para esta data e horário
    const existingSchedules = await query(
      'SELECT COUNT(*) as total FROM historico_escalas WHERE data_culto = $1::timestamptz',
      [dataFormatada]
    );

    if (existingSchedules.rows[0].total === '0') {
      return res.status(404).json({ 
        error: 'Não existem escalas para esta data' 
      });
    }

    // Remover todas as escalas da data e horário específico
    const result = await query(
      'DELETE FROM historico_escalas WHERE data_culto = $1::timestamptz RETURNING *',
      [dataFormatada]
    );

    res.json({
      message: 'Escalas removidas com sucesso',
      data_culto: data,
      escalas_removidas: result.rows.length
    });
  } catch (error) {
    console.error('Erro ao remover escalas:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * @swagger
 * /escalas/estatisticas:
 *   get:
 *     summary: Retorna estatísticas das escalas
 *     tags: [Escalas]
 *     description: Retorna estatísticas gerais sobre as escalas, incluindo total por função e informações sobre membros ativos
 *     responses:
 *       200:
 *         description: Estatísticas retornadas com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EscalaHistorico'
 *               properties:
 *                 geral:
 *                   $ref: '#/components/schemas/EscalaHistorico'
 *                   properties:
 *                     total_escalas:
 *                       type: integer
 *                     total_cultos:
 *                       type: integer
 *                     membros_escalados:
 *                       type: integer
 *                     primeira_escala:
 *                       type: string
 *                       format: date
 *                     ultima_escala:
 *                       type: string
 *                       format: date
 *                 por_funcao:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/EscalaHistorico'
 *                     properties:
 *                       funcao:
 *                         type: string
 *                       total_escalacoes:
 *                         type: integer
 *                       membros_unicos:
 *                         type: integer
 *                 membros_ativos:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/EscalaHistorico'
 *       500:
 *         description: Erro interno do servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
/**
 * @swagger
 * /escalas/salvas:
 *   get:
 *     summary: Lista as escalas salvas
 *     tags: [Escalas]
 *     description: Retorna todas as escalas salvas, ordenadas por data de culto
 *     responses:
 *       200:
 *         description: Lista de escalas retornada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/EscalaBasica'
 *       500:
 *         description: Erro interno do servidor
 */
router.get('/salvas', async (req, res) => {
  try {
    const result = await query(`
      SELECT h.id,
             h.membro_id,
             to_char(h.data_culto, 'DD/MM/YYYY HH24:MI:SS') as data_culto,
             h.funcao,
             to_char(h.escalado_em, 'DD/MM/YYYY HH24:MI:SS') as escalado_em
      FROM historico_escalas h
      ORDER BY h.data_culto DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar escalas salvas:', error);
    res.status(500).json({ erro: 'Erro ao buscar escalas salvas' });
  }
});

/**
 * @swagger
 * /escalas/estatisticas:
 *   get:
 *     summary: Retorna estatísticas de todas as escalas
 *     tags: [Escalas]
 *     description: Fornece estatísticas consolidadas de todas as escalas
 *     responses:
 *       200:
 *         description: Estatísticas retornadas com sucesso
 *       500:
 *         description: Erro interno do servidor
 */
router.get('/estatisticas', async (req, res) => {
  try {
    const estatisticas = await query(`
      SELECT 
        COUNT(*) as total_escalas,
        COUNT(DISTINCT data_culto) as total_cultos,
        COUNT(DISTINCT membro_id) as membros_escalados,
        MIN(data_culto) as primeira_escala,
        MAX(data_culto) as ultima_escala
      FROM historico_escalas
    `);

    const estatisticasPorFuncao = await query(`
      SELECT 
        funcao,
        COUNT(*) as total_escalacoes,
        COUNT(DISTINCT membro_id) as membros_unicos
      FROM historico_escalas
      GROUP BY funcao
      ORDER BY funcao
    `);

    const membrosAtivos = await query(`
      SELECT 
        m.id,
        m.nome,
        m.sobrenome,
        ARRAY_AGG(DISTINCT mf.funcao ORDER BY mf.funcao) as funcoes,
        COUNT(h.id) as total_escalacoes,
        MAX(h.data_culto) as ultima_escalacao
      FROM membros m
      LEFT JOIN membro_funcoes mf ON m.id = mf.membro_id
      LEFT JOIN historico_escalas h ON m.id = h.membro_id
      GROUP BY m.id, m.nome, m.sobrenome
      ORDER BY total_escalacoes DESC, m.nome
    `);

    res.json({
      geral: estatisticas.rows[0],
      por_funcao: estatisticasPorFuncao.rows,
      membros_ativos: membrosAtivos.rows
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * @swagger
 * /api/escalas/editar:
 *   put:
 *     summary: Edita uma escala existente
 *     tags: [Escalas]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/EscalaHistorico'
 *             required: [data_original, nova_data_culto, membros]
 *             properties:
 *               data_original:
 *                 type: string
 *                 format: date-time
 *                 description: Data e horário original da escala
 *               nova_data_culto:
 *                 type: string
 *                 format: date-time
 *                 description: Nova data e horário da escala
 *               membros:
 *                 $ref: '#/components/schemas/EscalaHistorico'
 *                 description: Membros organizados por função
 *     responses:
 *       200:
 *         description: Escala editada com sucesso
 *       400:
 *         description: Dados inválidos
 *       404:
 *         description: Escala não encontrada
 *       500:
 *         description: Erro interno do servidor
 */
router.put('/editar', async (req, res) => {
  try {
    const { data_original, nova_data_culto, membros } = req.body;
    


    if (!data_original || !nova_data_culto || !membros) {
      return res.status(400).json({
        error: 'Data original, nova data e membros são obrigatórios'
      });
    }

    // Verificar se existe escala na data original
    // Se data_original estiver em formato brasileiro, converter
    let dataOriginalFormatada = data_original;
    if (data_original.includes('/')) {
      // Formato DD/MM/YYYY HH:mm:ss -> converter para ISO
      const [datePart, timePart] = data_original.split(' ');
      const [dia, mes, ano] = datePart.split('/');
      const timePartFormatted = timePart || '00:00:00';
      dataOriginalFormatada = `${ano}-${mes}-${dia}T${timePartFormatted}`;
    }
    
    const escalaExistente = await query(
      'SELECT COUNT(*) as total FROM historico_escalas WHERE data_culto = $1::timestamp',
      [dataOriginalFormatada]
    );

    if (escalaExistente.rows[0].total === '0') {
      return res.status(404).json({
        error: 'Escala não encontrada na data especificada'
      });
    }

    // Normalizar as datas para comparação (converter ambas para timestamp)
    const dataOriginalNormalizada = new Date(dataOriginalFormatada).getTime();
    const novaDataNormalizada = new Date(nova_data_culto).getTime();
    
    // Se mudou a data, verificar se já existe escala na nova data
    if (dataOriginalNormalizada !== novaDataNormalizada) {

      
      const novaEscalaExistente = await query(
        'SELECT COUNT(*) as total FROM historico_escalas WHERE data_culto = $1::timestamp',
        [nova_data_culto]
      );

      if (novaEscalaExistente.rows[0].total > '0') {
        const dataObj = new Date(nova_data_culto);
        const dataFormatada = dataObj.toLocaleDateString('pt-BR');
        const horarioFormatado = dataObj.toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit'
        });
        
        return res.status(400).json({
          error: `Já existe escala dia ${dataFormatada} no horário ${horarioFormatado}`
        });
      }
    }

    await query('BEGIN');

    // Deletar escala antiga
    await query('DELETE FROM historico_escalas WHERE data_culto = $1::timestamp', [dataOriginalFormatada]);

    // Inserir nova escala
    for (const [funcao, listaMembros] of Object.entries(membros)) {
      if (Array.isArray(listaMembros)) {
        for (const membro of listaMembros) {
          await query(
            'INSERT INTO historico_escalas (membro_id, data_culto, funcao, escalado_em) VALUES ($1, $2::timestamp, $3, NOW() AT TIME ZONE \'America/Sao_Paulo\')',
            [membro.id, nova_data_culto, funcao]
          );
        }
      }
    }

    await query('COMMIT');
    // Emitir evento via socket.io
    if (req.app.get('io')) {
      req.app.get('io').emit('schedule-updated', {
        data_original,
        nova_data_culto,
        membros
      });
    }
    res.json({
      message: 'Escala editada com sucesso',
      data_original,
      nova_data_culto
    });

  } catch (error: any) {
    await query('ROLLBACK').catch(() => {});
    console.error('Erro ao editar escala:', error);
    
    if (error.message && error.message.includes('Já existe escala')) {
      return res.status(400).json({ error: error.message });
    }
    
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;

import { Router } from 'express';
import { query, ensureConnection } from '../database/connection';
import { Membro, CreateMemberRequest } from '../types';

const router = Router();

/**
 * @swagger
 * /membros:
 *   get:
 *     summary: Lista todos os membros
 *     tags: [Membros]
 *     description: Retorna uma lista com todos os membros cadastrados com suas respectivas funções, ordenados por nome
 *     responses:
 *       200:
 *         description: Lista de membros retornada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/MembroBasico'
 *             example:
 *               - id: 1
 *                 nome: "Robson"
 *                 sobrenome: "Arcanjo"
 *                 funcoes: ["Vocalista"]
 *               - id: 2
 *                 nome: "Gabriel"
 *                 sobrenome: "Santos"
 *                 funcoes: ["Vocalista", "Violão"]
 *       500:
 *         description: Erro interno do servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', async (req, res) => {
  try {
    // Buscar membros com suas funções
    const result = await query(`
      SELECT 
        m.id,
        m.nome,
        m.sobrenome,
        ARRAY_AGG(mf.funcao ORDER BY mf.funcao) as funcoes
      FROM membros m
      LEFT JOIN membro_funcoes mf ON m.id = mf.membro_id
      GROUP BY m.id, m.nome, m.sobrenome
      ORDER BY m.nome, m.sobrenome
    `);
    return res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar membros:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * @swagger
 * /membros/estatisticas:
 *   get:
 *     summary: Lista membros com estatísticas
 *     tags: [Membros]
 *     description: Retorna uma lista com todos os membros incluindo estatísticas calculadas (dias desde última escalação, total de escalações, ausências nos últimos 90 dias, etc.)
 *     responses:
 *       200:
 *         description: Lista de membros com estatísticas retornada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Membro'
 *             example:
 *               - id: 1
 *                 nome: "Robson"
 *                 sobrenome: "Arcanjo"
 *                 funcoes: ["Vocalista"]
 *                 total_escalacoes_90_dias: 3
 *                 total_ausencias_90_dias: 1
 *                 ultima_escalacao: "25/07/2025 19:00:00"
 *                 proxima_escalacao: "10/08/2025 19:00:00"
 *               - id: 2
 *                 nome: "Gabriel"
 *                 sobrenome: "Santos"
 *                 funcoes: ["Vocalista", "Violão"]
 *                 total_escalacoes_90_dias: 5
 *                 total_ausencias_90_dias: 0
 *                 ultima_escalacao: "28/07/2025 19:00:00"
 *                 proxima_escalacao: null
 *       500:
 *         description: Erro interno do servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/estatisticas', async (req, res) => {
  try {
    // Garantir conexão ao banco antes da primeira query
    await ensureConnection();
    
    // Primeiro buscar todos os membros com suas funções
    const membersResult = await query(`
      SELECT 
        m.id,
        m.nome,
        m.sobrenome,
        ARRAY_AGG(mf.funcao ORDER BY mf.funcao) as funcoes
      FROM membros m
      LEFT JOIN membro_funcoes mf ON m.id = mf.membro_id
      GROUP BY m.id, m.nome, m.sobrenome
      ORDER BY m.nome, m.sobrenome
    `);
    

    
    // Tentar buscar estatísticas do histórico (pode falhar se tabela não existir)
    let statisticsData: Record<number, any> = {};
    try {
      const statsResult = await query(`
        SELECT 
          m.id as membro_id,
          COALESCE(h90.total_90_dias, 0) as total_escalacoes_90_dias,
          COALESCE(a90.total_ausencias_90_dias, 0) as total_ausencias_90_dias,
          h_passado.ultima_data_passado as ultima_escala_data,
          h_futuro.proxima_data_futuro as proxima_escala_data
          
        FROM membros m
        
        -- Última escalação (passado apenas)
        LEFT JOIN (
          SELECT 
            membro_id,
            to_char(MAX(data_culto), 'DD/MM/YYYY HH24:MI:SS') as ultima_data_passado
          FROM historico_escalas
          WHERE data_culto < CURRENT_DATE
          GROUP BY membro_id
        ) h_passado ON m.id = h_passado.membro_id
        
        -- Próxima escalação (futuro + hoje)
        LEFT JOIN (
          SELECT 
            membro_id,
            to_char(MIN(data_culto), 'DD/MM/YYYY HH24:MI:SS') as proxima_data_futuro
          FROM historico_escalas
          WHERE data_culto >= CURRENT_DATE
          GROUP BY membro_id
        ) h_futuro ON m.id = h_futuro.membro_id
        
        -- Estatísticas dos últimos 90 dias
        LEFT JOIN (
          SELECT 
            membro_id,
            COUNT(*) as total_90_dias
          FROM historico_escalas
          WHERE data_culto >= CURRENT_DATE - INTERVAL '90 days'
          GROUP BY membro_id
        ) h90 ON m.id = h90.membro_id
        
        -- Ausências dos últimos 90 dias
        LEFT JOIN (
          SELECT 
            membro_id,
            COUNT(*) as total_ausencias_90_dias
          FROM ausencias
          WHERE data_inicio >= CURRENT_DATE - INTERVAL '90 days'
             OR data_fim >= CURRENT_DATE - INTERVAL '90 days'
          GROUP BY membro_id
        ) a90 ON m.id = a90.membro_id
        
        ORDER BY m.nome
      `);
      
      // Converter para objeto indexado por membro_id
      for (const row of statsResult.rows) {
        statisticsData[row.membro_id] = {
          total_escalacoes_90_dias: row.total_escalacoes_90_dias,
          total_ausencias_90_dias: row.total_ausencias_90_dias,
          ultima_escala_data: row.ultima_escala_data,
          proxima_escala_data: row.proxima_escala_data
        };
      }
    } catch (error) {
      console.log('❌ ERRO: Query de estatísticas falhou!');
      console.log('Erro:', error instanceof Error ? error.message : String(error));
    }
    
    // Combinar dados dos membros com estatísticas
    const result = {
      rows: membersResult.rows.map(member => {
        const stats = statisticsData[member.id];
        return {
          ...member,
          total_escalacoes_90_dias: stats?.total_escalacoes_90_dias ?? 0,
          total_ausencias_90_dias: stats?.total_ausencias_90_dias ?? 0,
          ultima_escalacao: stats?.ultima_escala_data ?? null,
          proxima_escalacao: stats?.proxima_escala_data ?? null
        };
      })
    };
    
    return res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ROTA MOVIDA ABAIXO DAS ROTAS ESPECÍFICAS

// Buscar estatísticas de um membro específico
router.get('/:id/stats', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Buscar membro com estatísticas básicas
    const result = await query(`
      SELECT 
        m.*,
        0 as vezes_escalado,
        null as ultima_escala,
        'Nunca escalado' as status_escalacao
      FROM membros m
      WHERE m.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Membro não encontrado' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao buscar membro:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * @swagger
 * /membros:
 *   post:
 *     summary: Cadastra um novo membro
 *     tags: [Membros]
 *     description: Cadastra um novo membro no ministério
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MembroBasico'
 *             required:
 *               - nome
 *               - sobrenome
 *               - funcao
 *             properties:
 *               nome:
 *                 type: string
 *                 description: Nome do membro
 *               sobrenome:
 *                 type: string
 *                 description: Sobrenome do membro
 *               funcao:
 *                 type: string
 *                 description: Função do membro no ministério
 *     responses:
 *       201:
 *         description: Membro cadastrado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 member:
 *                   $ref: '#/components/schemas/Membro'
 *       400:
 *         description: Dados inválidos ou incompletos
 *       409:
 *         description: Já existe um membro com este nome e função
 *       500:
 *         description: Erro interno do servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/', async (req, res) => {
  try {
    const { nome, sobrenome, funcoes }: CreateMemberRequest = req.body;

    // Validar campos obrigatórios
    if (!nome || !sobrenome || !funcoes || !Array.isArray(funcoes) || funcoes.length === 0) {
      return res.status(400).json({ error: 'Nome, sobrenome e pelo menos uma função são obrigatórios' });
    }

    // Verificar se já existe membro com mesmo nome
    const existingMember = await query(
      'SELECT id FROM membros WHERE nome = $1 AND sobrenome = $2',
      [nome, sobrenome]
    );

    if (existingMember.rows.length > 0) {
      return res.status(409).json({ 
        error: 'Já existe um membro com este nome' 
      });
    }

    // Inserir novo membro
    const memberResult = await query(
      'INSERT INTO membros (nome, sobrenome) VALUES ($1, $2) RETURNING *',
      [nome, sobrenome]
    );

    const novoMembro = memberResult.rows[0];
    const membroId = novoMembro.id;

    // Inserir funções do membro
    for (const funcao of funcoes) {
      await query(
        'INSERT INTO membro_funcoes (membro_id, funcao) VALUES ($1, $2)',
        [membroId, funcao]
      );
    }

    // Buscar o membro completo com suas funções
    const completeResult = await query(`
      SELECT 
        m.id,
        m.nome,
        m.sobrenome,
        ARRAY_AGG(mf.funcao ORDER BY mf.funcao) as funcoes
      FROM membros m
      LEFT JOIN membro_funcoes mf ON m.id = mf.membro_id
      WHERE m.id = $1
      GROUP BY m.id, m.nome, m.sobrenome
    `, [membroId]);

    const membroCompleto = completeResult.rows[0];

    // Emitir evento via socket.io
    if (req.app.get('io')) {
      req.app.get('io').emit('member-registered', membroCompleto);
    }

    return res.status(201).json({
      message: 'Membro cadastrado com sucesso',
      member: membroCompleto
    });
  } catch (error) {
    console.error('Erro ao criar membro:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * @swagger
 * /membros/{id}:
 *   put:
 *     summary: Atualiza um membro
 *     tags: [Membros]
 *     description: Atualiza os dados de um membro existente
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID do membro a ser atualizado
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MembroBasico'
 *             required:
 *               - nome
 *               - sobrenome
 *               - funcao
 *             properties:
 *               nome:
 *                 type: string
 *                 description: Nome do membro
 *               sobrenome:
 *                 type: string
 *                 description: Sobrenome do membro
 *               funcao:
 *                 type: string
 *                 description: Função do membro no ministério
 *     responses:
 *       200:
 *         description: Membro atualizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 member:
 *                   $ref: '#/components/schemas/Membro'
 *       404:
 *         description: Membro não encontrado
 *       400:
 *         description: Dados inválidos
 *       500:
 *         description: Erro interno do servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, sobrenome, funcoes } = req.body;

    // Verificar se o membro existe
    const existingMember = await query('SELECT * FROM membros WHERE id = $1', [id]);
    
    if (existingMember.rows.length === 0) {
      return res.status(404).json({ error: 'Membro não encontrado' });
    }

    // Validar dados
    if (!nome || !sobrenome || !funcoes || !Array.isArray(funcoes) || funcoes.length === 0) {
      return res.status(400).json({ error: 'Nome, sobrenome e pelo menos uma função são obrigatórios' });
    }

    // Atualizar dados básicos do membro
    await query(
      'UPDATE membros SET nome = $1, sobrenome = $2 WHERE id = $3',
      [nome, sobrenome, id]
    );

    // Remover funções antigas
    await query('DELETE FROM membro_funcoes WHERE membro_id = $1', [id]);

    // Inserir novas funções
    for (const funcao of funcoes) {
      await query(
        'INSERT INTO membro_funcoes (membro_id, funcao) VALUES ($1, $2)',
        [id, funcao]
      );
    }

    // Buscar o membro atualizado com suas funções
    const completeResult = await query(`
      SELECT 
        m.id,
        m.nome,
        m.sobrenome,
        ARRAY_AGG(mf.funcao ORDER BY mf.funcao) as funcoes
      FROM membros m
      LEFT JOIN membro_funcoes mf ON m.id = mf.membro_id
      WHERE m.id = $1
      GROUP BY m.id, m.nome, m.sobrenome
    `, [id]);

    const membroAtualizado = completeResult.rows[0];

    // Emitir evento via socket.io
    if (req.app.get('io')) {
      req.app.get('io').emit('member-updated', membroAtualizado);
    }

    return res.json({
      message: 'Membro atualizado com sucesso',
      member: membroAtualizado
    });
  } catch (error) {
    console.error('Erro ao atualizar membro:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * @swagger
 * /membros/{id}:
 *   delete:
 *     summary: Remove um membro
 *     tags: [Membros]
 *     description: Remove um membro e todas as suas ausências associadas
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID do membro a ser removido
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Membro removido com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 member:
 *                   $ref: '#/components/schemas/Membro'
 *                 deletedAbsences:
 *                   type: integer
 *                   description: Número de ausências removidas junto com o membro
 *       404:
 *         description: Membro não encontrado
 *       500:
 *         description: Erro interno do servidor
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Primeiro, verificar se o membro existe
    const memberCheck = await query('SELECT * FROM membros WHERE id = $1', [id]);
    
    if (memberCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Membro não encontrado' });
    }

    // Remover todas as ausências ativas deste membro
    const deletedAbsences = await query(
      'DELETE FROM ausencias WHERE membro_id = $1 RETURNING *', 
      [id]
    );
    
    // Remover o membro de todas as escalas históricas
    const deletedFromSchedules = await query(
      'DELETE FROM historico_escalas WHERE membro_id = $1 RETURNING *', 
      [id]
    );
    
    // Remover o membro
    const result = await query('DELETE FROM membros WHERE id = $1 RETURNING *', [id]);

    // Emitir eventos via socket.io
    if (req.app.get('io')) {
      // Notificar remoção do membro
      req.app.get('io').emit('member-deleted', { id: parseInt(id) });
      
      // Notificar remoção das ausências se houver
      if (deletedAbsences.rows.length > 0) {
        req.app.get('io').emit('absences-updated');
      }
      
      // Notificar que escalas foram atualizadas se o membro estava em escalas
      if (deletedFromSchedules.rows.length > 0) {
        req.app.get('io').emit('schedule-updated', {
          message: 'Membro removido das escalas existentes',
          deletedEntries: deletedFromSchedules.rows.length
        });
      }
    }

    res.json({ 
      message: `Membro removido com sucesso. ${deletedAbsences.rows.length} ausências e ${deletedFromSchedules.rows.length} registros de escalas também foram removidos.`,
      member: result.rows[0],
      deletedAbsences: deletedAbsences.rows.length,
      deletedFromSchedules: deletedFromSchedules.rows.length
    });
  } catch (error) {
    console.error('Erro ao deletar membro:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * @swagger
 * /membros/{id}:
 *   get:
 *     summary: Busca um membro por ID
 *     tags: [Membros]
 *     description: Retorna os dados de um membro específico pelo seu ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID do membro a ser consultado
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Membro encontrado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Membro'
 *       404:
 *         description: Membro não encontrado
 *       500:
 *         description: Erro interno do servidor
 */
// Buscar membro por ID - DEVE SER A ÚLTIMA ROTA
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query('SELECT * FROM membros WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Membro não encontrado' });
    }
    
    return res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao buscar membro:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;

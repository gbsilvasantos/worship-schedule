import { Router } from 'express';
import { query } from '../database/connection';
import { CreateAbsenceRequest } from '../types';

const router = Router();

// Função utilitária para formatar data no padrão brasileiro
const formatarDataBrasil = (data: Date): string => {
  return data.toLocaleDateString('pt-BR') + ' ' + data.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit', 
    second: '2-digit'
  });
};

/**
 * @swagger
 * /ausencias:
 *   get:
 *     summary: Lista todas as ausências
 *     tags: [Ausências]
 *     description: Retorna uma lista de todas as ausências (ativas e finalizadas)
 *     responses:
 *       200:
 *         description: Lista de ausências retornada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/AusenciaCompleta'
 *       500:
 *         description: Erro interno do servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', async (req, res) => {
  try {
    const result = await query(`
      SELECT a.*, 
             m.nome, 
             m.sobrenome, 
             ARRAY_AGG(mf.funcao ORDER BY mf.funcao) as funcoes_membro
      FROM ausencias a
      JOIN membros m ON a.membro_id = m.id
      LEFT JOIN membro_funcoes mf ON m.id = mf.membro_id
      GROUP BY a.id, m.nome, m.sobrenome
      ORDER BY a.data_inicio DESC
    `);
    
    const ausencias = result.rows.map(row => ({
      id: row.id,
      membro_id: row.membro_id,
      nome_membro: `${row.nome} ${row.sobrenome}`,
      funcoes_membro: row.funcoes_membro || [],
      data_inicio: formatarDataBrasil(new Date(row.data_inicio)),
      data_fim: formatarDataBrasil(new Date(row.data_fim)),
      motivo: row.motivo
    }));
    
    res.json(ausencias);
  } catch (error) {
    console.error('Erro ao buscar ausências:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * @swagger
 * /ausencias/membro/{id}:
 *   get:
 *     summary: Lista ausências de um membro específico
 *     tags: [Ausências]
 *     description: Retorna todas as ausências registradas para um membro específico
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID do membro
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Lista de ausências retornada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/AusenciaCompleta'
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
    const result = await query(`
      SELECT a.*, 
             m.nome, 
             m.sobrenome, 
             ARRAY_AGG(mf.funcao ORDER BY mf.funcao) as funcoes_membro
      FROM ausencias a
      JOIN membros m ON a.membro_id = m.id
      LEFT JOIN membro_funcoes mf ON m.id = mf.membro_id
      WHERE a.membro_id = $1
      GROUP BY a.id, m.nome, m.sobrenome
      ORDER BY a.data_inicio DESC
    `, [id]);
    
    const ausencias = result.rows.map(row => ({
      id: row.id,
      membro_id: row.membro_id,
      nome_membro: `${row.nome} ${row.sobrenome}`,
      funcoes_membro: row.funcoes_membro || [],
      data_inicio: formatarDataBrasil(new Date(row.data_inicio)),
      data_fim: formatarDataBrasil(new Date(row.data_fim)),
      motivo: row.motivo
    }));
    
    res.json(ausencias);
  } catch (error) {
    console.error('Erro ao buscar ausências do membro:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * @swagger
 * /ausencias/{id}:
 *   get:
 *     summary: Busca uma ausência por ID
 *     tags: [Ausências]
 *     description: Retorna os dados de uma ausência específica pelo seu ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID da ausência a ser consultada
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Ausência encontrada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AusenciaCompleta'
 *       404:
 *         description: Ausência não encontrada
 *       500:
 *         description: Erro interno do servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(`
      SELECT a.*, 
             m.nome, 
             m.sobrenome, 
             ARRAY_AGG(mf.funcao ORDER BY mf.funcao) as funcoes_membro
      FROM ausencias a
      JOIN membros m ON a.membro_id = m.id
      LEFT JOIN membro_funcoes mf ON m.id = mf.membro_id
      WHERE a.id = $1
      GROUP BY a.id, m.nome, m.sobrenome
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ausência não encontrada' });
    }
    
    const row = result.rows[0];
    const ausencia = {
      id: row.id,
      membro_id: row.membro_id,
      nome_membro: `${row.nome} ${row.sobrenome}`,
      funcoes_membro: row.funcoes_membro || [],
      data_inicio: formatarDataBrasil(new Date(row.data_inicio)),
      data_fim: formatarDataBrasil(new Date(row.data_fim)),
      motivo: row.motivo
    };
    
    res.json(ausencia);
  } catch (error) {
    console.error('Erro ao buscar ausência:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * @swagger
 * /ausencias/verificar/{idMembro}/{data}:
 *   get:
 *     summary: Verifica se um membro está ausente em uma data específica
 *     tags: [Ausências]
 *     description: Verifica se existe algum registro de ausência para o membro na data informada
 *     parameters:
 *       - in: path
 *         name: idMembro
 *         required: true
 *         description: ID do membro
 *         schema:
 *           type: integer
 *       - in: path
 *         name: data
 *         required: true
 *         description: Data para verificar a ausência (formato YYYY-MM-DD)
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Verificação realizada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AusenciaCompleta'
 *               properties:
 *                 esta_ausente:
 *                   type: boolean
 *                   description: Indica se o membro está ausente na data informada
 *                 ausencia:
 *                   $ref: '#/components/schemas/AusenciaCompleta'
 *                   nullable: true
 *                   description: Detalhes da ausência (se houver)
 *       500:
 *         description: Erro interno do servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/verificar/:idMembro/:data', async (req, res) => {
  try {
    const { idMembro, data } = req.params;
    const result = await query(`
      SELECT * FROM ausencias 
      WHERE membro_id = $1 
      AND $2::date BETWEEN data_inicio AND data_fim
    `, [idMembro, data]);
    
    const ausenciaFormatada = result.rows[0] ? {
      ...result.rows[0],
      data_inicio: formatarDataBrasil(new Date(result.rows[0].data_inicio)),
      data_fim: formatarDataBrasil(new Date(result.rows[0].data_fim))
    } : null;

    res.json({
      esta_ausente: result.rows.length > 0,
      ausencia: ausenciaFormatada
    });
  } catch (error) {
    console.error('Erro ao verificar ausência:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * @swagger
 * /ausencias:
 *   post:
 *     summary: Cadastra uma nova ausência e remove escalações conflitantes
 *     tags: [Ausências]
 *     description: |
 *       Registra uma nova ausência para um membro. **AUTOMATICAMENTE**:
 *       - Verifica se o membro possui escalações nas datas da ausência
 *       - Remove todas as escalações encontradas no período
 *       - Informa na resposta quantas escalações foram removidas
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AusenciaCompleta'
 *             required:
 *               - membro_id
 *               - data_inicio
 *               - data_fim
 *             properties:
 *               membro_id:
 *                 type: integer
 *                 description: ID do membro que estará ausente
 *               data_inicio:
 *                 type: string
 *                 format: date
 *                 description: Data de início da ausência (formato YYYY-MM-DD)
 *               data_fim:
 *                 type: string
 *                 format: date
 *                 description: Data final da ausência (formato YYYY-MM-DD)
 *               motivo:
 *                 type: string
 *                 description: Motivo da ausência (opcional)
 *           example:
 *             membro_id: 1
 *             data_inicio: "2025-08-15"
 *             data_fim: "2025-08-16"
 *             motivo: "Férias"
 *     responses:
 *       201:
 *         description: Ausência cadastrada com sucesso (com ou sem remoção de escalações)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Mensagem detalhada incluindo escalações removidas (se houver)
 *                   example: "Ausência de João Silva marcada com sucesso e removido da escala do dia 15/08/2025 (Vocalista)"
 *                 absence:
 *                   $ref: '#/components/schemas/AusenciaCompleta'
 *                 escalacaoRemovidas:
 *                   type: integer
 *                   description: Número de escalações que foram automaticamente removidas
 *                   example: 1
 *       400:
 *         description: Dados inválidos ou incompletos
 *       404:
 *         description: Membro não encontrado
 *       409:
 *         description: Já existe uma ausência cadastrada para este período
 *       500:
 *         description: Erro interno do servidor
 */
router.post('/', async (req, res) => {
  try {
    const { membro_id, data_inicio, data_fim, motivo }: CreateAbsenceRequest = req.body;

    // Validar campos obrigatórios
    if (!membro_id || !data_inicio || !data_fim) {
      return res.status(400).json({ 
        error: 'Membro, data de início e data de fim são obrigatórios' 
      });
    }

    // Verificar se o membro existe
    const memberExists = await query('SELECT nome, sobrenome FROM membros WHERE id = $1', [membro_id]);
    if (memberExists.rows.length === 0) {
      return res.status(404).json({ error: 'Membro não encontrado' });
    }

    const memberInfo = memberExists.rows[0];
    const nomeCompleto = `${memberInfo.nome} ${memberInfo.sobrenome}`;

    // Verificar se a data de fim é posterior à data de início
    if (new Date(data_fim + 'T00:00:00') < new Date(data_inicio + 'T00:00:00')) {
      return res.status(400).json({ 
        error: 'Data de fim deve ser posterior à data de início' 
      });
    }

    // Verificar conflitos com ausências existentes
    const conflictCheck = await query(`
      SELECT id FROM ausencias 
      WHERE membro_id = $1 
      AND (
        (data_inicio <= $2::date AND data_fim >= $2::date) OR
        (data_inicio <= $3::date AND data_fim >= $3::date) OR
        (data_inicio >= $2::date AND data_fim <= $3::date)
      )
    `, [membro_id, data_inicio, data_fim]);

    if (conflictCheck.rows.length > 0) {
      return res.status(409).json({ 
        error: 'Já existe uma ausência cadastrada para este período' 
      });
    }

    // ✅ NOVA FUNCIONALIDADE: Verificar escalações existentes no período da ausência
    const escalacaoesExistentes = await query(`
      SELECT h.id, 
             to_char(h.data_culto, 'DD/MM/YYYY HH24:MI:SS') as data_culto_formatada,
             h.funcao
      FROM historico_escalas h
      WHERE h.membro_id = $1
        AND DATE(h.data_culto) >= $2::date 
        AND DATE(h.data_culto) <= $3::date
      ORDER BY h.data_culto
    `, [membro_id, data_inicio, data_fim]);

    let escalacaoRemovidas = [];
    let mensagemEscalacoes = '';

    // Se encontrou escalações, removê-las
    if (escalacaoesExistentes.rows.length > 0) {
      await query('BEGIN');
      
      try {
        // Remover todas as escalações do membro no período da ausência
        await query(`
          DELETE FROM historico_escalas 
          WHERE membro_id = $1 
            AND DATE(data_culto) >= $2::date 
            AND DATE(data_culto) <= $3::date
        `, [membro_id, data_inicio, data_fim]);

        escalacaoRemovidas = escalacaoesExistentes.rows;
        
        if (escalacaoRemovidas.length === 1) {
          mensagemEscalacoes = ` e removido da escala do dia ${escalacaoRemovidas[0].data_culto_formatada.split(' ')[0]} (${escalacaoRemovidas[0].funcao})`;
        } else {
          const datas = escalacaoRemovidas.map(e => `${e.data_culto_formatada.split(' ')[0]} (${e.funcao})`).join(', ');
          mensagemEscalacoes = ` e removido das escalas dos dias: ${datas}`;
        }
      } catch (escalacaoError) {
        await query('ROLLBACK');
        throw escalacaoError;
      }
    }

    // Inserir nova ausência (garantir que as datas sejam tratadas como DATE)
    const result = await query(
      'INSERT INTO ausencias (membro_id, data_inicio, data_fim, motivo) VALUES ($1, $2::date, $3::date, $4) RETURNING *',
      [membro_id, data_inicio, data_fim, motivo]
    );

    if (escalacaoRemovidas.length > 0) {
      await query('COMMIT');
    }

    const novaAusencia = result.rows[0];

    // Buscar dados do membro para incluir na resposta
    const memberData = await query(`
      SELECT a.*, 
             m.nome, 
             m.sobrenome, 
             ARRAY_AGG(mf.funcao ORDER BY mf.funcao) as funcoes_membro
      FROM ausencias a
      JOIN membros m ON a.membro_id = m.id
      LEFT JOIN membro_funcoes mf ON m.id = mf.membro_id
      WHERE a.id = $1
      GROUP BY a.id, m.nome, m.sobrenome
    `, [novaAusencia.id]);

    const ausenciaCompleta = {
      id: memberData.rows[0].id,
      membro_id: memberData.rows[0].membro_id,
      nome_membro: `${memberData.rows[0].nome} ${memberData.rows[0].sobrenome}`,
      funcoes_membro: memberData.rows[0].funcoes_membro || [],
      data_inicio: formatarDataBrasil(new Date(memberData.rows[0].data_inicio)),
      data_fim: formatarDataBrasil(new Date(memberData.rows[0].data_fim)),
      motivo: memberData.rows[0].motivo
    };

    // Emitir eventos via socket.io
    if (req.app.get('io')) {
      req.app.get('io').emit('absence-marked', ausenciaCompleta);
      
      // Se removeu escalações, emitir evento de atualização de escalas
      if (escalacaoRemovidas.length > 0) {
        req.app.get('io').emit('schedule-updated', {
          message: `Escalações removidas devido à ausência de ${nomeCompleto}`,
          escalacaoRemovidas: escalacaoRemovidas.length
        });
      }
    }

    const mensagemFinal = `Ausência de ${nomeCompleto} marcada com sucesso${mensagemEscalacoes}`;

    return res.status(201).json({
      message: mensagemFinal,
      absence: ausenciaCompleta,
      escalacaoRemovidas: escalacaoRemovidas.length
    });
  } catch (error) {
    // Rollback em caso de erro (se transação foi iniciada)
    await query('ROLLBACK').catch(() => {});
    console.error('Erro ao marcar ausência:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * @swagger
 * /ausencias/{id}:
 *   put:
 *     summary: Atualiza uma ausência
 *     tags: [Ausências]
 *     description: Atualiza os dados de uma ausência existente
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID da ausência a ser atualizada
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AusenciaCompleta'
 *             required:
 *               - data_inicio
 *               - data_fim
 *             properties:
 *               data_inicio:
 *                 type: string
 *                 format: date
 *                 description: Data de início da ausência (formato YYYY-MM-DD)
 *               data_fim:
 *                 type: string
 *                 format: date
 *                 description: Data final da ausência (formato YYYY-MM-DD)
 *               motivo:
 *                 type: string
 *                 description: Motivo da ausência (opcional)
 *     responses:
 *       200:
 *         description: Ausência atualizada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AusenciaCompleta'
 *               properties:
 *                 message:
 *                   type: string
 *                 absence:
 *                   $ref: '#/components/schemas/AusenciaCompleta'
 *       400:
 *         description: Dados inválidos
 *       404:
 *         description: Ausência não encontrada
 *       500:
 *         description: Erro interno do servidor
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data_inicio, data_fim, motivo } = req.body;

    // Verificar se a ausência existe
    const existingAbsence = await query('SELECT * FROM ausencias WHERE id = $1', [id]);
    
    if (existingAbsence.rows.length === 0) {
      return res.status(404).json({ error: 'Ausência não encontrada' });
    }

    // Verificar se a data de fim é posterior à data de início
    if (new Date(data_fim + 'T00:00:00') < new Date(data_inicio + 'T00:00:00')) {
      return res.status(400).json({ 
        error: 'Data de fim deve ser posterior à data de início' 
      });
    }

    // Atualizar dados (garantir que as datas sejam tratadas como DATE)
    const result = await query(
      'UPDATE ausencias SET data_inicio = $1::date, data_fim = $2::date, motivo = $3 WHERE id = $4 RETURNING *',
      [data_inicio, data_fim, motivo, id]
    );

    const ausenciaAtualizada = result.rows[0];

    // Buscar dados completos incluindo informações do membro
    const memberData = await query(`
      SELECT a.*, 
             m.nome, 
             m.sobrenome, 
             ARRAY_AGG(mf.funcao ORDER BY mf.funcao) as funcoes_membro
      FROM ausencias a
      JOIN membros m ON a.membro_id = m.id
      LEFT JOIN membro_funcoes mf ON m.id = mf.membro_id
      WHERE a.id = $1
      GROUP BY a.id, m.nome, m.sobrenome
    `, [id]);

    const ausenciaCompleta = {
      id: memberData.rows[0].id,
      membro_id: memberData.rows[0].membro_id,
      nome_membro: `${memberData.rows[0].nome} ${memberData.rows[0].sobrenome}`,
      funcoes_membro: memberData.rows[0].funcoes_membro || [],
      data_inicio: formatarDataBrasil(new Date(memberData.rows[0].data_inicio)),
      data_fim: formatarDataBrasil(new Date(memberData.rows[0].data_fim)),
      motivo: memberData.rows[0].motivo
    };

    // Emitir evento via socket.io
    if (req.app.get('io')) {
      req.app.get('io').emit('absence-updated', ausenciaCompleta);
    }

    return res.json({
      message: 'Ausência atualizada com sucesso',
      absence: ausenciaCompleta
    });
  } catch (error) {
    console.error('Erro ao atualizar ausência:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * @swagger
 * /ausencias/{id}:
 *   delete:
 *     summary: Remove uma ausência
 *     tags: [Ausências]
 *     description: Remove uma ausência do sistema
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID da ausência a ser removida
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Ausência removida com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AusenciaCompleta'
 *               properties:
 *                 message:
 *                   type: string
 *                 absence:
 *                   $ref: '#/components/schemas/AusenciaCompleta'
 *       404:
 *         description: Ausência não encontrada
 *       500:
 *         description: Erro interno do servidor
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar se a ausência existe
    const existingAbsence = await query('SELECT * FROM ausencias WHERE id = $1', [id]);
    
    if (existingAbsence.rows.length === 0) {
      return res.status(404).json({ error: 'Ausência não encontrada' });
    }

    // Remover a ausência
    const result = await query('DELETE FROM ausencias WHERE id = $1 RETURNING *', [id]);

    // Emitir evento via socket.io
    if (req.app.get('io')) {
      req.app.get('io').emit('absence-removed', { id: parseInt(id) });
    }

    res.json({ 
      message: 'Ausência removida com sucesso',
      absence: result.rows[0]
    });
  } catch (error) {
    console.error('Erro ao deletar ausência:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;

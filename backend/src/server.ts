import dotenv from 'dotenv';

// Carregar variáveis de ambiente - DEVE SER EXECUTADO ANTES DE QUALQUER IMPORTAÇÃO QUE USE VARIÁVEIS DE AMBIENTE
dotenv.config();

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

// Importar configuração do Swagger
import { setupSwagger } from './swagger';

// Importar rotas
import rotasMembros from './routes/membros';
import rotasAusencias from './routes/ausencias';
import rotasEscalas from './routes/escalas';

// Verificar variáveis de ambiente obrigatórias
const requiredEnvVars = ['PORT', 'DATABASE_URL', 'CORS_ORIGINS'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error('❌ Erro: As seguintes variáveis de ambiente são obrigatórias:', missingEnvVars.join(', '));
  process.exit(1); // Encerra o processo com erro
}

const app = express();
const server = createServer(app);

// Obter as origens permitidas para CORS
const corsOrigins = process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : [];

// Configurar Socket.IO com CORS
const io = new Server(server, {
  cors: {
    origin: corsOrigins,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"]
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true
});

// Middleware de segurança
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requests por IP
  message: 'Muitas requisições, tente novamente em 15 minutos'
});
app.use('/api', limiter);

// CORS
app.use(cors({
  origin: corsOrigins,
  credentials: true
}));

// Middleware para parsing JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Disponibilizar io para as rotas
app.set('io', io);

// Middleware de logging com delay para primeira chamada
let firstApiCall = true;
app.use(async (req, res, next) => {
  // Se for a primeira chamada de /api/membros/estatisticas, dar delay
  if (firstApiCall && req.path === '/api/membros/estatisticas') {
    firstApiCall = false;
    // Pequeno delay para garantir que o log do banco apareça primeiro
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // Usar horário local ao invés de UTC
  const agora = new Date();
  const timestamp = agora.toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit', 
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
  console.log(`${timestamp} - ${req.method} ${req.path}`);
  next();
});

// Rotas da API
app.use('/api/membros', rotasMembros);
app.use('/api/ausencias', rotasAusencias);
app.use('/api/escalas', rotasEscalas);

// Configuração do Swagger
setupSwagger(app);

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Verifica o status do sistema
 *     tags: [Sistema]
 *     description: Endpoint para verificar se o sistema está funcionando corretamente
 *     responses:
 *       200:
 *         description: Sistema funcionando normalmente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   description: Status atual do sistema
 *                   example: OK
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   description: Data e hora da consulta
 *                   example: "2025-08-01T14:09:03.000Z"
 *                 environment:
 *                   type: string
 *                   description: Ambiente de execução
 *                   example: development
 *                 description:
 *                   type: string
 *                   description: Descrição do sistema
 *                   example: "Sistema para gerenciamento de escalas de culto com controle de membros e ausências"
 *                 endpoints:
 *                   type: object
 *                   description: URLs dos principais endpoints
 *                   properties:
 *                     membros:
 *                       type: string
 *                       example: "/api/membros"
 *                     ausencias:
 *                       type: string
 *                       example: "/api/ausencias"
 *                     escalas:
 *                       type: string
 *                       example: "/api/escalas"
 *                 features:
 *                   type: array
 *                   items:
 *                     type: string
 *                   description: Lista de funcionalidades principais
 *                   example: ["Gerenciamento de membros por função", "Controle de ausências por período", "Geração automática de escalas"]
 */
// Rota de health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

/**
 * @swagger
 * /api:
 *   get:
 *     summary: Informações sobre a API
 *     tags: [Sistema]
 *     description: Retorna informações gerais sobre a API e seus principais endpoints
 *     responses:
 *       200:
 *         description: Informações da API retornadas com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Mensagem de boas-vindas
 *                   example: "🎵 API do Sistema de Escalas do Ministério"
 *                 version:
 *                   type: string
 *                   description: Versão da API
 *                   example: "1.0.0"
 *                 description:
 *                   type: string
 *                   description: Descrição do sistema
 *                   example: "Sistema para gerenciamento de escalas de culto com controle de membros e ausências"
 *                 endpoints:
 *                   type: object
 *                   description: Lista dos principais endpoints disponíveis
 *                   properties:
 *                     membros:
 *                       type: string
 *                       example: "/api/membros"
 *                     ausencias:
 *                       type: string
 *                       example: "/api/ausencias"
 *                     escalas:
 *                       type: string
 *                       example: "/api/escalas"
 *                     health:
 *                       type: string
 *                       example: "/api/health"
 *                     swagger:
 *                       type: string
 *                       example: "/api/swagger"
 *                 features:
 *                   type: array
 *                   description: Principais funcionalidades do sistema
 *                   items:
 *                     type: string
 *                   example: ["Gerenciamento de membros por função", "Controle de ausências por período"]
 */
// Rota de informações da API
app.get('/api', (req, res) => {
  res.json({ 
    message: '🎵 API do Sistema de Escalas do Ministério',
    version: '1.0.0',
    description: 'Sistema para gerenciamento de escalas de culto com controle de membros e ausências',
    endpoints: {
      membros: '/api/membros',
      ausencias: '/api/ausencias',
      escalas: '/api/escalas',
      health: '/api/health',
      swagger: '/api/swagger'
    },
    features: [
      'Gerenciamento de membros por função',
      'Controle de ausências por período',
      'Geração automática de escalas',
      'Histórico de participações',
      'Notificações em tempo real'
    ]
  });
});

// Socket.IO - Gerenciamento de conexões em tempo real
io.on('connection', (socket) => {
  console.log(`✅ Cliente conectado: ${socket.id}`);

  // Enviar status inicial quando cliente conecta
  socket.emit('connected', { 
    message: 'Conectado ao servidor em tempo real',
    timestamp: new Date().toISOString()
  });

  // Eventos personalizados
  socket.on('join-room', (room) => {
    socket.join(room);
    console.log(`👥 Cliente ${socket.id} entrou na sala: ${room}`);
  });

  socket.on('leave-room', (room) => {
    socket.leave(room);
    console.log(`👋 Cliente ${socket.id} saiu da sala: ${room}`);
  });

  // Ping/Pong para manter conexão viva
  socket.on('ping', () => {
    socket.emit('pong', { timestamp: new Date().toISOString() });
  });

  // Evento de desconexão
  socket.on('disconnect', (reason) => {
    console.log(`❌ Cliente desconectado: ${socket.id} - Motivo: ${reason}`);
  });

  // Evento de erro
  socket.on('error', (error) => {
    console.error(`🔥 Erro no socket ${socket.id}:`, error);
  });
});

// Middleware de tratamento de erros
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('🔥 Erro não tratado:', err);
  
  res.status(500).json({
    error: 'Erro interno do servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Algo deu errado',
    timestamp: new Date().toISOString()
  });
});

// Middleware para rotas não encontradas
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Rota não encontrada',
    path: req.originalUrl,
    timestamp: new Date().toISOString()
  });
});

// Iniciar servidor
const PORT = process.env.PORT;

server.listen(PORT, () => {
  // Construindo a base URL a partir do ambiente
  const apiBaseUrl = process.env.API_BASE_URL;
  const healthCheckUrl = `${apiBaseUrl}/health`;

  console.log(`
🎵 ===============================================
   SERVIDOR DO SISTEMA DE ESCALAS INICIADO
===============================================
🚀 Porta: ${PORT}
🌐 Ambiente: ${process.env.NODE_ENV}
📱 Socket.IO: Ativo
🔗 API Base: ${apiBaseUrl}
📋 Health Check: ${healthCheckUrl}
===============================================
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Recebido SIGTERM, encerrando servidor...');
  server.close(() => {
    console.log('✅ Servidor encerrado com sucesso');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 Recebido SIGINT, encerrando servidor...');
  server.close(() => {
    console.log('✅ Servidor encerrado com sucesso');
    process.exit(0);
  });
});

export default app;

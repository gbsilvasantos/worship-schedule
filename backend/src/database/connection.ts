import { Pool } from 'pg';

// Verificar variáveis de ambiente necessárias
const requiredEnvVars = ['DATABASE_URL'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error('❌ Erro: As seguintes variáveis de ambiente são obrigatórias:', missingEnvVars.join(', '));
  process.exit(1); // Encerra o processo com erro
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Desativando SSL para ambiente Docker e habilitando apenas em produção externa
  ssl: process.env.DATABASE_REQUIRE_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

// Configurar timezone para todas as conexões
pool.on('connect', async (client) => {
  await client.query("SET timezone = 'America/Sao_Paulo'");
});

// Test connection - log apenas uma vez
let connectionLogged = false;
pool.on('connect', () => {
  if (!connectionLogged) {
    console.log('✅ Conectado ao banco PostgreSQL');
    connectionLogged = true;
  }
});

pool.on('error', (err) => {
  console.error('❌ Erro no banco de dados:', err);
});

// Função para garantir conexão inicial
const ensureConnection = async () => {
  if (!connectionLogged) {
    try {
      const client = await pool.connect();
      client.release();
      
      // Aguardar até que o log de conexão apareça
      let attempts = 0;
      while (!connectionLogged && attempts < 50) {
        await new Promise(resolve => setTimeout(resolve, 10));
        attempts++;
      }
    } catch (error) {
      console.error('❌ Erro ao estabelecer conexão inicial:', error);
    }
  }
};

export { pool, ensureConnection };

export const query = (text: string, params?: any[]) => pool.query(text, params);

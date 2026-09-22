import { Pool } from 'pg';

export const postgresPool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Teste inicial de comunicação com o banco de dados
postgresPool.on('connect', () => {
  console.log(
    '🐘 [database]: Conexão com o PostgreSQL estabelecida com sucesso!',
  );
});

postgresPool.on('error', (err) => {
  console.error('💥 [database]: Erro inesperado no pool do PostgreSQL:', err);
});

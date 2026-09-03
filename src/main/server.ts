import express from 'express';
import { setupSwagger } from '@main/config/swagger';
import { userRoutes } from '@infrastructure/http/routes/user.routes';

const app = express();

app.use(express.json());

// Configura o Swagger UI na rota /api/docs (Requisito da Entrega 1)
setupSwagger(app);

// Registra os módulos de rotas sob seus respectivos prefixos REST
app.use('/api/v1/users', userRoutes);

const PORT = 3333;

app.listen(PORT, () => {
  console.log(`🚀 [server]: Servidor rodando em http://localhost:${PORT}`);
});

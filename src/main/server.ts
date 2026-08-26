import express from 'express';
import { userRoutes } from '@infrastructure/http/routes/user.routes';

const app = express();

app.use(express.json());

// Registra os módulos de rotas sob seus respectivos prefixos REST
app.use('/api/v1/users', userRoutes);

const PORT = 3333;

app.listen(PORT, () => {
  console.log(`🚀 [server]: Servidor rodando em http://localhost:${PORT}`);
});

import { Router } from 'express';
import { addressRoutes } from './address.routes';
import { userRoutes } from './user.routes';

const routes = Router();

routes.use('/api/v1/addresses', addressRoutes);
routes.use('/api/v1/users', userRoutes);

export { routes };

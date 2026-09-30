import { Router } from 'express';
import { addressRoutes } from './address.routes';
import { userRoutes } from './user.routes';

const routes = Router();

routes.use('/addresses', addressRoutes);
routes.use('/users', userRoutes);

export { routes };

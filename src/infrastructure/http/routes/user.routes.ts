import { Router } from 'express';
import { makeUserController } from '@main/factories/makeUserController.factory';

const userRoutes = Router();
const userController = makeUserController();

userRoutes.get('/', (req, res) => userController.list(req, res));
userRoutes.post('/', (req, res) => userController.create(req, res));

export { userRoutes };

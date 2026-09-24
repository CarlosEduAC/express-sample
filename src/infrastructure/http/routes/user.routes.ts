import { Router } from 'express';
import { makeUserController } from '@main/factories/makeUserController.factory';
import { validateRequest } from '../middlewares/validateRequest';
import { createUserSchema, getUserByIdSchema } from '../schemas/user.schema';

const userRoutes = Router();
const userController = makeUserController();

userRoutes.get('/', (req, res) => {
  /*
    #swagger.tags = ['Users']
    #swagger.summary = 'Lista todos os usuários'
    #swagger.description = 'Endpoint para listar usuários cadastrados.'
    #swagger.responses[200] = {
      description: 'Lista de usuários retornada com sucesso.',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              data: {
                type: 'array',
                items: { $ref: '#/components/schemas/User' }
              }
            }
          }
        }
      }
    }
  */
  return userController.list(req, res);
});

userRoutes.post(
  '/',
  validateRequest({ body: createUserSchema }),
  (req, res) => {
    /*
    #swagger.tags = ['Users']
    #swagger.summary = 'Cria um novo usuário'
    #swagger.requestBody = {
      required: true,
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/CreateUserDto' }
        }
      }
    }
    #swagger.responses[201] = {
      description: 'Usuário criado com sucesso.',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              message: { type: 'string', example: 'Usuário criado com sucesso!' },
              data: { $ref: '#/components/schemas/User' }
            }
          }
        }
      }
    }
    #swagger.responses[400] = {
      description: 'Regra de negócio violada (ex: E-mail inválido).',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/ErrorResponse' }
        }
      }
    }
  */
    return userController.create(req, res);
  },
);

userRoutes.get(
  '/:id',
  validateRequest({ params: getUserByIdSchema }),
  (req, res, next) => {
    /*
    #swagger.tags = ['Users']
    #swagger.summary = 'Busca um usuário pelo ID'
    #swagger.parameters['id'] = {
      description: 'ID do usuário',
      required: true,
      type: 'string'
    }
    #swagger.responses[200] = {
      description: 'Usuário encontrado com sucesso.',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              data: { $ref: '#/components/schemas/User' }
            }
          }
        }
      }
    }
    #swagger.responses[404] = {
      description: 'Usuário não encontrado.',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/ErrorResponse' }
        }
      }
    }
    */
    return userController.getById(req, res, next);
  },
);

export { userRoutes };

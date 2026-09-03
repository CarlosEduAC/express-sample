import { Router } from 'express';
import { makeUserController } from '@main/factories/makeUserController.factory';

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

userRoutes.post('/', (req, res) => {
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
});

export { userRoutes };

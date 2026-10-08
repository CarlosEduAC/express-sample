import { Router } from 'express';
import { makeUserController } from '@main/factories/makeUserController.factory';
import { validateRequest } from '../middlewares/validateRequest';
import {
  createUserSchema,
  getUserByIdSchema,
  authenticateSchema,
} from '../schemas/user.schema';

const userRoutes = Router();
const userController = makeUserController();

userRoutes.get('/', (req, res, next) => {
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
  return userController.list(req, res, next);
});

userRoutes.post(
  '/',
  validateRequest({ body: createUserSchema }),
  (req, res, next) => {
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
    return userController.create(req, res, next);
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

userRoutes.post(
  '/authenticate',
  validateRequest({ body: authenticateSchema }),
  (req, res, next) => {
    /*
    #swagger.tags = ['Users']
    #swagger.summary = 'Autentica um usuário'
    #swagger.description = 'Valida as credenciais (e-mail e senha) e retorna o perfil do usuário acompanhado do Token JWT para acesso a rotas protegidas.'

    #swagger.requestBody = {
      required: true,
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/AuthenticateUserDto' }
        }
      }
    }

    #swagger.responses[200] = {
        description: 'Autenticação realizada com sucesso.',
        schema: {
          user: {
            id: 'uuid-do-usuario',
            name: 'Ash Ketchum',
            email: 'ash@pokemanager.com',
            role: 'USER'
          },
          token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
        }
      }

      #swagger.responses[400] = {
        description: 'Erro de Validação da Borda (Zod).',
        schema: {
          status: 'error',
          message: 'Dados de entrada inválidos',
          details: [{ field: 'email', message: 'E-mail em formato inválido' }]
        }
      }

      #swagger.responses[401] = {
        description: 'Credenciais inválidas (E-mail ou senha incorretos).',
        schema: {
          status: 'error',
          message: 'Credenciais inválidas'
        }
      }
    */
    return userController.authenticate(req, res, next);
  },
);

export { userRoutes };

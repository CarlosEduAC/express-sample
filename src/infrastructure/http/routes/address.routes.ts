import { Router } from 'express';
import { validateRequest } from '../middlewares/validateRequest';
import { authenticatedHandler } from '../middlewares/authenticatedHandler';
import { getAddressByCepSchema } from '../schemas/address.schema';
import { makeAddressController } from '@main/factories/makeAddressController.factory';

const addressRoutes = Router();
const addressController = makeAddressController();

addressRoutes.get(
  '/:cep',
  authenticatedHandler,
  validateRequest({ params: getAddressByCepSchema }),
  (req, res, next) => {
    /*
      #swagger.tags = ['Endereços']
      #swagger.summary = 'Busca detalhes de endereço por CEP'
      #swagger.description = 'Consome o gateway do ViaCEP na Boundary Layer. Requer autenticação por Bearer Token.'
      #swagger.security = [{ "bearerAuth": [] }]

      #swagger.parameters['cep'] = {
        in: 'path',
        description: 'CEP com 8 dígitos numéricos (com ou sem hífen)',
        required: true,
        type: 'string',
        example: '01001000'
      }

      #swagger.responses[200] = {
        description: 'Endereço encontrado com sucesso.',
        schema: {
          street: 'Praça da Sé',
          neighborhood: 'Sé',
          city: 'São Paulo',
          state: 'SP'
        }
      }

      #swagger.responses[400] = {
        description: 'Validação de borda (Zod) - CEP inválido.',
        schema: {
          status: 'error',
          message: 'Dados de entrada inválidos',
          details: [{ field: 'cep', message: 'O CEP deve conter exatamente 8 dígitos numéricos' }]
        }
      }

      #swagger.responses[401] = {
        description: 'Não Autenticado - Bearer Token ausente ou inválido.',
        schema: {
          status: 'error',
          message: 'Token JWT não fornecido ou inválido'
        }
      }

      #swagger.responses[404] = {
        description: 'Endereço não encontrado para o CEP informado.',
        schema: {
          status: 'error',
          message: 'Endereço para o CEP informado não encontrado(a)'
        }
      }

      #swagger.responses[503] = {
        description: 'Serviço do ViaCEP indisponível ou timeout no Gateway.',
        schema: {
          status: 'error',
          message: 'O serviço de busca de CEP está temporariamente indisponível'
        }
      }
    */
    return addressController.getByCep(req, res, next);
  },
);

export { addressRoutes };

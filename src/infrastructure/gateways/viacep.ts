import axios from 'axios';
import {
  AddressGateway,
  AddressDetails,
} from '@domain/gateways/address.gateway';
import { AppError } from '@domain/errors/app.error';

// DTO Privado: Reflete exatamente a resposta feia/nativa da API externa
interface ViaCepRawResponse {
  logradouro: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
}

export class ViaCepGateway implements AddressGateway {
  private readonly baseUrl = 'https://viacep.com.br/ws';

  async findAddressByCep(cep: string): Promise<AddressDetails | null> {
    const cleanCep = cep.replace(/\D/g, '');

    if (cleanCep.length !== 8) {
      return null;
    }

    try {
      const response = await axios.get<ViaCepRawResponse>(
        `${this.baseUrl}/${cleanCep}/json/`,
        {
          timeout: 4000, // Timeout estipulado em 4 segundos
        },
      );

      // Trata o caso em que o CEP não existe na base dos Correios
      if (response.data.erro) {
        return null;
      }

      // Camada Anti-Corrupção: Traduz os campos do ViaCEP para a nomenclatura do nosso Domínio
      return {
        street: response.data.logradouro,
        neighborhood: response.data.bairro,
        city: response.data.localidade,
        state: response.data.uf,
      };
    } catch (error) {
      // Intercepta erros de rede/timeout sem quebrar a aplicação
      if (axios.isAxiosError(error) && error.code === 'ECONNABORTED') {
        throw new AppError(
          'O serviço de busca de CEP demorou muito para responder',
          503,
        );
      }

      return null;
    }
  }
}

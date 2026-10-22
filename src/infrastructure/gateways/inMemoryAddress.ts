import {
  AddressGateway,
  AddressDetails,
} from '@domain/gateways/address.gateway';

export class InMemoryAddressGateway implements AddressGateway {
  // Banco de dados em memória para testes
  public addresses: Record<string, AddressDetails> = {
    '01001000': {
      street: 'Praça da Sé',
      neighborhood: 'Sé',
      city: 'São Paulo',
      state: 'SP',
    },
    '24020091': {
      street: 'Rua Passo da Pátria',
      neighborhood: 'São Domingos',
      city: 'Niterói',
      state: 'RJ',
    },
  };

  // Flag auxiliar para simular indisponibilidade de serviço nos testes
  public shouldThrowError = false;

  async findAddressByCep(cep: string): Promise<AddressDetails | null> {
    if (this.shouldThrowError) {
      throw new Error('Serviço indisponível');
    }

    const cleanCep = cep.replace(/\D/g, '');
    const address = this.addresses[cleanCep];

    if (!address) {
      return null;
    }

    return address;
  }
}

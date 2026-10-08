import { AddressGateway } from '@domain/gateways/address.gateway';
import { NotFoundError } from '@domain/errors/notFound.error';

export class FindAddressUseCase {
  constructor(private readonly addressGateway: AddressGateway) {}

  async execute(cep: string) {
    const address = await this.addressGateway.findAddressByCep(cep);

    if (!address) {
      throw new NotFoundError('Endereço incorreto para o CEP informado');
    }

    return address;
  }
}

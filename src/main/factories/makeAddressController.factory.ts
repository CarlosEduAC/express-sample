import { ViaCepGateway } from '@infrastructure/gateways/viacep';
import { FindAddressUseCase } from '@application/useCases/findAddress';
import { AddressController } from '@infrastructure/http/controllers/address.controller';

export const makeAddressController = (): AddressController => {
  const addressGateway = new ViaCepGateway();
  const findAddressUseCase = new FindAddressUseCase(addressGateway);

  return new AddressController(findAddressUseCase);
};

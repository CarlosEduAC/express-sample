export interface AddressDetails {
  street: string;
  neighborhood: string;
  city: string;
  state: string;
}

export interface AddressGateway {
  findAddressByCep(cep: string): Promise<AddressDetails | null>;
}

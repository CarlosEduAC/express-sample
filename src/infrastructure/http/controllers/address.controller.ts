import { Request, Response, NextFunction } from 'express';
import { FindAddressUseCase } from '@application/useCases/findAddress';

export class AddressController {
  constructor(private readonly findAddressUseCase: FindAddressUseCase) {}

  async getByCep(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<Response | void> {
    try {
      const { cep } = req.params as { cep: string };
      const address = await this.findAddressUseCase.execute(cep);

      return res.status(200).json(address);
    } catch (error) {
      next(error);
    }
  }
}

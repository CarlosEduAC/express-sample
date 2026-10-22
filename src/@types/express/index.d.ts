import { UserRole } from '@domain/entities/user';

declare global {
  namespace Express {
    export interface Request {
      user?: {
        id: string;
        role: UserRole | string;
      };
    }
  }
}

import { User } from '@domain/entities/user';

export interface IUserRepository {
  create(user: User): Promise<User>;
  findByEmail(email: string): Promise<User | null>;
  findAll(): Promise<User[]>;
  findById(id: string): Promise<User | null>;
}

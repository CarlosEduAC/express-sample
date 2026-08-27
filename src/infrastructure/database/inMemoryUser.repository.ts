import { User } from '@domain/entities/user';
import { IUserRepository } from '@domain/repositories/user.repository';

export class InMemoryUserRepository implements IUserRepository {
  public items: User[] = [];

  async create(user: User): Promise<void> {
    this.items.push(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = this.items.find((item) => item.email === email);
    if (!user) return null;
    return user;
  }

  async findAll(): Promise<User[]> {
    return this.items;
  }
}

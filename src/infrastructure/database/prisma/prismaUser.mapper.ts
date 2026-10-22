import { User as PrismaUser } from '@prisma/client';
import { User } from '@domain/entities/user';

export class PrismaUserMapper {
  static toDomain(raw: PrismaUser): User {
    return new User({
      id: raw.id,
      name: raw.name,
      email: raw.email,
      password: raw.password,
      role: raw.role as 'USER' | 'ADMIN',
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  static toPrisma(user: User) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      password: user.password,
      role: user.role,
    };
  }
}

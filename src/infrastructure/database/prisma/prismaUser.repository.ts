import { User } from '@domain/entities/user';
import { IUserRepository } from '@domain/repositories/user.repository';
import { User as PrismaUser } from '@prisma/client';
import { prisma } from './client';
import { PrismaUserMapper } from './prismaUser.mapper';

export class PrismaUserRepository implements IUserRepository {
  async create(user: User): Promise<User> {
    const data = PrismaUserMapper.toPrisma(user);
    const created = await prisma.user.create({ data });
    return PrismaUserMapper.toDomain(created);
  }

  async findByEmail(email: string): Promise<User | null> {
    const userRaw = await prisma.user.findUnique({
      where: { email },
    });

    if (!userRaw) {
      return null;
    }

    return PrismaUserMapper.toDomain(userRaw);
  }

  async findAll(): Promise<User[]> {
    const usersRaw = await prisma.user.findMany();

    return usersRaw.map((userRaw: PrismaUser) =>
      PrismaUserMapper.toDomain(userRaw),
    );
  }

  async findById(id: string): Promise<User | null> {
    const userRaw = await prisma.user.findUnique({
      where: { id },
    });

    if (!userRaw) {
      return null;
    }

    return PrismaUserMapper.toDomain(userRaw);
  }
}

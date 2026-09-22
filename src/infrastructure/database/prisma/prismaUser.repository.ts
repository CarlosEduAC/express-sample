import { User } from '@domain/entities/user';
import { IUserRepository } from '@domain/repositories/user.repository';
import { User as PrismaUser } from '@prisma/client';
import { prisma } from './client';

export class PrismaUserRepository implements IUserRepository {
  async create(user: User): Promise<void> {
    await prisma.user.create({
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    const userRaw = await prisma.user.findUnique({
      where: { email },
    });

    if (!userRaw) {
      return null;
    }

    return new User({
      id: userRaw.id,
      name: userRaw.name,
      email: userRaw.email,
    });
  }

  async findAll(): Promise<User[]> {
    const usersRaw = await prisma.user.findMany();

    return usersRaw.map(
      (userRaw: PrismaUser) =>
        new User({
          id: userRaw.id,
          name: userRaw.name,
          email: userRaw.email,
        }),
    );
  }

  async findById(id: string): Promise<User | null> {
    const userRaw = await prisma.user.findUnique({
      where: { id },
    });

    if (!userRaw) {
      return null;
    }

    return new User({
      id: userRaw.id,
      name: userRaw.name,
      email: userRaw.email,
    });
  }
}

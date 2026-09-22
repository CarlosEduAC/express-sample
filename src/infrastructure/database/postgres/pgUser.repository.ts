import { User } from '@domain/entities/user';
import { IUserRepository } from '@domain/repositories/user.repository';
import { postgresPool } from './connection';

export class PgUserRepository implements IUserRepository {
  async create(user: User): Promise<void> {
    const query = `
      INSERT INTO users (name, email)
      VALUES ($1, $2)
    `;
    await postgresPool.query(query, [user.name, user.email]);
  }

  async findByEmail(email: string): Promise<User | null> {
    const query = `SELECT id, name, email FROM users WHERE email = $1`;
    const result = await postgresPool.query(query, [email]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return new User({ id: row.id, name: row.name, email: row.email });
  }

  async findAll(): Promise<User[]> {
    const query = `SELECT id, name, email FROM users`;
    const result = await postgresPool.query(query);

    return result.rows.map(
      (row) => new User({ id: row.id, name: row.name, email: row.email }),
    );
  }

  async findById(id: string): Promise<User | null> {
    const query = `SELECT id, name, email FROM users WHERE id = $1`;
    const result = await postgresPool.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return new User({ id: row.id, name: row.name, email: row.email });
  }
}

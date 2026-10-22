import { AppError } from '../errors/app.error';

export type UserRole = 'USER' | 'ADMIN';

export interface UserProps {
  id?: string;
  name: string;
  email: string;
  password: string;
  role?: UserRole;
  createdAt?: Date;
  updatedAt?: Date;
}

export class User {
  private props: UserProps;

  constructor(props: UserProps) {
    if (!props.email.includes('@')) {
      throw new AppError('E-mail em formato inválido.', 400);
    }

    if (!props.password || props.password.length === 0) {
      throw new AppError('A senha é obrigatória.', 400);
    }

    this.props = {
      ...props,
      role: props.role ?? 'USER',
    };
  }

  get id() {
    return this.props.id;
  }

  get name() {
    return this.props.name;
  }

  get email() {
    return this.props.email;
  }

  get password() {
    return this.props.password;
  }

  get role() {
    return this.props.role ?? 'USER';
  }

  get createdAt() {
    return this.props.createdAt;
  }

  get updatedAt() {
    return this.props.updatedAt;
  }
}

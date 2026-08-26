export interface UserProps {
  id: string;
  name: string;
  email: string;
}

export class User {
  private props: UserProps;

  constructor(props: UserProps) {
    if (!props.email.includes('@')) {
      throw new Error('E-mail inválido.');
    }
    this.props = props;
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
}

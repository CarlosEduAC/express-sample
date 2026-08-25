//? Inferência vs. Tipagem Explícita

// Tipagem explícita
let username: string = "Carlos";
let age: number = 30;
let isActive: boolean = true;

// Inferência de Tipo (O TS entende o tipo pelo valor atribuído)
let city = "São Paulo"; // TS já sabe que é 'string'
// city = 123; // ❌ Erro: Tipo 'number' não pode ser atribuído a 'string'

//? Contratos Rígidos com Interface

interface UserProfile {
  id: string;
  name: string;
  email: string;
  age?: number; // Propriedade opcional
}

const user1: UserProfile = {
  id: "usr-1",
  name: "Ana Silva",
  email: "ana@email.com",
  // age é opcional, então não acusa erro!
};

// ❌ ERRO: Faltou a propriedade 'email' obrigatória
const user2: UserProfile = {
  id: "usr-2",
  name: "Bruno",
};

//? Union Types e Type Narrowing

// ID pode ser número ou string
type ID = string | number;

function printUserId(id: ID) {
  // Type Narrowing: O TS descobre o tipo em tempo de execução
  if (typeof id === "string") {
    console.log(`ID textual formatado: ${id.toUpperCase()}`);
  } else {
    console.log(`ID numérico: ${id.toFixed(0)}`);
  }
}

printUserId("abc-123"); // Funciona
printUserId(456);     // Funciona

//? Valores Restritos com Literal Types e Enums

// Literal Type
type OrderStatus = "PENDING" | "PAID" | "SHIPPED" | "DELIVERED";

let statusAtual: OrderStatus = "PENDING";
// statusAtual = "ENVIADO"; // ❌ Erro: "ENVIADO" não é uma opção válida!

// Enum (Mais robusto para categorias fixas)
enum UserRole {
  ADMIN = "ADMINISTRATOR",
  CLIENT = "CLIENT_USER",
  GUEST = "GUEST_USER"
}

interface Account {
  username: string;
  role: UserRole;
}

const myAccount: Account = {
  username: "carloseac",
  role: UserRole.ADMIN
};

//? Reutilização de Código com Generics

// Função genérica <T> que aceita qualquer tipo e mantém a segurança
function wrapInArray<T>(item: T): T[] {
  return [item];
}

const numberArray = wrapInArray(100);       // Retorna number[]
const stringArray = wrapInArray("Texto");  // Retorna string[]

// Exemplo em API: Padronizador de Respostas da Web
interface ApiResponse<TData> {
  statusCode: number;
  data: TData;
  timestamp: string;
}

const userResponse: ApiResponse<UserProfile> = {
  statusCode: 200,
  timestamp: new Date().toISOString(),
  data: user1 // O TS valida se user1 é um UserProfile!
};

//! Exemplo 1

// CÓDIGO JS ORIGINAL COM ERROS
function formatUserReceiptjs(user, items) {
  const total = items.reduce((acc, item) => acc + item.priice, 0); // Erro de digitação
  return "Cliente: " + user.name.toUpperCase() + " | Total: R$ " + total.toFixed(2);
}

const client2 = { name: "Marcos" }; // Faltou validar formato do cliente
const cart2 = [{ name: "Teclado", price: "150" }]; // Preço veio como string!

console.log(formatUserReceiptjs(client2, cart2));

// --- RESOLUSÃO Exemplo 1 ---
interface IUser {
  name: string;
}

interface ICartItem {
  name: string;
  price: number;
}

function formatUserReceipt(user: IUser, items: ICartItem[]): string {
  const total = items.reduce((acc, item) => acc + item.price, 0);
  return `Cliente: ${user.name.toUpperCase()} | Total: R$ ${total.toFixed(2)}`;
}

const client: IUser = { name: "Marcos" };
const cart: ICartItem[] = [{ name: "Teclado", price: 150 }];

console.log(formatUserReceipt(client, cart));

//! Exemplo 2

// Sistema de Notificações com Union Types
// 1. Crie uma interface EmailNotification com as propriedades: type: "EMAIL", emailAddress: string, subject: string.
// 2. Crie uma interface SMSNotification com as propriedades: type: "SMS", phoneNumber: string, message: string.
// 3. Crie um tipo genérico Notification = EmailNotification | SMSNotification.
// 4. Escreva uma função sendNotification(notification: Notification) que utilize o campo type para decidir se imprime no console o envio por E-mail ou por SMS.

interface EmailNotification {
  type: "EMAIL";
  emailAddress: string;
  subject: string;
}

interface SMSNotification {
  type: "SMS";
  phoneNumber: string;
  message: string;
}

type Notification = EmailNotification | SMSNotification;

function sendNotification(notification: Notification) {
  if (notification.type === "EMAIL") {
    console.log(`Enviando E-mail para ${notification.emailAddress}: ${notification.subject}`);
  } else {
    console.log(`Enviando SMS para ${notification.phoneNumber}: ${notification.message}`);
  }
}
# 🎮 PokéManager API

![Node.js](https://img.shields.io/badge/Node.js-v20-green?logo=nodedotjs)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Express](https://img.shields.io/badge/Express-4-lightgrey?logo=express)
![Clean Architecture](https://img.shields.io/badge/Architecture-Clean--Arch-orange)

API REST para gerenciamento do catálogo e dos times de Pokémons, construída em aulas práticas com Node.js, Express e TypeScript.

Este repositório reúne o código do projeto e o material de todas as aulas ministradas.

## 📚 Conteúdo das Aulas

Cada aula tem um material teórico e prático e, em geral, uma lista de atividades (tasks).

### 🏗️ Módulo 1: Fundamentos e Arquitetura

| Aula | Tema | Atividades |
|:---:|---|:---:|
| 1 | [PokéManager API](docs/aulas/M%C3%B3dulo%201/Aula1.md) | [📝 Tasks](docs/aulas/M%C3%B3dulo%201/Tasks%20Aula1.md) |
| 2 | [Fundamentos de Arquitetura Web com Express](docs/aulas/M%C3%B3dulo%201/Aula2.md) | [📝 Tasks](docs/aulas/M%C3%B3dulo%201/Tasks%20Aula2.md) |
| 3 | [TypeScript](docs/aulas/M%C3%B3dulo%201/Aula3.md) | [📝 Tasks](docs/aulas/M%C3%B3dulo%201/Tasks%20Aula3.md) |
| 4 | [Estrutura de Projeto Node.js com Clean Architecture](docs/aulas/M%C3%B3dulo%201/Aula4.md) | [📝 Tasks](docs/aulas/M%C3%B3dulo%201/Tasks%20Aula4.md) |
| 5 | [Documentação Interativa com Swagger / OpenAPI 3.0](docs/aulas/M%C3%B3dulo%201/Aula5.md) | [📝 Tasks](docs/aulas/M%C3%B3dulo%201/Tasks%20Aula5.md) |
| 6 | [Tratamento Global de Erros (AppError)](docs/aulas/M%C3%B3dulo%201/Aula6.md) | [📝 Tasks](docs/aulas/M%C3%B3dulo%201/Tasks%20Aula6.md) |

### 🗄️ Módulo 2: Persistência e Integrações

| Aula | Tema | Atividades |
|:---:|---|:---:|
| 7 | [Conteinerização com Docker e Docker Compose](docs/aulas/M%C3%B3dulo%202/Aula7.md) | [📝 Tasks](docs/aulas/M%C3%B3dulo%202/Tasks%20Aula7.md) |
| 8 | [Persistência de Dados Relacional com PostgreSQL](docs/aulas/M%C3%B3dulo%202/Aula8.md) | [📝 Tasks](docs/aulas/M%C3%B3dulo%202/Tasks%20Aula8.md) |
| 9 | [Persistência de Dados com Prisma ORM](docs/aulas/M%C3%B3dulo%202/Aula9.md) | [📝 Tasks](docs/aulas/M%C3%B3dulo%202/Tasks%20Aula9.md) |
| 10 | [Validação dos Dados de Entrada com Zod](docs/aulas/M%C3%B3dulo%202/Aula10.md) | [📝 Tasks](docs/aulas/M%C3%B3dulo%202/Tasks%20Aula10.md) |
| 11 | [Tratamento Global de Erros de Infraestrutura](docs/aulas/M%C3%B3dulo%202/Aula11.md) | [📝 Tasks](docs/aulas/M%C3%B3dulo%202/Tasks%20Aula11.md) |
| 12 | [Integração com APIs Externas e o Padrão Gateway (Boundary Layer)](docs/aulas/M%C3%B3dulo%202/Aula12.md) | [📝 Tasks](docs/aulas/M%C3%B3dulo%202/Tasks%20Aula12.md) |

### 🔐 Módulo 3: Autenticação e Segurança

| Aula | Tema | Atividades |
|:---:|---|:---:|
| 13 | [Autenticação JWT e Autorização RBAC](docs/aulas/M%C3%B3dulo%203/Aula13.md) | [📝 Tasks](docs/aulas/M%C3%B3dulo%203/Tasks%20Aula13.md) |
| 14 | [Renovação com Refresh Tokens, Revogação e Rota](docs/aulas/M%C3%B3dulo%203/Aula14.md) | [📝 Tasks](docs/aulas/M%C3%B3dulo%203/Tasks%20Aula14.md) |
| 15 | [Segurança Defensiva de APIs & Gestão de Configurações](docs/aulas/M%C3%B3dulo%203/Aula15.md) | [📝 Tasks](docs/aulas/M%C3%B3dulo%203/Tasks%20Aula15-16.md) |
| 16 | [Gestão de Segredos & Validação de Ambiente com Zod](docs/aulas/M%C3%B3dulo%203/Aula16.md) | [📝 Tasks](docs/aulas/M%C3%B3dulo%203/Tasks%20Aula15-16.md) |

### 🚀 Módulo 4: Testes, CI/CD e Deploy

| Aula | Tema | Atividades |
|:---:|---|:---:|
| 17 | [Introdução à Pirâmide de Testes & Configuração do Jest no TypeScript](docs/aulas/M%C3%B3dulo%204/Aula17.md) | [📝 Tasks](docs/aulas/M%C3%B3dulo%204/Tasks%20Aula17.md) |
| 18 | [Testes Unitários de Regras de Negócio e Casos de Uso](docs/aulas/M%C3%B3dulo%204/Aula18.md) | [📝 Tasks](docs/aulas/M%C3%B3dulo%204/Tasks%20Aula18-19.md) |
| 19 | [Testes de Integração de Endpoints (Supertest + Banco de Testes)](docs/aulas/M%C3%B3dulo%204/Aula19.md) | [📝 Tasks](docs/aulas/M%C3%B3dulo%204/Tasks%20Aula18-19.md) |
| 20 | [Automação de Workflows com CI/CD (GitHub Actions)](docs/aulas/M%C3%B3dulo%204/Aula20.md) | [📝 Tasks](docs/aulas/M%C3%B3dulo%204/Tasks%20Aula20.md) |
| 21 | [Ambientes de Produção & Imagens Docker Multi-Stage para Deploy](docs/aulas/M%C3%B3dulo%204/Aula21.md) | [📝 Tasks](docs/aulas/M%C3%B3dulo%204/Tasks%20Aula21.md) |
| 22 | [Deploy em Nuvem (PaaS Render) & Observabilidade (Monitoramento e Logs)](docs/aulas/M%C3%B3dulo%204/Aula22.md) | [📝 Tasks](docs/aulas/M%C3%B3dulo%204/Tasks%20Aula22.md) |

> As aulas 15 e 16 compartilham o mesmo arquivo de atividades, assim como as aulas 18 e 19.

## 🖼️ Outros materiais

- [Exemplo de README de entrega](docs/EXEMPLO.md)
- [Imagens usadas nas aulas](docs/images)

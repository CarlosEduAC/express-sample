# Documentação Interativa com Swagger / OpenAPI 3.0

## O Problema da Documentação Desatualizada

Em projetos de software, um dos maiores desafios de engenharia é o Code-Doc Drift (descompasso entre o código e a documentação). Quando a documentação é mantida em arquivos separados (como um YAML no Swagger Hub ou no Postman), o desenvolvedor altera uma rota ou DTO no código, mas esquece de atualizar a documentação. Em pouco tempo, a documentação se torna inútil ou enganosa.

## OpenAPI 3.0 vs. Swagger UI

- *OpenAPI 3.0 (O Contrato):* É a especificação técnica (linguagem/formato JSON ou YAML) que define de forma padronizada a estrutura da sua API: quais são os caminhos (paths), verbos HTTP, parâmetros de busca, cabeçalhos, contratos de requisição/resposta (schemas) e métodos de autenticação.
- *Swagger UI (A Interface Visual):* É um cliente web (HTML/JS/CSS) que consome o contrato OpenAPI (o JSON) e o transforma em uma documentação interativa com interface gráfica, permitindo inclusive realizar chamadas HTTP reais à API (Try it out).
- *swagger-autogen (O Gerador):* É uma ferramenta que analisa a estrutura do seu projeto Node.js/Express (ast/mapeamento de rotas) e lê marcações no código para gerar o arquivo JSON no formato OpenAPI 3.0 de forma automatizada.

## Instalação de Dependências

Para utilizar o Swagger UI e o swagger-autogen em um projeto Node.js/Express, você precisa instalar as seguintes dependências:

```bash

# Dependência de execução (para montar a interface visual no Express)
npm install swagger-ui-express

# Dependências de desenvolvimento e tipos
npm install -D swagger-autogen @types/swagger-ui-express

```

Por que esses pacotes específicos?

- swagger-ui-express: Middleware necessário em tempo de execução para servir a interface gráfica HTML/CSS do Swagger na rota /api/docs.
- swagger-autogen: Ferramenta de desenvolvimento que analisa suas rotas e comentários para gerar o swagger-output.json.
- @types/swagger-ui-express: Tipagens TypeScript para o middleware do Swagger.

## Estrutura do Script de Automação

Crie o arquivo [swagger-generator.ts](src/main/config/swagger-generator.ts) (ou na raiz do projeto/pasta de configurações) para configurar o swagger-autogen.

```typescript

import path from 'path';
import swaggerAutogen from 'swagger-autogen';

const doc = {
  info: {
    version: '1.0.0',
    title: 'Express Sample API',
    description:
      'API de exemplo desenvolvida para a disciplina Tópicos Especiais em Engenharia de Software (UFF)',
  },
  host: 'localhost:3333',
  basePath: '/',
  schemes: ['http'],
  consumes: ['application/json'],
  produces: ['application/json'],
  tags: [
    {
      name: 'Users',
      description: 'Endpoints de gerenciamento de usuários',
    },
  ],
  definitions: {
    User: {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'John Doe',
      email: 'john.doe@example.com',
    },
    CreateUserDto: {
      $id: '123e4567-e89b-12d3-a456-426614174000',
      $name: 'John Doe',
      $email: 'john.doe@example.com',
    },
    ErrorResponse: {
      error: 'E-mail inválido.',
    },
  },
};

const outputFile = path.resolve(__dirname, 'swagger-output.json');

const endpointsFiles = [path.resolve(__dirname, '../server.ts')];

swaggerAutogen({ openapi: '3.0.0' })(outputFile, endpointsFiles, doc);

```

### Como funciona o processo de geração interna?

O swagger-autogen faz uma análise estática e dinâmica das suas rotas Express:

- Ele mapeia os arquivos informados no array endpointsFiles (ex: ['../server.ts']).
- Ele identifica todos os verbos e rotas registrados (ex: router.get('/users', ...)).
- Ele lê o objeto base doc definido no script swagger.ts para usar como cabeçalho global (versão, título, schemas reutilizáveis/definitions).
- Ele compila todas essas informações e grava o resultado final no arquivo estático de saída (swagger-output.json).

### É possível editar o swagger-output.json manualmente?

Sim, é um arquivo JSON comum. No entanto, não é recomendado no fluxo automatizado. Qualquer alteração manual pode ser sobrescrita na próxima execução do script swagger.ts.

- Por que evitar a edição manual do JSON gerado?

Toda vez que o script npm run swagger ou tsx src/swagger.ts for executado (por exemplo, no build do CI/CD ou no script de desenvolvimento npm run dev), o arquivo swagger-output.json será completamente sobrescrito. Se algum aluno editar o JSON diretamente, essa alteração será perdida na próxima compilação/geração.

- Onde deve ser feita a customização manual então?

Se você precisar adicionar ou modificar informações que o gerador não descobriu sozinho, há duas formas corretas de fazer isso:

  1. No objeto base doc dentro do script swagger.ts: Ideal para configurações globais, schemas reutilizáveis (definitions / components), definições de segurança (JWT), contatos da equipe e termos de serviço.
  2. Diretamente sobre os métodos do Controller/Rota através dos comentários #swagger.*.

## Configuração das Anotações no Controller/Rotas

Para enriquecer a documentação gerada pelo swagger-autogen, adicionamos comentários especiais dentro dos controllers ou rotas express.

- Exemplo Controller de Usuários

[Exemplo nas Rotas de Usuários](src/infrastructure/http/routes/user.routes.ts)

### Anotações Básicas de Rota

```typescript
/*

  #swagger.tags = ['Users']                              // Agrupa a rota no painel visual
  #swagger.summary = 'Título curto da rota'               // Resumo da ação (ex: Lista usuários)
  #swagger.description = 'Descrição longa explicativa'   // Detalhes da regra/comportamento
  #swagger.deprecated = false                           // Sinaliza se a rota está obsoleta

  // req.params (:id)
  #swagger.parameters['id'] = { description: 'ID do recurso' }

  // req.query (?page=1&limit=10)
  #swagger.parameters['page'] = { in: 'query', type: 'integer', description: 'Número da página' }

  // req.headers (Headers customizados)
  #swagger.parameters['x-api-key'] = { in: 'header', type: 'string', required: true }

  #swagger.requestBody = {
    required: true,
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/CreateUserDto' }
      }
    }
  }

  // Resposta com Schema reutilizável
  #swagger.responses[200] = {
    description: 'Sucesso',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/User' }
      }
    }
  }

  // Resposta inline simples (sem precisar do schema global)
  #swagger.responses[404] = {
    description: 'Recurso não encontrado',
    content: {
      'application/json': {
        schema: { message: 'Usuário não encontrado' }
      }
    }
  }
*/
```

### Os comentários nos controllers são necessários?

Não são estritamente obrigatórios, mas são altamente recomendados.

O swagger-autogen consegue ler o seu código Express cru e deduzir automaticamente várias coisas sozinho:

- Caminhos das rotas (ex: /api/v1/users/:id).
- Verbos HTTP (GET, POST, PUT, DELETE).
- Parâmetros de rota (req.params.id).
- Código de status retornado se você usar explicitamente res.status(201).json(...).

### Por que usar as anotações se o gerador faz isso sozinho?

A inferência automática do swagger-autogen é limitada à análise do código Javascript/Typescript. Sem as anotações, a documentação gerada fica genérica e rasa.

As anotações com o prefixo #swagger.* funcionam como metadados descritivos. Elas servem para:

1. Adicionar Riqueza Semântica: Adicionar títulos curtos (summary), descrições detalhadas (description) e categorias (tags) que o código puramente técnico não possui.
2. Documentar Respostas de Erro: Se o seu controller trata um erro e retorna res.status(400), mas em outros casos o erro é capturado por um middleware global de exceções, o gerador automático não descobre o retorno 400 ou 500 sozinho. Você informa isso via #swagger.responses[400].
3. Mapear DTOs / Schemas Complexos: O gerador nem sempre descobre a estrutura exata do JSON que vem no req.body do POST/PUT. Ao usar #swagger.requestBody apontando para uma definição ($ref: '#/definitions/CreateUserDto'), a interface do Swagger exibe um payload de exemplo pronto e validado para quem for consumir a API.

## Exposição da Rota /api/docs no Express (server.ts)

- [Server](src/main/server.ts)
- [Swagger](src/main/config/swagger.ts)
- [Swagger Output](src/main/config/swagger-output.json)
A rota `/api/docs` no Express serve a interface do Swagger UI, permitindo que você visualize e interaja com a documentação da API gerada automaticamente.
[Acesse a documentação da API](http://localhost:3333/api/docs)

## Automação e Scripts do package.json

Adicione scripts no seu package.json para facilitar a geração do Swagger antes da inicialização ou durante o build da aplicação:

```json

{
  "scripts": {
    "swagger": "tsx src/main/config/swagger-generator.ts",
    "start": "npm run swagger && tsx watch src/main/server.ts",
    "build": "npm run swagger && tsc"
  }
}

```

Como a execução funciona na prática:

1. Ao rodar npm run dev, o comando npm run swagger é invocado primeiro.
2. O swagger-autogen faz a varredura das rotas registradas, lê as propriedades dos DTOs e comentários #swagger.* e gera/atualiza o swagger-output.json.
3. A aplicação inicia e disponibiliza o painel interativo em [Documentação da API](http://localhost:3333/api/docs).

## Links Importantes

- [Swagger Autogen](https://swagger-autogen.github.io/docs/)
- [OpenAPI Specification 3.0.0](https://spec.openapis.org/oas/v3.0.0.html)
- [Swagger Specification Overview](https://swagger.io/docs/specification/v3_0/about/)

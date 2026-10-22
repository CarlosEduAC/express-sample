# Atividades

## Exercício 1: Criando Erros de Domínio Customizados (AppError)

Objetivo: Exercitar a criação da classe de erro da camada de Domínio e usá-la nos Casos de Uso.

O que fazer:

1. Verifique se o arquivo src/domain/errors/app-error.ts está criado e exportando a classe AppError com as propriedades message e statusCode.
2. No Caso de Uso GetUserByIdUseCase, altere a validação: se o usuário não for encontrado pelo ID, lance um AppError com a mensagem "Usuário não encontrado na base de dados." e o status code 404.
3. No Caso de Uso CreateUserUseCase, se o e-mail já existir, lance um AppError com a mensagem "Já existe um usuário cadastrado com este e-mail." e o status code 409 (Conflict).

## Exercício 2: Limpeza dos Controllers (Removendo o try/catch)

Objetivo: Aplicar o padrão onde o Controller apenas recebe o payload, chama o Caso de Uso e retorna o status de sucesso, deixando as exceções passarem direto para o Express.

O que fazer:

1. Abra o arquivo src/infrastructure/http/controllers/user-controller.ts.
2. Remova todos os blocos try/catch dos métodos create, list e getById.
3. Garanta que, ao disparar um erro dentro de qualquer Caso de Uso, o método do Controller não capture o erro manualmente.

## Exercício 3: O Middleware Global (errorHandler)

Objetivo: Criar e registrar o middleware centralizador no pipeline do Express.

O que fazer:

1. Crie o arquivo src/infrastructure/http/middlewares/error-handler.ts.
2. Implemente a função errorHandler recebendo os 4 parâmetros (error: Error, req: Request, res: Response, next: NextFunction).
3. Se o error for uma instância de AppError, retorne a resposta no formato:

```json

{
  "status": "error",
  "statusCode": 400,
  "message": "Mensagem do erro aqui"
}

```

4. Se o erro for uma falha genérica (ex: TypeError), printe o erro com console.error e retorne status 500 com a mensagem "Erro interno no servidor.".
5. No arquivo src/main/server.ts, registre o app.use(errorHandler) obrigatoriamente após a declaração de todas as rotas e do Swagger.

## Exercício 4: Validação Prática e Testes HTTP (Desafio da Turma)

Objetivo: Testar os cenários de sucesso e falha usando o cURL, Insomnia ou a própria interface do Swagger.

Cenários a serem testados e validados:

1. Teste A (Sucesso - 201 Created):
Cadastre um usuário novo com e-mail válido.
2. Teste B (Conflito - 409 Conflict):
Tente cadastrar exatamente o mesmo usuário novamente. Verifique se o middleware respondeu com status 409 e o JSON do AppError.
3. Teste C (Não Encontrado - 404 Not Found):
Faça um GET /api/v1/users/id-inexistente e confirme se o retorno foi 404.
4. Teste D (Erro Inesperado - 500 Internal Server Error):
Force um erro simulado no código (ex: throw new Error("Erro de conexão simulado")) dentro de um Caso de Uso e verifique se o servidor responde 500 sem expor a stack de código do servidor para o cliente.

## Exercício 5: Criar Readme do projeto

Objetivo: Documentar o projeto, explicando como configurá-lo, executá-lo e testá-lo.

O que fazer:

1. Crie um arquivo README.md na raiz do projeto.
2. Adicione uma seção de introdução explicando o propósito do projeto.
3. Adicione instruções de instalação e execução do projeto.
4. Explique como rodar os testes e como utilizar os endpoints da API.
5. Inclua exemplos de requisições e respostas, se possível.

# Fundamentos de Arquitetura Web com Express

## Modelo Cliente-Servidor e o Ciclo Request/Response

### Protocolo HTTP

O HTTP (Hypertext Transfer Protocol) é o protocolo de comunicação utilizado na web. Ele define como as mensagens são formatadas e transmitidas entre clientes (como navegadores ou aplicativos) e servidores. O HTTP é baseado em um modelo de requisição e resposta, onde o cliente envia uma requisição ao servidor, que processa a solicitação e retorna uma resposta.

[ Cliente / Frontend ]                                [ Servidor / API Node.js ]
   (Insomnia / App)                                       (Express + Clean Arch)
           │                                                         │
           │  1. Requisição HTTP (GET /api/v1/pokemons)              │
           ├────────────────────────────────────────────────────────>│
           │                                                         │
           │                                                         │ 2. Processa Lógica e consulta Banco
           │                                                         │
           │  3. Resposta HTTP (Status 200 OK + JSON Body)           │
           │<────────────────────────────────────────────────────────┤

Statelessness (Sem Estado): Cada requisição do cliente para o servidor deve conter todas as informações necessárias para ser compreendida. O servidor não "guarda memória" de requisições anteriores sem um contexto explícito. Cada requisição deve conter todas as informações necessárias.

### Anatomia de uma Mensagem HTTP

A Requisição (Request)

```http
    POST /api/v1/pokemons HTTP/1.1
    Host: localhost:3333
    Content-Type: application/json
    User-Agent: Insomnia/2023.5.8

    {
    "id": "1",
    "name": "Pikachu",
    "type": "Electric"
    }
```

=====================================================================
Verbo = POST
Endpoint = /api/v1/pokemons
Versão do Protocolo = HTTP/1.1

Headers = Host: localhost:3333 / Content-Type: application/json /User-Agent: Insomnia/2023.5.8

Body = {
    "id": "1",
    "name": "Pikachu",
    "type": "Electric"
}

======================================================================

A Resposta (Response)

```http
    HTTP/1.1 201 Created
    Content-Type: application/json; charset=utf-8
    Content-Length: 104

    {
        "message": "Pokémon cadastrado com sucesso!",
        "data": { "id": "1", "name": "Pikachu", "type": "Electric" }
    }
```

Status Code = 201 Created
Headers de Resposta = Content-Type: application/json; charset=utf-8 / Content-Length: 104
Body = {
    "message": "Pokémon cadastrado com sucesso!",
    "data": { "id": "1", "name": "Pikachu", "type": "Electric" }
}

======================================================================

## Princípios de Projeto de APIs RESTful

As APIs REST seguem princípios de design que facilitam a comunicação entre clientes e servidores. Alguns desses princípios incluem:

- Utilizar métodos HTTP de forma consistente para operações CRUD (Create, Read, Update, Delete).
- Utilizar códigos de status HTTP apropriados para indicar o resultado das operações.
- Utilizar URLs (endpoints) que representem recursos de forma clara e intuitiva.
- Transmitir dados em formatos padronizados, como JSON, para facilitar a interoperabilidade entre diferentes sistemas.

Principais Métodos (Verbos)

GET: Pede dados ou páginas de um servidor.
POST: Envia novos dados para o servidor criar algo.
PUT: Atualiza ou substitui um recurso inteiro.
PATCH: Atualiza parcialmente um recurso existente.
DELETE: Apaga um recurso no servidor.

Status Codes (Códigos de Status)

1xx (Informacional): Como o 100 Continue.
2xx (Sucesso): Como o 200 OK. 201 Created. 204 No Content.
3xx (Redirecionamento): Como o 301 Moved Permanently. 304 Not Modified.
4xx (Erro do Cliente): Como o 400 Bad Request. 401 Unauthorized. 403 Forbidden. 404 Not Found.
5xx (Erro do Servidor): 500 Internal Server Error. 502 Bad Gateway. 503 Service Unavailable.

Nomes de Recursos (Endpoints)

Os endpoints devem ser substantivos e representar recursos, não ações. Por exemplo, use `/pokemons` em vez de `/cadastrarPokemon`. Use plural para coleções e singular para itens individuais.

❌ POST /cadastrarPokemon
✅ POST /api/v1/pokemons

As APIs RESTful, por sua vez, são APIs que aderem estritamente aos princípios REST. Elas seguem as características mencionadas anteriormente e são consideradas uma implementação mais completa e rigorosa do modelo REST.

Para uma API ser considerada RESTful, ela deve atender a certos critérios adicionais além dos princípios REST. Esses critérios incluem:

- Interface uniforme: a API deve fornecer uma interface consistente e padronizada para acessar e manipular recursos.
- Clientes sem estado: cada solicitação enviada pelo cliente para o servidor deve conter todas as informações necessárias para entendê-la, sem depender de nenhum contexto armazenado no servidor.
- Operações baseadas em recursos: as ações realizadas pela API devem ser orientadas a recursos identificados por URLs únicas.

## Express.js: Um Framework para Construção de APIs RESTful

O Express.js é um framework web para Node.js que facilita a criação de APIs RESTful. Ele fornece uma estrutura simples e flexível para lidar com rotas, middleware e manipulação de requisições e respostas HTTP.

### Instalação e Configuração do Projeto

```bash
npm i express
npm i --save-dev @types/express
```

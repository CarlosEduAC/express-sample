# Atividades

## Exercício 1: Adicione Docker e Docker Compose no Projeto

Adicione um Dockerfile e um arquivo docker-compose.yml ao projeto. Certifique-se de que o Dockerfile define a imagem base, copia os arquivos necessários e expõe a porta correta. No docker-compose.yml, defina os serviços necessários, incluindo o serviço da aplicação e o banco de dados PostgreSQL, utilizando as variáveis de ambiente definidas no arquivo .env.

## Exercício 2: Configurar Variáveis de Ambiente

Crie um arquivo `.env.example` na raiz do projeto e defina as variáveis de ambiente necessárias, incluindo a porta da aplicação, o ambiente de execução e as credenciais do banco de dados PostgreSQL. Certifique-se de que o arquivo `.env` real utilize essas variáveis.

## Exercício 3: Subir a Aplicação com Docker Compose

Utilize o comando `docker compose up -d` para subir todos os serviços definidos no arquivo `docker-compose.yml`. Certifique-se de que todos os containers estão em execução corretamente utilizando o comando `docker compose ps`.

## Exercício 4: Conectar com sucesso na interface do Adminer na porta 8080

Acesse a interface do Adminer através do navegador utilizando o endereço `http://localhost:8080`. Utilize as credenciais do banco de dados PostgreSQL definidas nas variáveis de ambiente para se conectar ao banco de dados. Certifique-se de que a conexão seja bem-sucedida, a principio não teremos tabelas criadas no banco de dados.

## Exercício 5: Parar e Remover os Containers

Utilize o comando `docker compose down` para parar todos os serviços e remover os containers criados. Se desejar também remover os volumes associados, utilize o comando `docker compose down -v`.

## Exercício 6: Verificar Logs dos Containers

Utilize o comando `docker compose logs -f` para visualizar os logs de todos os containers em tempo real. Isso é útil para depuração e para garantir que os serviços estão funcionando corretamente.

## Exercício 7: Acessar o Container da Aplicação

Utilize o comando `docker compose exec <nome_do_servico> sh` para acessar o container da aplicação. Substitua `<nome_do_servico>` pelo nome do serviço definido no arquivo `docker-compose.yml`. Isso permite que você execute comandos diretamente dentro do container da aplicação.

## Exercício 8: Verifique se tem acesso a API

Acesse a API através do navegador ou utilizando uma ferramenta como o `curl` ou o Postman. O endereço da API será `http://localhost:3333`. Certifique-se de que a API está respondendo corretamente às requisições. Por exemplo, você pode testar o endpoint principal com o seguinte comando:

```bash
curl http://localhost:3333
```

## Exercício 9: Verifique se tem acesso ao swagger

Acesse o Swagger através do navegador utilizando o endereço `http://localhost:3333/swagger`. Certifique-se de que a documentação da API está sendo exibida corretamente e se funciona.

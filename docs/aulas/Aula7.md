# Conteinerização com Docker e Docker Compose

## Fundamentos do Docker

1. O Problema Histórico: "Na minha máquina funciona!"

Antes dos containers, a implantação de software enfrentava o Dilema da Matriz de Matérias-Primas:

- Diferença de Ambientes: O desenvolvedor usava macOS com PostgreSQL 16; o servidor de homologação rodava Ubuntu com PostgreSQL 14; o servidor de produção estava no Debian.
- Conflitos de Dependências: Projeto A precisava da versão X de uma biblioteca do sistema, enquanto o Projeto B exigia a versão Y na mesma máquina.
- Instalação Suja: Desenvolvedores gastavam dias configurando variáveis de ambiente, portas e serviços nativos no sistema operacional para conseguir rodar o projeto localmente.

2. A Solução: Virtualização Tradicional vs. Conteinerização

O que é Docker?

Docker é uma plataforma de código aberto, cuja a utilização é a virtualização em nível de sistema operacional para criar e gerenciar contêineres.

Para entender o Docker, precisamos entender a diferença entre Máquinas Virtuais (VMs) e Containers:

```txt

  ┌─────────────────────────────┐      ┌─────────────────────────┐
  │   App A     │    App B      │      │   App A   │    App B    │
  ├─────────────┼───────────────┤      ├───────────┼─────────────┤
  │ OS Guest    │    OS Guest   │      │ Bin/Libs  │  Bin/Libs   │
  ├─────────────────────────────┤      ├───────────┴─────────────┤
  │ Hypervisor (Ex: VirtualBox) │      │      Docker Engine      │
  ├─────────────────────────────┤      ├─────────────────────────┤
  │    OS Host (Seu Computador) │      │ OS Host (Seu Computador)│
  └─────────────────────────────┘      └─────────────────────────┘
        (Máquinas Virtuais)                     (Containers)

```

[Imagem do Docker x Vms](docs/images/docker-image.jpeg)

- Máquinas Virtuais (VMs): Emulam um hardware completo. Cada VM precisa de um Sistema Operacional completo (OS Guest) rodando em cima do Hypervisor (software que cria, gerencia e executa máquinas virtuais). Isso gera um consumo pesado de RAM, disco e boot demorado (minutos).

- Containers (Docker): Não emulam hardware nem sobem um novo SO. Eles compartilham o Kernel do SO Host e isolam apenas os processos, arquivos e redes usando recursos nativos do Linux Kernel (Namespaces para isolamento e Cgroups para limitação de memória/CPU). O boot leva milisegundos e o consumo de recursos é mínimo.

1. A Analogia do Transporte Marítimo

"Antes de 1956, o transporte de mercadorias em navios era um caos: sacos de grãos, caixas de madeira e barris precisavam ser acomodados individualmente. Malcom McLean inventou o Container padronizado. Não importava o que havia dentro (bananas, carros, eletrônicos), o container tinha o mesmo formato e cabia em qualquer navio, trem ou caminhão.

O Docker fez exatamente isso com o software: não importa se sua aplicação usa Node.js, Python, Rust ou PostgreSQL, ele empacota tudo em uma unidade padrão que roda em qualquer lugar."

4. Os 4 Pilares da Arquitetura Docker

- Imagem (Image): É um modelo imutável (somente leitura) que contém o código, runtime, bibliotecas e configurações. Funciona como a "Classe" na Orientação a Objetos.

- Container: É a instância em execução de uma Imagem. Funciona como o "Objeto" instanciado na memória.

- Volume: Como containers são efêmeros (se destruídos, os dados somem), os Volumes redirecionam dados do container para uma pasta no sistema hospedeiro, garantindo persistência.

- Network: Cria redes virtuais isoladas para que os containers conversem entre si sem expor portas desnecessárias para fora.

### 🐳 Comandos Fundamentais do Docker (CLI)

1. Gestão de Containers

```bash

# Listar todos os containers em execução
docker ps

# Listar todos os containers (inclusive os parados)
docker ps -a

# Iniciar um container parado
docker start <container_id>

# Parar um container em execução
docker stop <container_id>

# Remover um container
docker rm <container_id>

# Forçar a remoção de um container em execução
docker rm -f <container_id>

# Executar um comando dentro de um container em execução
docker exec -it <container_id> <command>

# Abrir um shell interativo dentro de um container em execução
docker exec -it <container_id> sh

# Acompanhar os logs de um container em tempo real
docker logs -f <container_id>

```

2. Gestão de Imagens

```bash

# Listar todas as imagens disponíveis localmente
docker images

# Baixar uma imagem do Docker Hub
docker pull <image_name>:<tag>

# Remover uma imagem local
docker rmi <image_name>:<tag>

# Construir uma imagem a partir do Dockerfile no diretório atual
docker build -t nome-da-sua-api .

```

3. Gestão de Volumes

```bash

# Listar todos os volumes
docker volume ls

# Criar um volume
docker volume create <volume_name>

# Remover um volume
docker volume rm <volume_name>

```

4. Gestão de Redes

```bash

# Listar todas as redes
docker network ls

# Criar uma rede
docker network create <network_name>

# Remover uma rede
docker network rm <network_name>

```

5. Limpeza do Ambiente

```bash

# Remover todos os containers parados
docker container prune -f

# Remover todas as imagens não utilizadas
docker image prune -a -f

# Remover todos os volumes não utilizados
docker volume prune -f

# Remover todas as redes não utilizadas
docker network prune -f

# Remover todos os recursos não utilizados (containers, imagens, volumes e redes)
docker system prune -a -f

```

## A Importância do Docker Compose

Subir um único container via terminal exige um comando gigante e difícil de memorizar:

```bash

# ❌ Difícil de manter, documentar e repetir na equipe:
docker run --name pokemanager_postgres -e POSTGRES_USER=pokemanager -e POSTGRES_PASSWORD=pokepassword -e POSTGRES_DB=pokemanager_db -p 5432:5432 -v postgres_data:/var/lib/postgresql/data -d postgres:16-alpine

```

Imagine subir vários containers ou subir containers em diferentes ambientes. Manter todos esses comandos consistentes e reproduzíveis se torna rapidamente um pesadelo.

### O que é o Docker Compose?

O Docker Compose é uma ferramenta de Infraestrutura como Código (IaC). Ele permite definir múltiplos containers, redes e volumes em um único arquivo declarativo (docker-compose.yml). Necessário para orquestração da sua aplicação de forma consistente e reproduzível.

Vantagens Globais:

- Documentação Viva: O arquivo docker-compose.yml serve como especificação exata de qual banco de dados e ferramentas a aplicação precisa.

- Reprodutibilidade: Com um simples comando (docker compose up -d), qualquer novo membro da equipe sobe todo o ecossistema de desenvolvimento em segundos.

- Comunicação por Nome de Serviço: Containers na mesma rede se comunicam diretamente pelo nome do serviço (ex: postgres:5432), sem precisar saber o IP da máquina.

### Comandos Fundamentais do Docker Compose

(Execute estes comandos no diretório onde está localizado o arquivo docker-compose.yml)

1. Ciclo de Vida da Aplicação

```bash

# Subir todos os serviços definidos no docker-compose.yml
docker compose up -d

# Subir todos os serviços definidos no docker-compose.yml, reconstruindo as imagens se necessário (No caso de Dockerfile alterado)
docker compose up -d --build

# Parar todos os serviços
docker compose down

# Parar todos os serviços e remover volumes associados
docker compose down -v

# Reiniciar todos os serviços
docker compose restart

```

2. Monitoramento e Execução

```bash

# Listar todos os serviços em execução
docker compose ps

# Visualizar logs de todos os serviços
docker compose logs -f

# Visualizar logs de um serviço específico
docker compose logs -f <service_name>

# Executar um comando em um serviço específico
docker compose exec <service_name> <command>

```

## Configurando o Ambiente

### Precisamos ajustar o build para garantir que os aliases do TypeScript sejam resolvidos corretamente no ambiente de produção. Isso é feito utilizando o `tsc-alias` após a compilação do TypeScript

- Instale o tsc-alias:

```bash

npm install tsc-alias --save-dev

```

- Altere o script build no package.json:

```json

{
  "scripts": {
    "build": "npm run swagger && tsc && tsc-alias"
  }
}

```

### Criando o Dockerfile da API

Na raiz do seu projeto, crie o arquivo Dockerfile. Utilizaremos o padrão Multi-stage Build (compilação em etapas) para gerar uma imagem leve e segura para execução:

```Dockerfile

# ==========================================
# Estágio 1: Build (Compilação do TypeScript)
# ==========================================
FROM node:26-alpine AS builder

WORKDIR /usr/src/app

# Copia os arquivos de dependências
COPY package*.json ./

# Instala todas as dependências (incluindo devDependencies para compilar)
RUN npm ci

# Copia o código-fonte e configurações
COPY . .

# Gera os arquivos compilados em JavaScript na pasta /dist
RUN npm run build

# ==========================================
# Estágio 2: Runner (Ambiente de Execução)
# ==========================================
FROM node:26-alpine AS runner

WORKDIR /usr/src/app

ENV NODE_ENV=production

# Copia apenas os arquivos de manifesto de pacotes
COPY package*.json ./

# Instala APENAS as dependências de produção para reduzir o tamanho da imagem
RUN npm ci --only=production

# Copia a pasta /dist gerada no estágio de build
COPY --from=builder /usr/src/app/dist ./dist

# Expõe a porta onde o Express escuta
EXPOSE 3333

# Comando para subir o servidor em produção
CMD ["node", "dist/main/server.js"]

```

O tsc não copia arquivos não-TypeScript. Então o swagger-output.json do swagger-autogen não vai para a pasta build/. Para garantir que ele esteja disponível no ambiente de produção, precisamos copiá-lo manualmente para a pasta /dist durante o build, como mostrado no Dockerfile. Por exemplo, você pode adicionar a seguinte linha no Dockerfile após o comando `RUN npm run build`:

```Dockerfile
# Copia o swagger-output.json para a pasta /dist
COPY swagger-output.json ./dist/swagger-output.json
```

### Criando as Variáveis de Ambiente (.env.example)

```env

PORT=3333
NODE_ENV=development

# Credenciais do Banco de Dados PostgreSQL
POSTGRES_USER=pokemanager
POSTGRES_PASSWORD=pokepassword
POSTGRES_DB=pokemanager_db
POSTGRES_PORT=5432

# URL do Banco (Usada pelo Prisma no Módulo 2)
DATABASE_URL="postgresql://pokemanager:pokepassword@localhost:5432/pokemanager_db?schema=public"

```

### Criando o .dockerignore

Crie o arquivo .dockerignore na raiz para impedir que arquivos locais desnecessários sejam copiados para dentro do container durante o build:

```dockerignore

node_modules
dist
.env
npm-debug.log
Dockerfile
docker-compose.yml
.git
.gitignore

```

### Orquestrando Tudo no docker-compose.yml

```yml

version: '3.8'

services:
  # Serviço 1: A Nossa Manager API (Node.js + TS)
  api:

  # Serviço 2: Banco de Dados PostgreSQL
  postgres:

  # Serviço 3: Interface de Gerenciamento pgAdmin 4
  pgadmin:

# Declarando a persistência de dados para o Banco e pgAdmin
volumes:
  postgres_data:
    driver: local
  pgadmin_data:
    driver: local

# Rede interna privada para comunicação entre os containers
networks:
  manager_network:
    driver: bridge

```

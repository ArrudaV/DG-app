# 📚 Documentação Completa - DG App

## 📋 Índice

1. [Visão Geral do Projeto](#-visão-geral-do-projeto)
2. [Arquitetura e Estrutura](#-arquitetura-e-estrutura)
3. [Tecnologias Utilizadas](#-tecnologias-utilizadas)
4. [Funcionalidades Implementadas](#-funcionalidades-implementadas)
5. [Estrutura de Arquivos](#-estrutura-de-arquivos)
6. [Configuração e Deploy](#-configuração-e-deploy)
7. [Segurança](#-segurança)
8. [Infraestrutura AWS](#-infraestrutura-aws)
9. [API e Endpoints](#-api-e-endpoints)
10. [Banco de Dados](#-banco-de-dados)

---

## 🎯 Visão Geral do Projeto

O **DG App** é um sistema completo de gestão de contratos desenvolvido como trabalho de conclusão de curso. O sistema permite que funcionários gerenciem clientes e contratos, enquanto os clientes podem visualizar seus próprios contratos e baixar arquivos relacionados.

### ✨ Características Principais

- 🔐 **Autenticação JWT** com roles (funcionário/cliente)
- 🛡️ **Criptografia AES-256-GCM** para arquivos de contratos
- 📱 **Interface completamente responsiva** (mobile-first)
- 🎨 **Design moderno** com animações suaves
- 📊 **Dashboard com estatísticas** em tempo real
- 🔍 **Busca avançada** em todas as seções
- 📄 **Upload de arquivos** (PDF, imagens) com validação
- 📈 **Relatórios e histórico** de atividades
- ☁️ **Deploy na AWS** com arquitetura cloud-native

---

## 🏗️ Arquitetura e Estrutura

### Arquitetura Geral

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Database      │
│   (HTML/CSS/JS) │◄──►│   (Node.js)     │◄──►│   (MySQL)       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   CloudFront    │    │   ECS Fargate   │    │   RDS MySQL     │
│   (CDN/HTTPS)   │    │   (Containers)  │    │   (Managed DB)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Padrões Arquiteturais

- **MVC (Model-View-Controller)**: Separação clara entre lógica de negócio, apresentação e dados
- **RESTful API**: Endpoints padronizados seguindo convenções REST
- **Microserviços**: Estrutura modular com responsabilidades bem definidas
- **Containerização**: Docker para isolamento e portabilidade
- **Cloud-Native**: Arquitetura otimizada para nuvem

---

## 🛠️ Tecnologias Utilizadas

### Backend

| Tecnologia | Versão | Função |
|------------|--------|--------|
| **Node.js** | 18+ | Runtime JavaScript |
| **TypeScript** | 5.9.2 | Linguagem tipada |
| **Express.js** | 5.1.0 | Framework web |
| **Prisma** | 6.15.0 | ORM para banco de dados |
| **MySQL** | 8.0 | Banco de dados relacional |
| **JWT** | 9.0.2 | Autenticação |
| **bcrypt** | 6.0.0 | Criptografia de senhas |
| **Multer** | 2.0.2 | Upload de arquivos |
| **Winston** | 3.17.0 | Sistema de logs |
| **Zod** | 4.1.5 | Validação de dados |

### Frontend

| Tecnologia | Função |
|------------|--------|
| **HTML5** | Estrutura semântica |
| **CSS3** | Estilização moderna com variáveis CSS |
| **JavaScript ES6+** | Lógica da interface |
| **Font Awesome** | Ícones |
| **Responsive Design** | Mobile-first |

### Infraestrutura

| Serviço AWS | Função |
|-------------|--------|
| **ECS Fargate** | Containerização serverless |
| **Application Load Balancer** | Distribuição de tráfego |
| **CloudFront** | CDN global + HTTPS |
| **RDS MySQL** | Banco de dados gerenciado |
| **EFS** | Armazenamento de arquivos |
| **Secrets Manager** | Gerenciamento de credenciais |
| **VPC** | Rede isolada e segura |

---

## 🚀 Funcionalidades Implementadas

### 👨‍💼 Para Funcionários

#### Dashboard
- ✅ Estatísticas gerais do sistema
- ✅ Contratos expirando em 30 dias
- ✅ Gráficos de performance
- ✅ Acesso rápido às principais funcionalidades

#### Gestão de Clientes
- ✅ **CRUD completo** de clientes
- ✅ **Busca avançada** por nome
- ✅ **Visualização de estatísticas** por cliente
- ✅ **Histórico de contratos** por cliente

#### Gestão de Contratos
- ✅ **CRUD completo** de contratos
- ✅ **Upload de arquivos** (PDF, imagens)
- ✅ **Status automático** (ativo/expirado)
- ✅ **Busca e filtros** avançados
- ✅ **Data de expiração** opcional

#### Relatórios
- ✅ **Histórico de atividades** detalhado
- ✅ **Estatísticas de uso** do sistema
- ✅ **Relatórios de performance**

### 👤 Para Clientes

#### Dashboard Pessoal
- ✅ **Estatísticas pessoais** (total de contratos, ativos, expirando)
- ✅ **Valor total** dos contratos
- ✅ **Interface simplificada** e intuitiva

#### Visualização de Contratos
- ✅ **Lista de contratos** pessoais
- ✅ **Download de arquivos** criptografados
- ✅ **Filtros por status**
- ✅ **Busca por nome** do contrato

---

## 📁 Estrutura de Arquivos

```
dg-app/
├── 📁 src/                          # Código fonte TypeScript
│   ├── 📄 index.ts                  # Servidor principal
│   ├── 📁 lib/                      # Bibliotecas e utilitários
│   │   ├── 📄 fileEncryption.ts     # Criptografia de arquivos
│   │   ├── 📄 logger.ts             # Sistema de logs
│   │   └── 📄 prisma.ts             # Cliente Prisma
│   ├── 📁 middlewares/              # Middlewares Express
│   │   ├── 📄 auth.ts               # Autenticação JWT
│   │   └── 📄 errorHandler.ts       # Tratamento de erros
│   ├── 📁 routes/                   # Rotas da API
│   │   ├── 📄 auth.ts               # Autenticação
│   │   ├── 📄 clients.ts            # Gestão de clientes
│   │   ├── 📄 contracts.ts          # Gestão de contratos
│   │   ├── 📄 dashboard.ts          # Dashboard
│   │   └── 📄 reports.ts            # Relatórios
│   ├── 📁 services/                 # Serviços de negócio
│   │   ├── 📄 activityLogger.ts     # Log de atividades
│   │   └── 📄 contractStatusService.ts # Status de contratos
│   └── 📁 scripts/                  # Scripts utilitários
│       └── 📄 migrateFiles.ts       # Migração de arquivos
├── 📁 public/                       # Frontend
│   ├── 📄 index.html                # Interface principal
│   ├── 📄 script.js                 # Lógica JavaScript
│   ├── 📄 styles.css                # Estilos CSS
│   ├── 📄 home.html                 # Página inicial
│   ├── 📄 sobre.html                # Página sobre
│   └── 📁 img/                      # Imagens
├── 📁 prisma/                       # Schema e migrações
│   ├── 📄 schema.prisma             # Schema do banco
│   └── 📁 migrations/               # Migrações do banco
├── 📁 uploads/                      # Arquivos uploadados
├── 📁 logs/                         # Logs da aplicação
├── 📁 dist/                         # Código compilado
├── 📁 generated/                    # Cliente Prisma gerado
├── 📄 package.json                  # Dependências e scripts
├── 📄 tsconfig.json                 # Configuração TypeScript
├── 📄 Dockerfile                    # Configuração Docker
├── 📄 deploy.ps1                    # Script de deploy
└── 📄 README.md                     # Documentação principal
```

### Descrição dos Diretórios

#### `/src` - Código Fonte
- **`index.ts`**: Ponto de entrada da aplicação, configuração do servidor Express
- **`lib/`**: Bibliotecas utilitárias (criptografia, logs, Prisma)
- **`middlewares/`**: Middlewares do Express (autenticação, tratamento de erros)
- **`routes/`**: Definição das rotas da API REST
- **`services/`**: Lógica de negócio e serviços auxiliares
- **`scripts/`**: Scripts utilitários para manutenção

#### `/public` - Frontend
- **`index.html`**: Interface principal do sistema
- **`script.js`**: Lógica JavaScript do frontend
- **`styles.css`**: Estilos CSS responsivos
- **`home.html`**: Página inicial
- **`sobre.html`**: Página sobre o projeto

#### `/prisma` - Banco de Dados
- **`schema.prisma`**: Schema do banco de dados
- **`migrations/`**: Histórico de migrações do banco

#### `/uploads` - Arquivos
- Armazenamento de arquivos criptografados dos contratos

#### `/logs` - Logs
- Logs de aplicação (combined.log, error.log)

---

## ⚙️ Configuração e Deploy

### Variáveis de Ambiente

```env
# Banco de Dados
DATABASE_URL="mysql://usuario:senha@localhost:3306/dg_contracts"

# Autenticação
JWT_SECRET="sua_chave_secreta_jwt_muito_segura_aqui_123456789"

# Servidor
PORT=3000
NODE_ENV=development
HOST=0.0.0.0

# Upload de Arquivos
MAX_FILE_SIZE=10485760

# Criptografia de Arquivos
FILE_ENCRYPTION_PASSWORD="sua_senha_de_criptografia_muito_segura_aqui_mude_em_producao_123456789"

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_AUTH_MAX_REQUESTS=5

# Frontend
FRONTEND_URL=http://localhost:3000
```

### Scripts Disponíveis

```bash
# Desenvolvimento
npm run dev          # Inicia servidor de desenvolvimento

# Produção
npm run build        # Compila TypeScript para JavaScript
npm start           # Inicia servidor de produção

# Banco de Dados
npx prisma migrate dev    # Executa migrações em desenvolvimento
npx prisma migrate deploy # Executa migrações em produção
npx prisma generate       # Gera cliente Prisma
npx prisma studio         # Interface visual do banco

# Docker
npm run docker:build     # Build da imagem Docker
npm run docker:run       # Executa com docker-compose
npm run docker:stop      # Para containers
npm run docker:logs      # Visualiza logs

# Deploy AWS
npm run deploy:aws       # Deploy automático para AWS
```

---

## 🔒 Segurança

### Criptografia de Arquivos
- **Algoritmo**: AES-256-GCM (Galois/Counter Mode)
- **Chave**: Derivada da senha usando PBKDF2 com 100.000 iterações
- **Salt**: 16 bytes aleatórios por arquivo
- **IV**: 16 bytes aleatórios por arquivo
- **Tag de Autenticação**: 16 bytes para verificar integridade

### Autenticação
- **JWT Tokens** com expiração configurável
- **Senhas criptografadas** com bcrypt
- **Rate limiting** para proteção contra ataques
- **CORS** configurado adequadamente

### Validação
- **Sanitização** de todas as entradas
- **Validação de tipos** de arquivo
- **Limites de tamanho** de arquivo
- **Verificação de roles** para acesso

### Segurança na AWS
- **HTTPS obrigatório** (CloudFront)
- **VPC isolada** com subnets públicas/privadas
- **Security Groups** restritivos
- **Secrets Manager** para credenciais
- **Criptografia** em repouso e trânsito

---

## ☁️ Infraestrutura AWS

### Arquitetura Cloud-Native

```
Internet → CloudFront → ALB → ECS Fargate → RDS MySQL
                    ↓
                 EFS (Storage)
```

### Componentes da Infraestrutura

| Serviço | Função | Status | Configuração |
|---------|--------|--------|--------------|
| **ECS Fargate** | Aplicação containerizada | ✅ Ativo | 512 CPU, 1GB RAM |
| **ALB** | Load Balancer | ✅ Ativo | Internet-facing |
| **CloudFront** | CDN + HTTPS | ✅ Ativo | Global distribution |
| **RDS MySQL** | Banco de dados | ✅ Ativo | db.t3.micro |
| **EFS** | Armazenamento de arquivos | ✅ Ativo | Criptografado |
| **Secrets Manager** | Credenciais seguras | ✅ Ativo | 3 secrets |
| **VPC** | Rede isolada | ✅ Ativo | 2 AZs |

### URLs de Acesso

- **Produção (HTTPS):** `https://d2zuijdq7u12s1.cloudfront.net/`
- **Backup (HTTP):** `http://dg-alb-175722117.us-east-1.elb.amazonaws.com/`

### Custos Estimados

**Custo mensal aproximado: $45-50 USD**

| Serviço | Custo/Mês |
|---------|-----------|
| ECS Fargate | $15-20 |
| ALB | $16 |
| RDS MySQL | $13 |
| EFS | $0.30 |
| CloudFront | $0.085 |
| Secrets Manager | $0.40 |
| **Total** | **~$45-50** |

### Deploy Automático

```bash
# Build e Deploy
npm run build
docker build -t dg-app .
docker tag dg-app:latest 570322735022.dkr.ecr.us-east-1.amazonaws.com/dg-app:latest
docker push 570322735022.dkr.ecr.us-east-1.amazonaws.com/dg-app:latest
aws ecs update-service --cluster dg-cluster --service dg-service --force-new-deployment
```

---

## 🔌 API e Endpoints

### Autenticação
```http
POST /auth/employee/login      # Login de funcionário
POST /auth/client/login        # Login de cliente
POST /auth/employee/register   # Cadastro de funcionário
```

### Clientes
```http
GET    /clients           # Listar clientes (funcionários)
GET    /clients/:id       # Obter cliente específico
POST   /clients           # Criar cliente
PUT    /clients/:id       # Atualizar cliente
DELETE /clients/:id       # Excluir cliente
```

### Contratos
```http
GET    /contracts         # Listar contratos (funcionários)
GET    /contracts/my      # Listar contratos do cliente
GET    /contracts/:id     # Obter contrato específico
POST   /contracts         # Criar contrato
PUT    /contracts/:id     # Atualizar contrato
DELETE /contracts/:id     # Excluir contrato
```

### Upload
```http
POST   /upload            # Upload de arquivo de contrato
GET    /uploads/:filename # Download de arquivo (descriptografado)
```

### Dashboard
```http
GET    /dashboard         # Estatísticas do dashboard
```

### Relatórios
```http
GET    /reports/statistics # Estatísticas gerais
GET    /reports/activities # Histórico de atividades
```

### Health Checks
```http
GET    /status            # Health check para ALB
GET    /health            # Health check alternativo
GET    /ping              # Ping endpoint
```

---

## 🗄️ Banco de Dados

### Schema Principal

```prisma
model Employee {
  id            Int           @id @default(autoincrement())
  name          String
  email         String        @unique
  password      String
  role          String        @default("EMPLOYEE")
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt
  clients       Client[]
  contracts     Contract[]
}

model Client {
  id            Int           @id @default(autoincrement())
  name          String
  email         String        @unique
  password      String
  createdById   Int
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt
  createdBy     Employee      @relation(fields: [createdById], references: [id])
  contracts     Contract[]
}

model Contract {
  id            Int       @id @default(autoincrement())
  name          String
  description   String?
  status        ContractStatus @default(DRAFT)
  value         Float
  expirationDate DateTime?
  autoStatus    Boolean   @default(true)
  fileUrl       String?
  fileName      String?
  fileType      String?
  employeeId    Int
  clientId      Int
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  employee      Employee  @relation(fields: [employeeId], references: [id])
  client        Client    @relation(fields: [clientId], references: [id])
}

enum ContractStatus {
  DRAFT
  ACTIVE
  EXPIRING
  EXPIRED
}

model ActivityLog {
  id          Int           @id @default(autoincrement())
  action      String        // CREATE, UPDATE, DELETE, LOGIN, LOGOUT
  entityType  String        // EMPLOYEE, CLIENT, CONTRACT
  entityId    Int?          // ID da entidade afetada
  description String        // Descrição detalhada da ação
  userId      Int           // ID do usuário que executou a ação
  userRole    String        // EMPLOYEE ou CLIENT
  userEmail   String        // Email do usuário
  createdAt   DateTime      @default(now())
}
```

### Relacionamentos

- **Employee** → **Client** (1:N) - Um funcionário pode criar vários clientes
- **Employee** → **Contract** (1:N) - Um funcionário pode criar vários contratos
- **Client** → **Contract** (1:N) - Um cliente pode ter vários contratos
- **ActivityLog** - Log de todas as atividades do sistema

### Migrações

O sistema possui migração automática que:
1. Verifica se o schema está correto
2. Recria tabelas se necessário
3. Executa migrações do Prisma
4. Garante integridade dos dados

---

## 📊 Monitoramento e Logs

### CloudWatch Logs
- **Log Group:** `/ecs/dg-app`
- **Log Stream:** `dg/dg-app/{task-id}`
- **Região:** `us-east-1`

### Health Checks
- **ALB:** `/status` (porta 3000)
- **ECS:** `curl -f http://localhost:3000/status`

### Métricas
- **CPU Utilization** do ECS
- **Memory Utilization** do ECS
- **Response Time** do ALB
- **Request Count** por endpoint

---

## 🎯 Status do Projeto

- ✅ **Desenvolvimento:** Concluído
- ✅ **Deploy AWS:** Ativo em produção
- ✅ **Testes:** Funcionando 100%
- ✅ **Documentação:** Completa

---

**Desenvolvido com ❤️ para gestão eficiente de contratos**

**Projeto:** DG App - Sistema de Gestão de Contratos  
**Arquitetura:** AWS Cloud Native  
**Status:** Produção ✅  
**Última atualização:** 15 de Setembro de 2025

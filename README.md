# 🏢 DG App - Sistema de Gestão de Contratos

Sistema completo de gestão de contratos com interface responsiva, autenticação segura e criptografia de arquivos. Deployado na AWS com arquitetura cloud-native.

## 📋 Índice

- [Visão Geral](#-visão-geral)
- [Funcionalidades](#-funcionalidades)
- [Tecnologias](#-tecnologias)
- [Infraestrutura AWS](#-infraestrutura-aws)
- [Instalação](#-instalação)
- [Configuração](#-configuração)
- [Uso](#-uso)
- [API](#-api)
- [Segurança](#-segurança)
- [Responsividade](#-responsividade)
- [Estrutura do Projeto](#-estrutura-do-projeto)
- [Scripts](#-scripts)
- [Deploy AWS](#-deploy-aws)
- [Contribuição](#-contribuição)

## 🎯 Visão Geral

O DG App é um sistema web completo para gestão de contratos, desenvolvido com foco em segurança, usabilidade e responsividade. O sistema permite que funcionários gerenciem clientes e contratos, enquanto os clientes podem visualizar seus próprios contratos e baixar arquivos relacionados. Deployado na AWS com arquitetura cloud-native para alta disponibilidade e escalabilidade.

### ✨ Principais Características

- 🔐 **Autenticação JWT** com roles (funcionário/cliente)
- 🛡️ **Criptografia AES-256-GCM** para arquivos de contratos
- 📱 **Interface completamente responsiva** (mobile-first)
- 🎨 **Design moderno** com animações suaves
- 📊 **Dashboard com estatísticas** em tempo real
- 🔍 **Busca avançada** em todas as seções
- 📄 **Upload de arquivos** (PDF, imagens) com validação
- 📈 **Relatórios e histórico** de atividades
- ☁️ **Deploy na AWS** com arquitetura cloud-native
- 🚀 **Alta disponibilidade** e escalabilidade automática
- 🔒 **Segurança enterprise** com HTTPS e isolamento de rede

## 🚀 Funcionalidades

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

## 🛠️ Tecnologias

### Backend
- **Node.js** - Runtime JavaScript
- **Express.js** - Framework web
- **TypeScript** - Linguagem tipada
- **Prisma** - ORM para banco de dados
- **MySQL** - Banco de dados relacional
- **JWT** - Autenticação
- **bcrypt** - Criptografia de senhas
- **Multer** - Upload de arquivos
- **Winston** - Sistema de logs

### Frontend
- **HTML5** - Estrutura semântica
- **CSS3** - Estilização moderna com variáveis CSS
- **JavaScript ES6+** - Lógica da interface
- **Font Awesome** - Ícones
- **Responsive Design** - Mobile-first

### Segurança
- **AES-256-GCM** - Criptografia de arquivos
- **PBKDF2** - Derivação de chaves
- **Rate Limiting** - Proteção contra ataques
- **CORS** - Controle de acesso
- **Validação de entrada** - Sanitização de dados

### Infraestrutura AWS
- **ECS Fargate** - Containerização serverless
- **Application Load Balancer** - Distribuição de tráfego
- **CloudFront** - CDN global + HTTPS
- **RDS MySQL** - Banco de dados gerenciado
- **EFS** - Armazenamento de arquivos
- **Secrets Manager** - Gerenciamento de credenciais
- **VPC** - Rede isolada e segura

## ☁️ Infraestrutura AWS

O DG App está deployado na AWS com uma arquitetura cloud-native moderna e escalável:

### 🏗️ Arquitetura

```
Internet → CloudFront → ALB → ECS Fargate → RDS MySQL
                    ↓
                 EFS (Storage)
```

### 🔧 Componentes

| Serviço | Função | Status |
|---------|--------|--------|
| **ECS Fargate** | Aplicação containerizada | ✅ Ativo |
| **ALB** | Load Balancer | ✅ Ativo |
| **CloudFront** | CDN + HTTPS | ✅ Ativo |
| **RDS MySQL** | Banco de dados | ✅ Ativo |
| **EFS** | Armazenamento de arquivos | ✅ Ativo |
| **Secrets Manager** | Credenciais seguras | ✅ Ativo |
| **VPC** | Rede isolada | ✅ Ativo |

### 🌐 URLs de Acesso

- **Produção (HTTPS):** `https://d2zuijdq7u12s1.cloudfront.net/`
- **Backup (HTTP):** `http://dg-alb-175722117.us-east-1.elb.amazonaws.com/`

### 💰 Custos

**Estimativa mensal: $45-50 USD**
- ECS Fargate: $15-20
- ALB: $16
- RDS MySQL: $13
- EFS: $0.30
- CloudFront: $0.085
- Secrets Manager: $0.40

### 🔒 Segurança

- ✅ **HTTPS obrigatório** (CloudFront)
- ✅ **VPC isolada** com subnets públicas/privadas
- ✅ **Security Groups** restritivos
- ✅ **Secrets Manager** para credenciais
- ✅ **Criptografia** em repouso e trânsito
- ✅ **Rate Limiting** nas APIs

### 📊 Monitoramento

- **CloudWatch Logs:** `/ecs/dg-app`
- **Health Checks:** `/status`
- **Métricas automáticas** de performance

Para mais detalhes, consulte:
- [📋 Resumo da Infraestrutura](RESUMO_INFRAESTRUTURA.md)
- [🏗️ Documentação Completa](INFRAESTRUTURA_AWS.md)
- [🛠️ Comandos AWS](COMANDOS_AWS.md)

## 📦 Instalação

### Pré-requisitos
- Node.js 18+ 
- MySQL 8.0+
- npm ou yarn

### 1. Clone o repositório
```bash
git clone <url-do-repositorio>
cd dg-app
```

### 2. Instale as dependências
```bash
npm install
```

### 3. Configure o banco de dados
```bash
# Configure a variável DATABASE_URL no arquivo .env
# Exemplo: DATABASE_URL="mysql://usuario:senha@localhost:3306/dg_contracts"

# Execute as migrações
npx prisma migrate dev

# Gere o cliente Prisma
npx prisma generate
```

### 4. Execute a aplicação
```bash
# Desenvolvimento
npm run dev

# Produção
npm run build
npm start
```

O sistema estará disponível em: `http://localhost:3000`

## ⚙️ Configuração

### Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
# Banco de Dados
DATABASE_URL="mysql://usuario:senha@localhost:3306/dg_contracts"

# Autenticação
JWT_SECRET="sua_chave_secreta_jwt_muito_segura_aqui_123456789"

# Servidor
PORT=3000
NODE_ENV=development

# Upload de Arquivos
MAX_FILE_SIZE=10485760

# Criptografia de Arquivos
FILE_ENCRYPTION_PASSWORD="sua_senha_de_criptografia_muito_segura_aqui_mude_em_producao_123456789"

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_AUTH_MAX_REQUESTS=5
```

### Configuração do Banco de Dados

O sistema usa Prisma como ORM. O schema está em `prisma/schema.prisma`:

```prisma
model Employee {
  id        Int      @id @default(autoincrement())
  name      String
  email     String   @unique
  password  String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Client {
  id        Int      @id @default(autoincrement())
  name      String
  email     String   @unique
  password  String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  createdById Int
  createdBy   Employee @relation(fields: [createdById], references: [id])
  contracts   Contract[]
}

model Contract {
  id          Int      @id @default(autoincrement())
  name        String
  description String?
  value       Float?
  status      String   @default("ACTIVE")
  fileUrl     String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  clientId    Int
  client      Client   @relation(fields: [clientId], references: [id])
  createdById Int
  createdBy   Employee @relation(fields: [createdById], references: [id])
}
```

## 🎮 Uso

### Login como Funcionário
1. Acesse a interface web
2. Selecione "Funcionário" no tipo de usuário
3. Use as credenciais de um funcionário cadastrado
4. Após o login, será redirecionado automaticamente para o dashboard

### Cadastro de Funcionário
1. Acesse a interface web
2. Vá para a aba "Cadastro"
3. Preencha os dados (nome, email, senha forte)
4. Após o cadastro, será logado automaticamente e redirecionado para o dashboard

### Login como Cliente
1. Acesse a interface web
2. Selecione "Cliente" no tipo de usuário
3. Use as credenciais fornecidas pelo funcionário

### Criação de Contratos com Arquivos
1. Acesse a seção "Contratos" como funcionário
2. Clique em "Novo Contrato"
3. Preencha os dados básicos
4. Defina a data de expiração (opcional)
5. Selecione um arquivo PDF ou imagem
6. Salve o contrato

### Download de Arquivos (Clientes)
1. Faça login como cliente
2. Na lista de contratos, clique no link "📄 Baixar Contrato"
3. O arquivo será descriptografado automaticamente e aberto em uma nova aba

## 🔌 API

### Autenticação
```http
POST /auth/employee/login
POST /auth/client/login
POST /auth/employee/register
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

## 📱 Responsividade

O sistema foi desenvolvido com abordagem **mobile-first** e é completamente responsivo:

### Breakpoints
- **Mobile**: até 480px
- **Tablet**: 481px - 768px  
- **Desktop**: 769px+

### Características Responsivas
- ✅ **Sidebar adaptativa** (fixa em desktop, toggle em mobile)
- ✅ **Grid responsivo** para cards e tabelas
- ✅ **Formulários otimizados** para touch
- ✅ **Navegação intuitiva** em todos os dispositivos
- ✅ **Tipografia escalável** para legibilidade
- ✅ **Touch targets** adequados (mínimo 44px)

### Otimizações Mobile
- **Detecção de dispositivo** automática
- **Prevenção de zoom** indesejado
- **Scroll suave** e nativo
- **Gestos touch** otimizados
- **Performance** otimizada para dispositivos móveis

## 📁 Estrutura do Projeto

```
dg-app/
├── src/                          # Código fonte TypeScript
│   ├── index.ts                  # Servidor principal
│   ├── lib/                      # Bibliotecas e utilitários
│   │   ├── fileEncryption.ts     # Criptografia de arquivos
│   │   ├── logger.ts             # Sistema de logs
│   │   └── prisma.ts             # Cliente Prisma
│   ├── middlewares/              # Middlewares Express
│   │   ├── auth.ts               # Autenticação JWT
│   │   └── errorHandler.ts       # Tratamento de erros
│   ├── routes/                   # Rotas da API
│   │   ├── auth.ts               # Autenticação
│   │   ├── clients.ts            # Gestão de clientes
│   │   ├── contracts.ts          # Gestão de contratos
│   │   ├── dashboard.ts          # Dashboard
│   │   └── reports.ts            # Relatórios
│   ├── services/                 # Serviços de negócio
│   │   ├── activityLogger.ts     # Log de atividades
│   │   └── contractStatusService.ts # Status de contratos
│   └── scripts/                  # Scripts utilitários
│       └── migrateFiles.ts       # Migração de arquivos
├── public/                       # Frontend
│   ├── index.html                # Interface principal
│   ├── script.js                 # Lógica JavaScript
│   └── styles.css                # Estilos CSS
├── prisma/                       # Schema e migrações
│   ├── schema.prisma             # Schema do banco
│   └── migrations/               # Migrações do banco
├── uploads/                      # Arquivos uploadados
├── logs/                         # Logs da aplicação
├── dist/                         # Código compilado
├── generated/                    # Cliente Prisma gerado
├── package.json                  # Dependências e scripts
├── tsconfig.json                 # Configuração TypeScript
├── env.example                   # Exemplo de variáveis de ambiente
└── README.md                     # Esta documentação
```

## 📜 Scripts

### Desenvolvimento
```bash
npm run dev          # Inicia servidor de desenvolvimento
```

### Produção
```bash
npm run build        # Compila TypeScript para JavaScript
npm start           # Inicia servidor de produção
```

### Banco de Dados
```bash
npx prisma migrate dev    # Executa migrações em desenvolvimento
npx prisma migrate deploy # Executa migrações em produção
npx prisma generate       # Gera cliente Prisma
npx prisma studio         # Interface visual do banco
```

### Utilitários
```bash
npm run migrate-files     # Migra arquivos existentes para criptografia
```

## 🚀 Deploy AWS

### Deploy Automático

O sistema está configurado para deploy automático na AWS:

```bash
# Build e Deploy
npm run build
docker build -t dg-app .
docker tag dg-app:latest 570322735022.dkr.ecr.us-east-1.amazonaws.com/dg-app:latest
docker push 570322735022.dkr.ecr.us-east-1.amazonaws.com/dg-app:latest
aws ecs register-task-definition --cli-input-json file://.aws/ecs/task-definition.json
aws ecs update-service --cluster dg-cluster --service dg-service --force-new-deployment
```

### Verificação de Status

```bash
# Status do ECS
aws ecs describe-services --cluster dg-cluster --services dg-service

# Health dos targets
aws ecs list-tasks --cluster dg-cluster --service-name dg-service

# Logs da aplicação
aws logs get-log-events --log-group-name "/ecs/dg-app" --log-stream-name "dg/dg-app/{task-id}"
```

### Comandos Úteis

Para comandos detalhados de gerenciamento da infraestrutura AWS, consulte:
- [🛠️ Comandos AWS](COMANDOS_AWS.md)
- [🏗️ Infraestrutura Completa](INFRAESTRUTURA_AWS.md)

## 🤝 Contribuição

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

### Padrões de Código
- **Comentários**: Sempre em português
- **Funções**: Documentação JSDoc completa
- **Variáveis**: Nomes descritivos em português
- **Estrutura**: Organização por funcionalidade
- **TypeScript**: Tipagem forte obrigatória

## 📄 Licença

Este projeto está sob a licença ISC. Veja o arquivo `package.json` para mais detalhes.

## 🆘 Suporte

Para suporte e dúvidas:
- Abra uma issue no repositório
- Consulte a documentação da API
- Verifique os logs da aplicação

---

**Desenvolvido com ❤️ para gestão eficiente de contratos**

---

## 📚 Documentação Adicional

- [📋 Resumo da Infraestrutura](RESUMO_INFRAESTRUTURA.md) - Visão geral para apresentação
- [🏗️ Infraestrutura AWS Completa](INFRAESTRUTURA_AWS.md) - Documentação técnica detalhada
- [🛠️ Comandos AWS](COMANDOS_AWS.md) - Comandos práticos para gerenciamento

## 🎯 Status do Projeto

- ✅ **Desenvolvimento:** Concluído
- ✅ **Deploy AWS:** Ativo em produção
- ✅ **Testes:** Funcionando 100%
- ✅ **Documentação:** Completa
- ✅ **Pronto para:** Apresentação TCC
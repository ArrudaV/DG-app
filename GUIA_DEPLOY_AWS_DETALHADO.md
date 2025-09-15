# 🚀 Guia Detalhado de Deploy AWS - Aplicação DG

## 📋 **RESUMO DO PLANO**

Este é um guia completo para fazer o deploy da aplicação DG na AWS usando uma arquitetura moderna e escalável. O plano está dividido em 11 fases principais e vai levar aproximadamente 4-6 horas para ser executado completamente.

### **Arquitetura Final:**
- **ECS Fargate**: Para executar sua aplicação sem gerenciar servidores
- **RDS MySQL**: Banco de dados gerenciado
- **ALB**: Load balancer para distribuir tráfego
- **ECR**: Registro de imagens Docker
- **EFS**: Armazenamento de arquivos persistentes
- **VPC**: Rede privada segura

### **Custos Estimados (Mensal):**
- **ALB**: ~US$ 18-25
- **NAT Gateway**: ~US$ 30-40
- **ECS Fargate**: ~US$ 15-20 (1 task 0.5 vCPU/1GB 24x7)
- **RDS db.t3.micro**: ~US$ 12-15 + storage
- **EFS**: Baixo, conforme uso
- **Total**: ~US$ 75-110/mês

---

## ✅ **CHECKLIST DE PRÉ-REQUISITOS**

### **Conta/Acesso AWS**
- [ ] Conta AWS ativa e billing configurado
- [ ] Usuário IAM com permissões (AdministratorAccess para setup inicial)
- [ ] AWS CLI v2 configurado (`aws configure`)

### **Ferramentas Locais**
- [ ] Docker + Docker Compose
- [ ] Git + GitHub (para CI/CD)
- [ ] Node.js 18 LTS (para build local se necessário)

### **Domínio (opcional, recomendado)**
- [ ] Domínio na Route 53 ou DNS externo (com CNAME/A para o ALB)

---

## 🧱 **FASE 1: PREPARAR O PROJETO PARA CONTAINER (30-45 min)**

### **1.1 Criar Dockerfile**

Crie um arquivo `Dockerfile` na raiz do projeto:

```dockerfile
# === Builder ===
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Gerar Prisma e compilar TypeScript
RUN npx prisma generate \
 && npm run build \
 && npm prune --omit=dev

# === Runner ===
FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# Dependências nativas do Prisma
RUN apk add --no-cache openssl
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
# Porta padrão do app
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

### **1.2 Criar .dockerignore**

Crie um arquivo `.dockerignore`:

```gitignore
node_modules
.git
.env
dist
uploads
*.log
docker-compose.yml
*.pem
```

### **1.3 Definir Variáveis de Ambiente (Produção)**

Use AWS Secrets Manager/SSM para armazenar segredos:

```env
DATABASE_URL="mysql://admin:[SENHA_RDS]@[ENDPOINT_RDS]:3306/dg_contracts"
JWT_SECRET="valor-seguro"
FILE_ENCRYPTION_PASSWORD="valor-seguro"
NODE_ENV="production"
PORT=3000
FRONTEND_URL="https://seu-dominio.com"  # ou URL do ALB
MAX_FILE_SIZE=10485760
UPLOAD_PATH="/opt/dg/uploads"         # será montado via EFS
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=50
```

### **1.4 Health Check da Aplicação**

**🎯 OBJETIVO:** Criar um endpoint `/health` que retorne status 200 para o ALB verificar se a aplicação está funcionando.

**📋 PASSOS DETALHADOS:**

#### **Passo 1.4.1: Verificar se o endpoint já existe**
1. Abra o arquivo `src/index.ts` (ou onde está o servidor principal)
2. Procure por rotas existentes que possam ser um health check
3. Se já existir algo como `/health`, `/status` ou `/ping`, anote o caminho

#### **Passo 1.4.2: Criar o endpoint /health (se não existir)**
1. **Localização:** Adicione no arquivo principal do servidor (provavelmente `src/index.ts`)
2. **Código a adicionar:**
```typescript
// Adicione esta rota ANTES das outras rotas
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});
```

#### **Passo 1.4.3: Testar localmente**
1. **Inicie a aplicação localmente:**
```bash
npm run dev
# ou
npm start
```

2. **Teste o endpoint:**
```bash
# No terminal, execute:
curl http://localhost:3000/health
# ou abra no navegador: http://localhost:3000/health
```

3. **Resposta esperada:**
```json
{
  "status": "OK",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 123.456,
  "environment": "development"
}
```

#### **Passo 1.4.4: Verificar se retorna status 200**
1. **No navegador:** Abra `http://localhost:3000/health`
2. **Verifique:** 
   - Status HTTP deve ser 200 (OK)
   - Não deve haver erros no console
   - A resposta deve ser JSON válido

#### **Passo 1.4.5: Testar com diferentes cenários**
1. **Com banco de dados:** Se sua app usa banco, teste com DB conectado
2. **Sem banco:** Teste se o health check funciona mesmo se o DB estiver offline
3. **Com dependências:** Verifique se o endpoint responde rapidamente (< 5 segundos)

#### **Passo 1.4.6: Documentar o endpoint**
1. **Anote:** O endpoint `/health` está funcionando
2. **Confirme:** Retorna status 200
3. **Tempo de resposta:** Deve ser < 5 segundos (importante para o ALB)

**⚠️ IMPORTANTE:** O ALB vai usar este endpoint para verificar se sua aplicação está saudável. Se retornar qualquer coisa diferente de 200, o ALB vai considerar a aplicação como "unhealthy" e não vai rotear tráfego para ela.

**🔍 VERIFICAÇÃO FINAL:**
- [x] Endpoint `/health` criado
- [x] Retorna status 200
- [x] Resposta em JSON
- [x] Tempo de resposta < 5 segundos
- [x] Funciona com e sem banco de dados conectado

---

## 🏗️ **FASE 2: REGISTRO DE IMAGENS (ECR) (10-15 min)**

### **2.1 Criar Repositório ECR**

**🎯 OBJETIVO:** Criar um repositório privado no ECR para armazenar as imagens Docker da aplicação.

**📋 PASSOS DETALHADOS:**

#### **Passo 2.1.1: Acessar o Console AWS**
1. **Abra o navegador** e vá para: https://console.aws.amazon.com
2. **Faça login** com suas credenciais AWS
3. **Verifique a região** no canto superior direito (recomendo `us-east-1` para começar)

#### **Passo 2.1.2: Navegar para o ECR**
1. **No menu de serviços** (ícone de 3 linhas no canto superior esquerdo), digite "ECR"
2. **Clique em "Elastic Container Registry"** quando aparecer na lista
3. **Aguarde** a página carregar completamente

#### **Passo 2.1.3: Criar o Repositório**
1. **Clique no botão laranja "Create repository"** (canto superior direito)
2. **Na aba "General settings":**
   - **Repository name:** Digite exatamente `dg-app`
   - **Tag immutability:** Deixe "Mutable" (padrão)
   - **Image scanning:** Marque "Scan on push" (recomendado para segurança)
3. **Na aba "Encryption":**
   - **Encryption type:** Deixe "AES-256" (padrão)
4. **Na aba "Lifecycle policy":**
   - **Deixe vazio** por enquanto (podemos configurar depois)
5. **Clique em "Create repository"** (botão laranja no final)

#### **Passo 2.1.4: Verificar o Repositório Criado**
1. **Você deve ver** o repositório `dg-app` na lista
2. **Clique no nome** `dg-app` para abrir os detalhes
3. **Anote a URI** que aparece no topo (algo como: `123456789012.dkr.ecr.us-east-1.amazonaws.com/dg-app`)
4. **Esta URI será usada** nos próximos passos

### **2.2 Autenticar e Publicar Imagem (Local)**

**🎯 OBJETIVO:** Fazer build da imagem Docker localmente e enviar para o ECR.

**📋 PASSOS DETALHADOS:**

#### **Passo 2.2.1: Preparar o Terminal**
1. **Abra o terminal** (PowerShell no Windows, Terminal no Mac/Linux)
2. **Navegue para o diretório** do seu projeto:
```bash
cd C:\Users\arrud\Desktop\deploy-aws-final
```

#### **Passo 2.2.2: Verificar AWS CLI**
1. **Teste se AWS CLI está configurado:**
```bash
aws sts get-caller-identity
```
2. **Se der erro:** Configure com `aws configure` primeiro
3. **Anote o Account ID** que aparece (você vai precisar)

#### **Passo 2.2.3: Definir Variáveis de Ambiente**
1. **Execute estes comandos** (substitua `us-east-1` pela sua região):
```bash
AWS_REGION=us-east-1
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REPO=dg-app
ECR_URI=$ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$REPO
```

2. **Verifique se as variáveis estão corretas:**
```bash
echo "Região: $AWS_REGION"
echo "Account ID: $ACCOUNT_ID"
echo "URI do ECR: $ECR_URI"
```

#### **Passo 2.2.4: Autenticar no ECR**
1. **Execute o comando de login:**
```bash
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com
```

2. **Você deve ver:** `Login Succeeded`

#### **Passo 2.2.5: Fazer Build da Imagem**
1. **Verifique se o Dockerfile existe:**
```bash
ls -la Dockerfile
# ou no Windows:
dir Dockerfile
```

2. **Faça o build da imagem:**
```bash
docker build -t $REPO:latest .
```

3. **Aguarde** o build terminar (pode levar alguns minutos na primeira vez)

#### **Passo 2.2.6: Tag da Imagem para ECR**
1. **Crie a tag para o ECR:**
```bash
docker tag $REPO:latest $ECR_URI:latest
```

2. **Verifique se a tag foi criada:**
```bash
docker images | grep dg-app
```

#### **Passo 2.2.7: Push para o ECR**
1. **Envie a imagem para o ECR:**
```bash
docker push $ECR_URI:latest
```

2. **Aguarde** o upload terminar (pode levar alguns minutos)

#### **Passo 2.2.8: Verificar no Console AWS**
1. **Volte ao console AWS** → ECR → Repositório `dg-app`
2. **Você deve ver** a imagem `latest` listada
3. **Clique na imagem** para ver os detalhes
4. **Anote o tamanho** e outras informações

**🔍 VERIFICAÇÃO FINAL:**
- [x] Repositório ECR `dg-app` criado
- [x] Login no ECR bem-sucedido
- [x] Build da imagem Docker concluído
- [x] Imagem enviada para o ECR
- [x] Imagem visível no console AWS

**⚠️ PROBLEMAS COMUNS:**
- **Erro de permissão:** Verifique se seu usuário AWS tem permissões para ECR
- **Erro de região:** Certifique-se de que está usando a mesma região em todos os comandos
- **Build falha:** Verifique se o Dockerfile está correto e todas as dependências estão disponíveis

---

## 🌐 **FASE 3: REDE (VPC) (20-30 min)**

### **3.1 Criar VPC com 2 Availability Zones**

**🎯 OBJETIVO:** Criar uma rede privada segura com subnets públicas e privadas em 2 zonas de disponibilidade.

**📋 PASSOS DETALHADOS:**

#### **Passo 3.1.1: Acessar o Console VPC**
1. **No console AWS**, digite "VPC" no menu de serviços
2. **Clique em "VPC"** quando aparecer
3. **Aguarde** a página carregar

#### **Passo 3.1.2: Criar a VPC**
1. **Clique em "Create VPC"** (botão laranja no canto superior direito)
2. **Na seção "VPC settings":**
   - **Name tag:** Digite `dg-vpc`
   - **IPv4 CIDR block:** Digite `10.0.0.0/16`
   - **IPv6 CIDR block:** Deixe "No IPv6 CIDR block"
   - **Tenancy:** Deixe "Default"
3. **Clique em "Create VPC"**

#### **Passo 3.1.3: Verificar a VPC Criada**
1. **Na lista de VPCs**, você deve ver `dg-vpc`
2. **Anote o VPC ID** (algo como `vpc-12345678`)
3. **Clique no VPC ID** para ver os detalhes

#### **Passo 3.1.4: Criar Subnets Públicas**
1. **No menu lateral esquerdo**, clique em "Subnets"
2. **Clique em "Create subnet"**
3. **Para a primeira subnet pública:**
   - **VPC ID:** Selecione `dg-vpc`
   - **Subnet name:** Digite `dg-public-1a`
   - **Availability Zone:** Selecione a primeira AZ (ex: `us-east-1a`)
   - **IPv4 CIDR block:** Digite `10.0.0.0/24`
4. **Clique em "Create subnet"**
5. **Repita para a segunda subnet pública:**
   - **Subnet name:** `dg-public-1b`
   - **Availability Zone:** Selecione a segunda AZ (ex: `us-east-1b`)
   - **IPv4 CIDR block:** `10.0.1.0/24`

#### **Passo 3.1.5: Criar Subnets Privadas**
1. **Continue criando subnets:**
2. **Para a primeira subnet privada:**
   - **Subnet name:** `dg-private-1a`
   - **Availability Zone:** `us-east-1a`
   - **IPv4 CIDR block:** `10.0.10.0/24`
3. **Para a segunda subnet privada:**
   - **Subnet name:** `dg-private-1b`
   - **Availability Zone:** `us-east-1b`
   - **IPv4 CIDR block:** `10.0.11.0/24`

### **3.2 Componentes de Rede**

#### **Passo 3.2.1: Criar Internet Gateway**
1. **No menu lateral**, clique em "Internet Gateways"
2. **Clique em "Create internet gateway"**
3. **Name tag:** Digite `dg-igw`
4. **Clique em "Create internet gateway"**
5. **Selecione o IGW criado** e clique em "Actions" → "Attach to VPC"
6. **Selecione `dg-vpc`** e clique em "Attach internet gateway"

#### **Passo 3.2.2: Criar NAT Gateway (IMPORTANTE: Custo ~US$ 30-40/mês)**
1. **No menu lateral**, clique em "NAT Gateways"
2. **Clique em "Create NAT gateway"**
3. **Configurações:**
   - **Subnet:** Selecione `dg-public-1a` (primeira subnet pública)
   - **Connectivity type:** Deixe "Public"
   - **Elastic IP allocation ID:** Clique em "Allocate Elastic IP" (criará um IP público)
   - **Name:** Digite `dg-nat-gateway`
4. **Clique em "Create NAT gateway"**
5. **Aguarde** o status mudar para "Available" (pode levar alguns minutos)
6. **Anote o NAT Gateway ID** (algo como `nat-12345678`)

#### **Passo 3.2.3: Configurar Route Tables Públicas**
1. **No menu lateral**, clique em "Route Tables"
2. **Encontre a route table** associada à VPC `dg-vpc` (geralmente tem o mesmo nome)
3. **Clique no ID da route table**
4. **Na aba "Routes"**, clique em "Edit routes"
5. **Adicione uma rota:**
   - **Destination:** `0.0.0.0/0`
   - **Target:** Selecione "Internet Gateway" → `dg-igw`
6. **Clique em "Save changes"**
7. **Na aba "Subnet associations"**, clique em "Edit subnet associations"
8. **Marque as subnets públicas** (`dg-public-1a` e `dg-public-1b`)
9. **Clique em "Save associations"**

#### **Passo 3.2.4: Configurar Route Tables Privadas**
1. **Crie uma nova route table:**
   - **Clique em "Create route table"**
   - **Name tag:** `dg-private-rt`
   - **VPC:** Selecione `dg-vpc`
2. **Configure as rotas:**
   - **Na aba "Routes"**, clique em "Edit routes"
   - **Adicione rota:**
     - **Destination:** `0.0.0.0/0`
     - **Target:** Selecione "NAT Gateway" → `dg-nat-gateway`
3. **Associe às subnets privadas:**
   - **Na aba "Subnet associations"**, clique em "Edit subnet associations"
   - **Marque as subnets privadas** (`dg-private-1a` e `dg-private-1b`)

#### **Passo 3.2.5: Verificar Configuração**
1. **VPC Dashboard:** Verifique se todos os componentes estão listados
2. **Subnets:** Confirme que tem 4 subnets (2 públicas, 2 privadas)
3. **Route Tables:** Confirme que tem 2 route tables configuradas
4. **Internet Gateway:** Deve estar "Attached"
5. **NAT Gateway:** Deve estar "Available"

**🔍 VERIFICAÇÃO FINAL:**
- [x] VPC `dg-vpc` criada (10.0.0.0/16)
- [x] 2 subnets públicas criadas (10.0.0.0/24 e 10.0.1.0/24)
- [x] 2 subnets privadas criadas (10.0.10.0/24 e 10.0.11.0/24)
- [x] Internet Gateway criado e anexado
- [x] NAT Gateway criado e disponível
- [x] Route tables configuradas corretamente
- [x] Subnets associadas às route tables corretas

**⚠️ IMPORTANTE SOBRE CUSTOS:**
- **NAT Gateway:** Custa aproximadamente US$ 30-40/mês
- **Elastic IP:** Custa US$ 3.65/mês se não estiver em uso
- **Para economizar:** Você pode usar apenas 1 NAT Gateway (como fizemos)
- **Para desenvolvimento:** Considere usar instâncias NAT mais baratas

**📝 ANOTE ESTAS INFORMAÇÕES:**
- VPC ID: `vpc-0dc59e29a38a78df8`
- Subnet pública 1: `subnet-0620e0052e3d731cc` (us-east-1a)
- Subnet pública 2: `subnet-04e4d1f60f3823faa` (us-east-1b)
- Subnet privada 1: `subnet-000640a702b3a6b81` (us-east-1a)
- Subnet privada 2: `subnet-0e983d1cfde24f4fc` (us-east-1b)
- NAT Gateway ID: `nat-023b398eb7eb85b85`
- Internet Gateway ID: `igw-0aef4d7fc9e3418b1`

---

## 💾 **FASE 4: BANCO DE DADOS (RDS MySQL) (20-30 min)**

### **4.1 Configurar RDS**

**🎯 OBJETIVO:** Criar uma instância MySQL gerenciada na AWS para armazenar os dados da aplicação.

**📋 PASSOS DETALHADOS:**

#### **Passo 4.1.1: Acessar o Console RDS**
1. **No console AWS**, digite "RDS" no menu de serviços
2. **Clique em "RDS"** quando aparecer
3. **Aguarde** a página carregar

#### **Passo 4.1.2: Criar Database Subnet Group (se necessário)**
1. **No menu lateral esquerdo**, clique em "Subnet groups"
2. **Se não existir nenhum**, clique em "Create DB subnet group"
3. **Configurações:**
   - **Name:** `dg-db-subnet-group`
   - **Description:** `Subnet group for DG application database`
   - **VPC:** Selecione `dg-vpc`
   - **Availability Zones:** Selecione as 2 AZs que você criou
   - **Subnets:** Marque as 2 subnets privadas (`dg-private-1a` e `dg-private-1b`)
4. **Clique em "Create"**

#### **Passo 4.1.3: Criar a Instância RDS**
1. **Clique em "Create database"** (botão laranja)
2. **Na seção "Engine options":**
   - **Engine type:** Selecione "MySQL"
   - **Version:** Selecione "MySQL 8.0.35" (ou a mais recente)
3. **Na seção "Templates":**
   - **Para desenvolvimento:** Selecione "Free tier" (se elegível)
   - **Para produção:** Selecione "Production"
4. **Na seção "Settings":**
   - **DB instance identifier:** Digite `dg-mysql-db`
   - **Master username:** Digite `admin`
   - **Master password:** Digite uma senha forte (anote esta senha!)
   - **Confirm password:** Digite a mesma senha
5. **Na seção "Instance configuration":**
   - **DB instance class:** Selecione "db.t3.micro" (para começar)
6. **Na seção "Storage":**
   - **Storage type:** Deixe "General Purpose SSD (gp3)"
   - **Allocated storage:** Digite `20`
   - **Storage autoscaling:** Deixe desmarcado por enquanto
7. **Na seção "Connectivity":**
   - **VPC:** Selecione `dg-vpc`
   - **Subnet group:** Selecione `dg-db-subnet-group`
   - **Public access:** Selecione **"No"** (IMPORTANTE para segurança)
   - **VPC security groups:** Selecione "Create new"
     - **New VPC security group name:** `SG-rds`
   - **Availability Zone:** Deixe "No preference"
   - **Port:** Deixe `3306` (padrão MySQL)
8. **Na seção "Database authentication":**
   - **Database authentication:** Deixe "Password authentication"
9. **Na seção "Additional configuration":**
   - **Initial database name:** Digite `dg_contracts`
   - **Backup retention period:** Digite `7` (dias)
   - **Backup window:** Deixe o padrão
   - **Maintenance window:** Deixe o padrão
   - **Deletion protection:** Para desenvolvimento, desmarque; para produção, marque
10. **Clique em "Create database"**

#### **Passo 4.1.4: Aguardar Criação**
1. **Você será redirecionado** para a lista de databases
2. **O status será "Creating"** - aguarde de 5 a 15 minutos
3. **Quando estiver pronto**, o status mudará para "Available"
4. **Clique no nome** `dg-mysql-db` para ver os detalhes

### **4.2 Security Group**

#### **Passo 4.2.1: Configurar Security Group do RDS**
1. **No console AWS**, vá para "EC2" → "Security Groups"
2. **Encontre o security group** `SG-rds` (criado automaticamente)
3. **Clique no ID** do security group
4. **Na aba "Inbound rules"**, clique em "Edit inbound rules"
5. **Adicione uma regra:**
   - **Type:** MySQL/Aurora
   - **Port:** 3306
   - **Source:** Custom
   - **Source value:** Digite o ID do security group do ECS (será criado depois)
   - **Description:** "Allow MySQL access from ECS tasks"
6. **Clique em "Save rules"**

**⚠️ IMPORTANTE:** Por enquanto, deixe esta regra como está. Vamos atualizar o source depois que criarmos o security group do ECS.

### **4.3 Backup e Configurações Adicionais**

#### **Passo 4.3.1: Verificar Configurações de Backup**
1. **Na página do RDS**, vá para a aba "Backup"
2. **Verifique se:**
   - **Backup retention period:** 7 dias
   - **Backup window:** Está configurado
   - **Point-in-time recovery:** Está habilitado

#### **Passo 4.3.2: Testar Conexão (Opcional)**
1. **Na página do RDS**, anote o "Endpoint" (algo como `dg-mysql-db.xxxxx.us-east-1.rds.amazonaws.com`)
2. **Anote também:**
   - **Port:** 3306
   - **Username:** admin
   - **Password:** (a que você definiu)
   - **Database name:** dg_contracts

#### **Passo 4.3.3: Configurar Parâmetros (Opcional)**
1. **Na aba "Configuration"**, clique em "Parameter groups"
2. **Se necessário**, crie um parameter group customizado para otimizações específicas

**🔍 VERIFICAÇÃO FINAL:**
- [x] Instância RDS MySQL criada
- [x] Status "Available"
- [x] Subnet group configurado com subnets privadas
- [x] Public access desabilitado
- [x] Security group criado
- [x] Backup configurado (7 dias)
- [x] Database inicial criado (`dg_contracts`)

**📝 ANOTE ESTAS INFORMAÇÕES (MUITO IMPORTANTE):**
- **Endpoint:** `dg-mysql-db.ckb4ai4ysvvk.us-east-1.rds.amazonaws.com`
- **Port:** `3306`
- **Username:** `admin`
- **Password:** `[SUA_SENHA]`
- **Database name:** `dg_contracts`
- **Security Group ID:** `sg-0a7f62900859cbb35`
- **Subnet Group:** `dg-db-subnet-group`

**⚠️ IMPORTANTE SOBRE SEGURANÇA:**
- **NUNCA** habilite "Public access" para produção
- **SEMPRE** use subnets privadas
- **MANTENHA** a senha segura e anotada
- **CONFIGURE** backup adequado para seus dados

**💰 CUSTOS ESTIMADOS:**
- **db.t3.micro:** ~US$ 12-15/mês
- **Storage 20GB:** ~US$ 2-3/mês
- **Backup storage:** Conforme uso
- **Total:** ~US$ 15-20/mês

---

## 📁 **FASE 5: ARMAZENAMENTO DE ARQUIVOS (EFS) (15-20 min)**

### **5.1 Criar EFS**

**🎯 OBJETIVO:** Criar um sistema de arquivos compartilhado para armazenar uploads de forma persistente entre os containers.

**📋 PASSOS DETALHADOS:**

#### **Passo 5.1.1: Acessar o Console EFS**
1. **No console AWS**, digite "EFS" no menu de serviços
2. **Clique em "Elastic File System"** quando aparecer
3. **Aguarde** a página carregar

#### **Passo 5.1.2: Criar o File System**
1. **Clique em "Create file system"** (botão laranja)
2. **Na seção "Name and tags":**
   - **Name:** Digite `dg-uploads-efs`
   - **Tags:** Adicione se desejar (opcional)
3. **Na seção "Network access":**
   - **VPC:** Selecione `dg-vpc`
   - **Mount targets:** Deixe vazio por enquanto (vamos configurar depois)
4. **Na seção "File system settings":**
   - **Performance mode:** Deixe "General Purpose"
   - **Throughput mode:** Deixe "Bursting"
   - **Encryption:** Deixe "Enable encryption of data in transit" marcado
   - **Encryption in transit:** Deixe "Enable"
   - **Encryption at rest:** Deixe "Enable" (recomendado)
5. **Na seção "Lifecycle management":**
   - **Lifecycle policy:** Deixe "None" por enquanto
6. **Clique em "Create"**

#### **Passo 5.1.3: Configurar Mount Targets**
1. **Após a criação**, você será redirecionado para a página do file system
2. **Na aba "Network"**, clique em "Manage"
3. **Para cada subnet privada**, clique em "Create mount target":
   
   **Mount Target 1:**
   - **Subnet:** Selecione `dg-private-1a`
   - **Security groups:** Clique em "Create new security group"
     - **Name:** `SG-efs`
     - **Description:** `Security group for EFS access`
   - **IP address:** Deixe automático
   
   **Mount Target 2:**
   - **Subnet:** Selecione `dg-private-1b`
   - **Security groups:** Selecione `SG-efs` (criado acima)
   - **IP address:** Deixe automático
4. **Clique em "Save"** para cada mount target

#### **Passo 5.1.4: Aguardar Mount Targets**
1. **Aguarde** o status dos mount targets mudar para "Available" (pode levar alguns minutos)
2. **Verifique** se ambos os mount targets estão "Available"

### **5.2 Access Point (Recomendado)**

#### **Passo 5.2.1: Criar Access Point**
1. **Na página do EFS**, vá para a aba "Access points"
2. **Clique em "Create access point"**
3. **Configurações:**
   - **Name:** `dg-uploads-access-point`
   - **Root directory path:** `/dg-uploads`
   - **POSIX user:**
     - **User ID:** `1000`
     - **Group ID:** `1000`
   - **POSIX permissions:**
     - **Owner user ID:** `1000`
     - **Owner group ID:** `1000`
     - **Owner permissions:** `755` (rwxr-xr-x)
     - **Other permissions:** `755`
4. **Clique em "Create access point"**

#### **Passo 5.2.2: Verificar Access Point**
1. **Anote o Access Point ID** (algo como `fsap-12345678`)
2. **Verifique** se o status está "Available"

### **5.3 Security Group**

#### **Passo 5.3.1: Configurar Security Group do EFS**
1. **No console AWS**, vá para "EC2" → "Security Groups"
2. **Encontre o security group** `SG-efs` (criado automaticamente)
3. **Clique no ID** do security group
4. **Na aba "Inbound rules"**, clique em "Edit inbound rules"
5. **Adicione uma regra:**
   - **Type:** NFS
   - **Port:** 2049
   - **Source:** Custom
   - **Source value:** Digite o ID do security group do ECS (será criado depois)
   - **Description:** "Allow NFS access from ECS tasks"
6. **Clique em "Save rules"**

**⚠️ IMPORTANTE:** Por enquanto, deixe esta regra como está. Vamos atualizar o source depois que criarmos o security group do ECS.

### **5.4 Testar EFS (Opcional)**

#### **Passo 5.4.1: Obter Informações de Mount**
1. **Na página do EFS**, vá para a aba "Network"
2. **Clique em "Attach"** em um dos mount targets
3. **Copie o comando de mount** (algo como):
```bash
sudo mount -t efs -o tls fs-12345678.efs.us-east-1.amazonaws.com:/ /mnt/efs
```

#### **Passo 5.4.2: Verificar Configuração**
1. **File System ID:** Anote (algo como `fs-12345678`)
2. **Access Point ID:** Anote (algo como `fsap-12345678`)
3. **DNS Name:** Anote (algo como `fs-12345678.efs.us-east-1.amazonaws.com`)

**🔍 VERIFICAÇÃO FINAL:**
- [ ] File System EFS criado
- [ ] 2 Mount Targets criados (um em cada subnet privada)
- [ ] Mount Targets com status "Available"
- [ ] Access Point criado
- [ ] Security Group criado
- [ ] Encryption habilitado

**📝 ANOTE ESTAS INFORMAÇÕES:**
- **File System ID:** `fs-xxxxxxxx`
- **Access Point ID:** `fsap-xxxxxxxx`
- **DNS Name:** `fs-xxxxxxxx.efs.us-east-1.amazonaws.com`
- **Security Group ID:** `sg-xxxxxxxx`
- **Mount Path:** `/dg-uploads`

**⚠️ IMPORTANTE SOBRE SEGURANÇA:**
- **SEMPRE** use encryption em trânsito e em repouso
- **NUNCA** permita acesso público ao EFS
- **USE** Access Points para controle de acesso granular
- **CONFIGURE** security groups corretamente

**💰 CUSTOS ESTIMADOS:**
- **Storage:** ~US$ 0.30/GB/mês
- **Throughput:** Bursting (gratuito até 50MB/s)
- **Requests:** ~US$ 0.01 por 10.000 requests
- **Para 10GB:** ~US$ 3-5/mês

**🔧 COMANDOS ÚTEIS:**
```bash
# Verificar file systems
aws efs describe-file-systems

# Verificar mount targets
aws efs describe-mount-targets --file-system-id fs-xxxxxxxx

# Verificar access points
aws efs describe-access-points --file-system-id fs-xxxxxxxx
```

---

## 🐳 **FASE 6: CLUSTER E SERVIÇO (ECS Fargate) (40-60 min)**

### **6.1 Cluster ECS**

**🎯 OBJETIVO:** Criar um cluster ECS para executar containers da aplicação usando Fargate.

**📋 PASSOS DETALHADOS:**

#### **Passo 6.1.1: Acessar o Console ECS**
1. **No console AWS**, digite "ECS" no menu de serviços
2. **Clique em "Elastic Container Service"** quando aparecer
3. **Aguarde** a página carregar

#### **Passo 6.1.2: Criar o Cluster**
1. **Clique em "Create cluster"** (botão laranja)
2. **Na seção "Cluster configuration":**
   - **Cluster name:** Digite `dg-cluster`
   - **Infrastructure:** Selecione "AWS Fargate (serverless)"
3. **Na seção "Networking":**
   - **VPC:** Selecione `dg-vpc`
   - **Subnets:** Selecione as 2 subnets privadas (`dg-private-1a` e `dg-private-1b`)
4. **Na seção "Monitoring":**
   - **Container Insights:** Deixe desmarcado (pode habilitar depois)
5. **Clique em "Create"**

#### **Passo 6.1.3: Aguardar Criação**
1. **Aguarde** o cluster ser criado (pode levar alguns minutos)
2. **Verifique** se o status está "Active"

### **6.2 IAM Roles**

#### **Passo 6.2.1: Criar Task Execution Role**
1. **No console AWS**, vá para "IAM" → "Roles"
2. **Clique em "Create role"**
3. **Na seção "Trusted entity type":**
   - **Selecione "AWS service"**
   - **Selecione "Elastic Container Service"**
   - **Selecione "Elastic Container Service Task"**
4. **Clique em "Next"**
5. **Na seção "Permissions":**
   - **Marque "AmazonECSTaskExecutionRolePolicy"**
6. **Clique em "Next"**
7. **Na seção "Name, review, and create":**
   - **Role name:** `dg-ecs-task-execution-role`
   - **Description:** `Role for ECS task execution`
8. **Clique em "Create role"**

#### **Passo 6.2.2: Criar Task Role**
1. **Clique em "Create role"** novamente
2. **Na seção "Trusted entity type":**
   - **Selecione "AWS service"**
   - **Selecione "Elastic Container Service"**
   - **Selecione "Elastic Container Service Task"**
3. **Clique em "Next"**
4. **Na seção "Permissions":**
   - **Clique em "Create policy"**
   - **Na aba "JSON", cole este código:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue",
        "ssm:GetParameter",
        "ssm:GetParameters"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "elasticfilesystem:ClientMount",
        "elasticfilesystem:ClientWrite",
        "elasticfilesystem:ClientRootAccess"
      ],
      "Resource": "*"
    }
  ]
}
```
5. **Clique em "Next"**
6. **Policy name:** `dg-ecs-task-policy`
7. **Clique em "Create policy"**
8. **Volte para criar a role** e marque a política criada
9. **Role name:** `dg-ecs-task-role`
10. **Clique em "Create role"**

### **6.3 CloudWatch Logs**

#### **Passo 6.3.1: Criar Log Group**
1. **No console AWS**, vá para "CloudWatch" → "Logs" → "Log groups"
2. **Clique em "Create log group"**
3. **Configurações:**
   - **Log group name:** `/ecs/dg-app`
   - **Retention period:** 30 days
4. **Clique em "Create"**

### **6.4 Security Groups**

#### **Passo 6.4.1: Criar Security Group do ALB**
1. **No console AWS**, vá para "EC2" → "Security Groups"
2. **Clique em "Create security group"**
3. **Configurações:**
   - **Security group name:** `SG-alb`
   - **Description:** `Security group for Application Load Balancer`
   - **VPC:** Selecione `dg-vpc`
4. **Na seção "Inbound rules":**
   - **Adicione regra 1:**
     - **Type:** HTTP
     - **Port:** 80
     - **Source:** 0.0.0.0/0
     - **Description:** "Allow HTTP from anywhere"
   - **Adicione regra 2:**
     - **Type:** HTTPS
     - **Port:** 443
     - **Source:** 0.0.0.0/0
     - **Description:** "Allow HTTPS from anywhere"
5. **Clique em "Create security group"**

#### **Passo 6.4.2: Criar Security Group do ECS**
1. **Clique em "Create security group"** novamente
2. **Configurações:**
   - **Security group name:** `SG-ecs`
   - **Description:** `Security group for ECS tasks`
   - **VPC:** Selecione `dg-vpc`
3. **Na seção "Inbound rules":**
   - **Adicione regra:**
     - **Type:** Custom TCP
     - **Port:** 3000
     - **Source:** Custom
     - **Source value:** ID do `SG-alb`
     - **Description:** "Allow port 3000 from ALB"
4. **Clique em "Create security group"**

#### **Passo 6.4.3: Atualizar Security Groups do RDS e EFS**
1. **Encontre o security group `SG-rds`**
2. **Edite as inbound rules:**
   - **Source:** ID do `SG-ecs`
3. **Encontre o security group `SG-efs`**
4. **Edite as inbound rules:**
   - **Source:** ID do `SG-ecs`

### **6.5 Task Definition**

#### **Passo 6.5.1: Criar Task Definition**
1. **No console ECS**, vá para "Task definitions"
2. **Clique em "Create new task definition"**
3. **Na seção "Task definition configuration":**
   - **Task definition family:** `dg-task`
   - **Launch type:** AWS Fargate
   - **Operating system/Architecture:** Linux/X86_64
   - **Task size:**
     - **CPU:** 0.5 vCPU
     - **Memory:** 1 GB
4. **Na seção "Container definitions":**
   - **Clique em "Add container"**
   - **Container name:** `dg-app`
   - **Image URI:** `570322735022.dkr.ecr.us-east-1.amazonaws.com/dg-app:latest`
   - **Port mappings:**
     - **Container port:** 3000
     - **Protocol:** TCP
   - **Environment variables:**
     - **PORT:** 3000
   - **Secrets (adicione estas):**
     - **DATABASE_URL:** `arn:aws:secretsmanager:us-east-1:570322735022:secret:DATABASE_URL`
     - **JWT_SECRET:** `arn:aws:secretsmanager:us-east-1:570322735022:secret:JWT_SECRET`
     - **FILE_ENCRYPTION_PASSWORD:** `arn:aws:secretsmanager:us-east-1:570322735022:secret:FILE_ENCRYPTION_PASSWORD`
   - **Logging:**
     - **Log driver:** awslogs
     - **Log group:** `/ecs/dg-app`
     - **Log stream prefix:** `dg`
     - **Region:** Sua região AWS
5. **Na seção "Volumes":**
   - **Clique em "Add volume"**
   - **Volume name:** `uploads`
   - **Volume type:** EFS
   - **File system ID:** ID do seu EFS
   - **Access point ID:** ID do seu Access Point
   - **Transit encryption:** Enabled
   - **Authorization:** IAM
6. **Na seção "Container mount points":**
   - **Source volume:** `uploads`
   - **Container path:** `/opt/dg/uploads`
   - **Read only:** Desmarcado
7. **Clique em "Create"**

### **6.6 Service**

#### **Passo 6.6.1: Criar Service**
1. **No cluster `dg-cluster`**, clique em "Create service"
2. **Na seção "Compute options":**
   - **Launch type:** AWS Fargate
3. **Na seção "Deployment configuration":**
   - **Task definition family:** `dg-task`
   - **Revision:** Latest
   - **Service name:** `dg-service`
   - **Desired tasks:** 1
4. **Na seção "Networking":**
   - **VPC:** `dg-vpc`
   - **Subnets:** Selecione as 2 subnets privadas
   - **Security groups:** `SG-ecs`
   - **Public IP:** Disabled
5. **Na seção "Load balancing":**
   - **Load balancer type:** Application Load Balancer
   - **Load balancer name:** (será criado depois)
   - **Target group name:** (será criado depois)
   - **Container to load balance:** `dg-app:3000`
6. **Clique em "Create"**

### **6.7 Auto Scaling (Recomendado)**

#### **Passo 6.7.1: Configurar Auto Scaling**
1. **No service criado**, vá para a aba "Auto Scaling"
2. **Clique em "Create Auto Scaling policy"**
3. **Configurações:**
   - **Policy type:** Target tracking
   - **Metric type:** CPU utilization
   - **Target value:** 60
   - **Scale out cooldown:** 300 seconds
   - **Scale in cooldown:** 300 seconds
4. **Clique em "Create"**

**🔍 VERIFICAÇÃO FINAL:**
- [x] Cluster ECS criado e ativo
- [x] Task Execution Role criada
- [x] Task Role criada com permissões corretas
- [x] Log Group criado
- [x] Security Groups criados e configurados
- [x] Task Definition criada
- [x] Service criado e rodando
- [x] Auto Scaling configurado

**📝 ANOTE ESTAS INFORMAÇÕES:**
- **Cluster ARN:** `arn:aws:ecs:us-east-1:570322735022:cluster/dg-cluster`
- **Task Definition ARN:** `arn:aws:ecs:us-east-1:570322735022:task-definition/dg-task:2`
- **Service ARN:** `arn:aws:ecs:us-east-1:570322735022:service/dg-cluster/dg-service`
- **Security Group ECS:** `sg-08882d43233b38594`
- **Security Group ALB:** `sg-036884576cf1b593a`
- **Log Group:** `/ecs/dg-app`

**⚠️ IMPORTANTE:**
- **Aguarde** o service ficar estável antes de prosseguir
- **Verifique** os logs no CloudWatch se houver problemas
- **Confirme** que as tasks estão rodando

---

## 🔀 **FASE 7: ENTRADA (ALB) + TLS (ACM) (20-30 min)**

### **7.1 Certificado SSL (ACM)**

**🎯 OBJETIVO:** Criar um certificado SSL para habilitar HTTPS na aplicação.

**📋 PASSOS DETALHADOS:**

#### **Passo 7.1.1: Acessar o Console ACM**
1. **No console AWS**, digite "ACM" no menu de serviços
2. **Clique em "Certificate Manager"** quando aparecer
3. **Aguarde** a página carregar

#### **Passo 7.1.2: Solicitar Certificado**
1. **Clique em "Request a certificate"** (botão laranja)
2. **Na seção "Certificate type":**
   - **Selecione "Request a public certificate"**
3. **Clique em "Next"**
4. **Na seção "Add domain names":**
   - **Domain name:** Digite seu domínio (ex: `meudominio.com`)
   - **Subject Alternative Name (SAN):** Adicione:
     - `*.meudominio.com` (wildcard)
     - `www.meudominio.com` (se desejar)
5. **Clique em "Next"**
6. **Na seção "Select validation method":**
   - **Selecione "DNS validation"** (recomendado)
7. **Clique em "Next"**
8. **Na seção "Add tags":**
   - **Deixe vazio** ou adicione tags se desejar
9. **Clique em "Review"**
10. **Revise as informações** e clique em "Confirm and request"

#### **Passo 7.1.3: Validar o Certificado**
1. **Você será redirecionado** para a página do certificado
2. **Status será "Pending validation"**
3. **Clique no certificado** para ver os detalhes
4. **Na aba "Domains"**, você verá registros CNAME para validação
5. **Copie os registros CNAME** e adicione no seu DNS:
   - **Name:** (ex: `_abc123.meudominio.com`)
   - **Value:** (ex: `_xyz789.acm-validations.aws.`)
6. **Aguarde** a validação (pode levar alguns minutos)
7. **Status mudará** para "Issued" quando validado

**⚠️ IMPORTANTE:** Se você não tem um domínio, pode usar o DNS do ALB temporariamente, mas será necessário um domínio real para produção.

### **7.2 Target Group**

#### **Passo 7.2.1: Criar Target Group**
1. **No console AWS**, vá para "EC2" → "Load Balancers"
2. **No menu lateral**, clique em "Target Groups"
3. **Clique em "Create target group"**
4. **Na seção "Choose a target type":**
   - **Selecione "IP addresses"**
5. **Na seção "Basic configuration":**
   - **Target group name:** `dg-target-group`
   - **Protocol:** HTTP
   - **Port:** 3000
   - **VPC:** Selecione `dg-vpc`
6. **Na seção "Health checks":**
   - **Health check path:** `/health`
   - **Health check interval:** 30 seconds
   - **Health check timeout:** 5 seconds
   - **Healthy threshold:** 3
   - **Unhealthy threshold:** 3
7. **Clique em "Next"**
8. **Na seção "Register targets":**
   - **Deixe vazio** por enquanto (vamos registrar depois)
9. **Clique em "Create target group"**

### **7.3 Application Load Balancer**

#### **Passo 7.3.1: Criar ALB**
1. **No console AWS**, vá para "EC2" → "Load Balancers"
2. **Clique em "Create load balancer"**
3. **Selecione "Application Load Balancer"**
4. **Clique em "Create"**
5. **Na seção "Basic configuration":**
   - **Load balancer name:** `dg-alb`
   - **Scheme:** Internet-facing
   - **IP address type:** IPv4
6. **Na seção "Network mapping":**
   - **VPC:** Selecione `dg-vpc`
   - **Mappings:** Selecione as 2 subnets públicas (`dg-public-1a` e `dg-public-1b`)
7. **Na seção "Security groups":**
   - **Selecione `SG-alb`**
8. **Na seção "Listeners and routing":**
   - **Protocol:** HTTP
   - **Port:** 80
   - **Default action:** Forward to target group
   - **Target group:** `dg-target-group`
9. **Clique em "Create load balancer"**

#### **Passo 7.3.2: Configurar Listener HTTPS**
1. **Após a criação**, clique no ALB criado
2. **Na aba "Listeners"**, clique em "Add listener"
3. **Configurações:**
   - **Protocol:** HTTPS
   - **Port:** 443
   - **Default action:** Forward to target group
   - **Target group:** `dg-target-group`
   - **Security policy:** ELBSecurityPolicy-TLS-1-2-2017-01
4. **Na seção "Security groups":**
   - **Selecione o certificado** criado no ACM
5. **Clique em "Add"**

#### **Passo 7.3.3: Configurar Redirect HTTP → HTTPS**
1. **Na aba "Listeners"**, encontre o listener HTTP (porta 80)
2. **Clique em "View/edit rules"**
3. **Clique em "Add rule"**
4. **Configurações:**
   - **IF:** Host is `meudominio.com` (ou deixe vazio para todos)
   - **THEN:** Redirect to `https://#{host}:443#{path}?#{query}`
   - **Status code:** 301
5. **Clique em "Save"**

### **7.4 Registrar Targets no Target Group**

#### **Passo 7.4.1: Obter IPs das Tasks ECS**
1. **No console ECS**, vá para o cluster `dg-cluster`
2. **Clique no service `dg-service`**
3. **Na aba "Tasks"**, clique em uma task
4. **Anote o "Private IP"** da task
5. **Repita** para todas as tasks ativas

#### **Passo 7.4.2: Registrar IPs no Target Group**
1. **No console EC2**, vá para "Target Groups"
2. **Clique em `dg-target-group`**
3. **Na aba "Targets"**, clique em "Register targets"
4. **Na seção "Available targets":**
   - **Marque os IPs** das tasks ECS
5. **Clique em "Register pending targets"**
6. **Aguarde** o status mudar para "healthy"

### **7.5 DNS (Route 53)**

#### **Passo 7.5.1: Configurar DNS (se tiver domínio)**
1. **No console AWS**, vá para "Route 53" → "Hosted zones"
2. **Clique na hosted zone** do seu domínio
3. **Clique em "Create record"**
4. **Configurações:**
   - **Record name:** Deixe vazio (para domínio raiz) ou `www`
   - **Record type:** A
   - **Alias:** Yes
   - **Route traffic to:** Alias to Application and Classic Load Balancer
   - **Region:** Selecione sua região
   - **Load balancer:** Selecione `dg-alb`
5. **Clique em "Create records"**

#### **Passo 7.5.2: Obter DNS do ALB (se não tiver domínio)**
1. **No console EC2**, vá para "Load Balancers"
2. **Clique em `dg-alb`**
3. **Anote o "DNS name"** (algo como `dg-alb-123456789.us-east-1.elb.amazonaws.com`)
4. **Use este DNS** para testar a aplicação

**🔍 VERIFICAÇÃO FINAL:**
- [x] Certificado SSL criado e validado (não aplicável - sem domínio)
- [x] Target Group criado
- [x] ALB criado e configurado
- [x] Listener HTTPS configurado (não aplicável - sem domínio)
- [x] Redirect HTTP → HTTPS configurado (não aplicável - sem domínio)
- [x] Targets registrados e healthy
- [x] DNS configurado (não aplicável - usando DNS do ALB)

**📝 ANOTE ESTAS INFORMAÇÕES:**
- **ALB DNS Name:** `dg-alb-175722117.us-east-1.elb.amazonaws.com`
- **Target Group ARN:** `arn:aws:elasticloadbalancing:us-east-1:570322735022:targetgroup/dg-target-group-3000/62e3330f4bd12799`
- **Certificate ARN:** Não aplicável (sem domínio)
- **URL da Aplicação:** `http://dg-alb-175722117.us-east-1.elb.amazonaws.com`

**⚠️ IMPORTANTE:**
- **Aguarde** os targets ficarem healthy antes de testar
- **Verifique** se o health check está funcionando
- **Teste** tanto HTTP quanto HTTPS

**🔧 COMANDOS ÚTEIS:**
```bash
# Verificar status do ALB
aws elbv2 describe-load-balancers --names dg-alb

# Verificar targets
aws elbv2 describe-target-health --target-group-arn TARGET_GROUP_ARN

# Verificar certificados
aws acm list-certificates
```

---

## 🤖 **FASE 8: CI/CD (GitHub Actions) (30-45 min)**

### **8.1 Secrets do Repositório (GitHub)**

**🎯 OBJETIVO:** Configurar secrets no GitHub para permitir deploy automático da aplicação.

**📋 PASSOS DETALHADOS:**

#### **Passo 8.1.1: Acessar o Repositório GitHub**
1. **Abra o navegador** e vá para: https://github.com
2. **Faça login** com sua conta GitHub
3. **Navegue** para o repositório da aplicação DG
4. **Se não existir**, crie um novo repositório

#### **Passo 8.1.2: Configurar Secrets**
1. **No repositório**, clique na aba "Settings"
2. **No menu lateral esquerdo**, clique em "Secrets and variables" → "Actions"
3. **Clique em "New repository secret"**
4. **Adicione os seguintes secrets:**

**Secret 1: AWS_ACCESS_KEY_ID**
- **Name:** `AWS_ACCESS_KEY_ID`
- **Secret:** Sua AWS Access Key ID
- **Clique em "Add secret"**

**Secret 2: AWS_SECRET_ACCESS_KEY**
- **Name:** `AWS_SECRET_ACCESS_KEY`
- **Secret:** Sua AWS Secret Access Key
- **Clique em "Add secret"**

**Secret 3: AWS_REGION**
- **Name:** `AWS_REGION`
- **Secret:** `us-east-1` (ou sua região)
- **Clique em "Add secret"**

**Secret 4: ECR_REPOSITORY**
- **Name:** `ECR_REPOSITORY`
- **Secret:** `dg-app`
- **Clique em "Add secret"**

**Secret 5: ECS_CLUSTER**
- **Name:** `ECS_CLUSTER`
- **Secret:** `dg-cluster`
- **Clique em "Add secret"**

**Secret 6: ECS_SERVICE**
- **Name:** `ECS_SERVICE`
- **Secret:** `dg-service`
- **Clique em "Add secret"**

**Secret 7: CONTAINER_NAME**
- **Name:** `CONTAINER_NAME`
- **Secret:** `dg-app`
- **Clique em "Add secret"**

#### **Passo 8.1.3: Verificar Secrets**
1. **Na lista de secrets**, você deve ver todos os 7 secrets criados
2. **Confirme** que os nomes estão exatamente como especificado
3. **Anote** que os valores não são visíveis (por segurança)

### **8.2 Workflow GitHub Actions**

#### **Passo 8.2.1: Criar Diretório de Workflows**
1. **No repositório**, clique na aba "Code"
2. **Clique em "Create new file"**
3. **Digite:** `.github/workflows/deploy.yml`
4. **O GitHub criará** automaticamente o diretório `.github/workflows/`

#### **Passo 8.2.2: Criar o Workflow**
1. **Cole o seguinte código** no arquivo:

```yaml
name: Deploy to AWS ECS

on:
  push:
    branches: [ "main" ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ secrets.AWS_REGION }}

      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2

      - name: Build, tag, and push image to ECR
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          ECR_REPOSITORY: ${{ secrets.ECR_REPOSITORY }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build -t $ECR_REPOSITORY:latest .
          docker tag $ECR_REPOSITORY:latest $ECR_REGISTRY/$ECR_REPOSITORY:latest
          docker tag $ECR_REPOSITORY:latest $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:latest
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG

      - name: Render task definition
        id: task-def
        uses: aws-actions/amazon-ecs-render-task-definition@v1
        with:
          task-definition: .aws/ecs/task-definition.json
          container-name: ${{ secrets.CONTAINER_NAME }}
          image: ${{ steps.login-ecr.outputs.registry }}/${{ secrets.ECR_REPOSITORY }}:${{ github.sha }}

      - name: Deploy ECS service
        uses: aws-actions/amazon-ecs-deploy-task-definition@v2
        with:
          task-definition: ${{ steps.task-def.outputs.task-definition }}
          service: ${{ secrets.ECS_SERVICE }}
          cluster: ${{ secrets.ECS_CLUSTER }}
          wait-for-service-stability: true

      - name: Run Prisma migrations
        run: |
          aws ecs run-task \
            --cluster ${{ secrets.ECS_CLUSTER }} \
            --launch-type FARGATE \
            --task-definition ${{ secrets.ECS_SERVICE }} \
            --network-configuration "awsvpcConfiguration={subnets=[subnet-PRIV1,subnet-PRIV2],securityGroups=[sg-ecs],assignPublicIp=DISABLED}" \
            --overrides '{
              "containerOverrides": [{
                "name": "'${{ secrets.CONTAINER_NAME }}'",
                "command": ["npx","prisma","migrate","deploy"]
              }]
            }'
```

2. **Clique em "Commit changes"**
3. **Digite uma mensagem:** "Add GitHub Actions workflow for AWS ECS deployment"
4. **Clique em "Commit changes"**

### **8.3 Arquivo de Task Definition**

#### **Passo 8.3.1: Criar Diretório AWS**
1. **No repositório**, clique em "Create new file"
2. **Digite:** `.aws/ecs/task-definition.json`
3. **O GitHub criará** automaticamente o diretório `.aws/ecs/`

#### **Passo 8.3.2: Criar Task Definition**
1. **Cole o seguinte código** no arquivo:

```json
{
  "family": "dg-task",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::570322735022:role/dg-ecs-task-execution-role",
  "taskRoleArn": "arn:aws:iam::570322735022:role/dg-ecs-task-role",
  "containerDefinitions": [
    {
      "name": "dg-app",
      "image": "570322735022.dkr.ecr.us-east-1.amazonaws.com/dg-app:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "essential": true,
      "environment": [
        {
          "name": "PORT",
          "value": "3000"
        }
      ],
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:570322735022:secret:DATABASE_URL"
        },
        {
          "name": "JWT_SECRET",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:570322735022:secret:JWT_SECRET"
        },
        {
          "name": "FILE_ENCRYPTION_PASSWORD",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:570322735022:secret:FILE_ENCRYPTION_PASSWORD"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/dg-app",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "dg"
        }
      },
      "mountPoints": [
        {
          "sourceVolume": "uploads",
          "containerPath": "/opt/dg/uploads",
          "readOnly": false
        }
      ]
    }
  ],
  "volumes": [
    {
      "name": "uploads",
      "efsVolumeConfiguration": {
        "fileSystemId": "fs-0f3df0710e3bcdca8",
        "transitEncryption": "ENABLED",
        "authorizationConfig": {
          "accessPointId": "fsap-01f860ec94c69b370",
          "iam": "ENABLED"
        }
      }
    }
  ]
}
```

2. **Substitua** os valores:
   - `ACCOUNT_ID`: 570322735022
   - `REGION`: us-east-1
   - `fs-XXXXXXXX`: fs-0f3df0710e3bcdca8
   - `fsap-XXXXXXXX`: fsap-01f860ec94c69b370
3. **Clique em "Commit changes"**

### **8.4 Testar o Workflow**

#### **Passo 8.4.1: Fazer Push para Main**
1. **No seu computador local**, faça commit e push das mudanças:
```bash
git add .
git commit -m "Add GitHub Actions workflow"
git push origin main
```

#### **Passo 8.4.2: Verificar o Workflow**
1. **No GitHub**, vá para a aba "Actions"
2. **Você deve ver** o workflow "Deploy to AWS ECS" rodando
3. **Clique no workflow** para ver os detalhes
4. **Aguarde** cada step completar
5. **Verifique** se não há erros

#### **Passo 8.4.3: Verificar Deploy**
1. **No console AWS**, vá para ECS → Clusters → `dg-cluster`
2. **Verifique** se o service `dg-service` foi atualizado
3. **Confirme** que as tasks estão rodando
4. **Teste** a aplicação no ALB

**🔍 VERIFICAÇÃO FINAL:**
- [x] Secrets configurados no GitHub
- [x] Workflow criado e funcionando
- [x] Task definition criada
- [x] Deploy automático funcionando
- [x] Aplicação atualizada no ECS

**📝 ANOTE ESTAS INFORMAÇÕES:**
- **Repositório GitHub:** `https://github.com/ArrudaV/DG-app`
- **Workflow:** `.github/workflows/deploy.yml`
- **Task Definition:** `.aws/ecs/task-definition.json`

**⚠️ IMPORTANTE:**
- **NUNCA** commite secrets no código
- **SEMPRE** use GitHub Secrets para dados sensíveis
- **TESTE** o workflow antes de usar em produção
- **MONITORE** os logs do workflow para problemas

**🔧 COMANDOS ÚTEIS:**
```bash
# Verificar status do workflow
gh run list

# Ver logs do workflow
gh run view RUN_ID

# Verificar secrets
gh secret list
```

---

## 🧪 **FASE 9: MIGRAÇÕES E SEED (10-20 min)**

### **9.1 Primeira Carga**

**🎯 OBJETIVO:** Executar migrações do Prisma para criar as tabelas no banco de dados RDS.

**📋 PASSOS DETALHADOS:**

#### **Passo 9.1.1: Verificar Status do Service**
1. **No console AWS**, vá para ECS → Clusters → `dg-cluster`
2. **Clique no service `dg-service`**
3. **Verifique** se o status está "Active" e as tasks estão "Running"
4. **Aguarde** pelo menos 1 task estar estável

#### **Passo 9.1.2: Executar Migrações via ECS Run Task**
1. **No console ECS**, vá para "Task definitions"
2. **Clique em `dg-task`** (a mais recente)
3. **Clique em "Run task"**
4. **Configurações:**
   - **Launch type:** Fargate
   - **Cluster:** `dg-cluster`
   - **VPC:** `dg-vpc`
   - **Subnets:** Selecione as 2 subnets privadas
   - **Security groups:** `SG-ecs`
   - **Public IP:** Disabled
5. **Na seção "Container overrides":**
   - **Container name:** `dg-app`
   - **Command override:** `["npx", "prisma", "migrate", "deploy"]`
6. **Clique em "Run task"**

#### **Passo 9.1.3: Verificar Execução**
1. **Aguarde** o status da task mudar para "Stopped"
2. **Clique na task** para ver os detalhes
3. **Na aba "Logs"**, verifique se as migrações foram executadas com sucesso
4. **Procure por mensagens** como "No pending migrations" ou "Applied migrations"

#### **Passo 9.1.4: Verificar no RDS**
1. **No console AWS**, vá para RDS → Databases
2. **Clique em `dg-mysql-db`**
3. **Na aba "Connectivity & security"**, anote o endpoint
4. **Use um cliente MySQL** para conectar e verificar se as tabelas foram criadas

### **9.2 Seed (se existir)**

#### **Passo 9.2.1: Verificar Script de Seed**
1. **No seu projeto local**, verifique se existe um script de seed
2. **Procure por arquivos** como `seed.js`, `seed.ts`, ou `prisma/seed.ts`
3. **Se existir**, anote o comando para executar

#### **Passo 9.2.2: Executar Seed (se necessário)**
1. **No console ECS**, vá para "Task definitions"
2. **Clique em `dg-task`** e "Run task"
3. **Configurações similares** ao passo 9.1.2
4. **Container overrides:**
   - **Command override:** `["npm", "run", "seed"]` (ou comando apropriado)
5. **Execute** e verifique os logs

**🔍 VERIFICAÇÃO FINAL:**
- [x] Migrações executadas com sucesso
- [x] Tabelas criadas no RDS
- [x] Seed executado (se aplicável)
- [x] Logs sem erros

---

## 🔍 **FASE 10: OBSERVABILIDADE E ESCALA (20-30 min)**

### **10.1 Logs**

**🎯 OBJETIVO:** Configurar e monitorar logs da aplicação no CloudWatch.

**📋 PASSOS DETALHADOS:**

#### **Passo 10.1.1: Verificar Log Group**
1. **No console AWS**, vá para CloudWatch → Logs → Log groups
2. **Procure por `/ecs/dg-app`**
3. **Clique no log group** para ver os logs
4. **Verifique** se há logs sendo gerados

#### **Passo 10.1.2: Configurar Retenção de Logs**
1. **No log group `/ecs/dg-app`**, clique em "Actions" → "Edit retention"
2. **Selecione:** 30 days (ou conforme política da empresa)
3. **Clique em "Save changes"**

#### **Passo 10.1.3: Consultar Logs via CLI**
1. **No terminal**, execute:
```bash
aws logs tail /ecs/dg-app --follow
```
2. **Para ver logs específicos:**
```bash
aws logs filter-log-events --log-group-name /ecs/dg-app --start-time $(date -d '1 hour ago' +%s)000
```

### **10.2 Métricas & Alarmes**

#### **Passo 10.2.1: Criar Alarme de CPU**
1. **No console AWS**, vá para CloudWatch → Alarms
2. **Clique em "Create alarm"**
3. **Na seção "Select metric":**
   - **Service:** ECS
   - **Metric:** CPUUtilization
   - **Dimension:** ServiceName = `dg-service`, ClusterName = `dg-cluster`
4. **Na seção "Conditions":**
   - **Threshold type:** Static
   - **CPUUtilization is greater than:** 80
   - **For:** 5 consecutive periods
5. **Na seção "Actions":**
   - **Create new SNS topic** (opcional)
   - **Email:** Seu email
6. **Alarm name:** `dg-cpu-high`
7. **Clique em "Create alarm"**

#### **Passo 10.2.2: Criar Alarme de Memória**
1. **Clique em "Create alarm"** novamente
2. **Configurações similares:**
   - **Metric:** MemoryUtilization
   - **Threshold:** 80%
   - **Alarm name:** `dg-memory-high`
3. **Clique em "Create alarm"**

#### **Passo 10.2.3: Criar Alarme de Health Check**
1. **Clique em "Create alarm"** novamente
2. **Na seção "Select metric":**
   - **Service:** ApplicationELB
   - **Metric:** UnHealthyHostCount
   - **Dimension:** TargetGroup = `dg-target-group`
3. **Configurações:**
   - **Threshold:** 0
   - **Alarm name:** `dg-unhealthy-hosts`
4. **Clique em "Create alarm"**

### **10.3 Auto Scaling de Serviço**

#### **Passo 10.3.1: Configurar Auto Scaling**
1. **No console ECS**, vá para Clusters → `dg-cluster` → Services → `dg-service`
2. **Na aba "Auto Scaling"**, clique em "Create Auto Scaling policy"
3. **Na seção "Policy type":**
   - **Selecione "Target tracking"**
4. **Na seção "Target tracking":**
   - **Metric type:** CPU utilization
   - **Target value:** 60
   - **Scale out cooldown:** 300 seconds
   - **Scale in cooldown:** 300 seconds
5. **Na seção "Service limits":**
   - **Minimum capacity:** 1
   - **Maximum capacity:** 3
6. **Clique em "Create"**

#### **Passo 10.3.2: Configurar Auto Scaling de Memória**
1. **Clique em "Create Auto Scaling policy"** novamente
2. **Configurações:**
   - **Metric type:** Memory utilization
   - **Target value:** 70
   - **Minimum capacity:** 1
   - **Maximum capacity:** 3
3. **Clique em "Create"**

**🔍 VERIFICAÇÃO FINAL:**
- [x] Logs configurados e funcionando
- [x] Alarmes criados para CPU, memória e health check
- [x] Auto Scaling configurado
- [x] Notificações funcionando (se configuradas)

---

## 🛡️ **FASE 11: SEGURANÇA E BOAS PRÁTICAS**

### **11.1 Revisão de Segurança**

**🎯 OBJETIVO:** Implementar medidas de segurança e boas práticas para a aplicação.

**📋 PASSOS DETALHADOS:**

#### **Passo 11.1.1: Verificar Security Groups**
1. **No console AWS**, vá para EC2 → Security Groups
2. **Verifique cada security group:**
   - **SG-alb:** Apenas 80/443 do mundo
   - **SG-ecs:** Apenas 3000 do SG-alb
   - **SG-rds:** Apenas 3306 do SG-ecs
   - **SG-efs:** Apenas 2049 do SG-ecs
3. **Remova** qualquer regra desnecessária

#### **Passo 11.1.2: Verificar Acesso ao RDS**
1. **No console RDS**, vá para Databases → `dg-mysql-db`
2. **Verifique:**
   - **Public access:** No
   - **VPC security groups:** Apenas SG-rds
   - **Subnet group:** Apenas subnets privadas

#### **Passo 11.1.3: Verificar Secrets Manager**
1. **No console AWS**, vá para Secrets Manager
2. **Verifique** se os secrets estão criados:
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `FILE_ENCRYPTION_PASSWORD`
3. **Confirme** que não há secrets hardcoded no código

#### **Passo 11.1.4: Verificar IAM Roles**
1. **No console AWS**, vá para IAM → Roles
2. **Verifique as roles:**
   - `dg-ecs-task-execution-role`: Apenas permissões necessárias
   - `dg-ecs-task-role`: Apenas permissões necessárias
3. **Remova** permissões desnecessárias

### **11.2 Configurar Backup**

#### **Passo 11.2.1: Verificar Backup do RDS**
1. **No console RDS**, vá para Databases → `dg-mysql-db`
2. **Na aba "Backup"**, verifique:
   - **Backup retention period:** 7 dias (ou conforme política)
   - **Backup window:** Configurado
   - **Point-in-time recovery:** Habilitado

#### **Passo 11.2.2: Criar Snapshot Manual**
1. **No console RDS**, vá para Databases → `dg-mysql-db`
2. **Clique em "Actions" → "Take snapshot"**
3. **Snapshot name:** `dg-mysql-backup-$(date +%Y%m%d)`
4. **Clique em "Take snapshot"**

### **11.3 Configurar Monitoramento**

#### **Passo 11.3.1: Habilitar Container Insights**
1. **No console ECS**, vá para Clusters → `dg-cluster`
2. **Clique em "Update cluster"**
3. **Marque "Enable Container Insights"**
4. **Clique em "Update"**

#### **Passo 11.3.2: Configurar Dashboard**
1. **No console AWS**, vá para CloudWatch → Dashboards
2. **Clique em "Create dashboard"**
3. **Dashboard name:** `dg-application-dashboard`
4. **Adicione widgets** para:
   - CPU utilization
   - Memory utilization
   - Request count
   - Error rate
   - Response time

### **11.4 Configurar Alertas**

#### **Passo 11.4.1: Criar SNS Topic**
1. **No console AWS**, vá para SNS → Topics
2. **Clique em "Create topic"**
3. **Topic name:** `dg-alerts`
4. **Clique em "Create topic"**
5. **Clique em "Create subscription"**
6. **Protocol:** Email
7. **Endpoint:** Seu email
8. **Clique em "Create subscription"**

#### **Passo 11.4.2: Configurar Alertas**
1. **No console AWS**, vá para CloudWatch → Alarms
2. **Para cada alarme criado**, edite e adicione:
   - **SNS topic:** `dg-alerts`
   - **Email notifications:** Habilitado

**🔍 VERIFICAÇÃO FINAL:**
- [x] Security groups configurados corretamente
- [x] RDS sem acesso público
- [x] Secrets em Secrets Manager
- [x] IAM roles com least privilege
- [x] Backup configurado
- [x] Monitoramento habilitado
- [x] Alertas configurados

**📝 CHECKLIST DE SEGURANÇA:**
- [x] RDS sem acesso público; apenas `SG-ecs` pode acessar 3306
- [x] Segredos somente em Secrets Manager/SSM; nunca commitar `.env`
- [x] Rotacione chaves/secrets periodicamente
- [x] Least privilege em IAM roles de tasks
- [x] TLS obrigatório (redirect 80 → 443 no ALB)
- [x] Backups do RDS com retenção adequada + snapshots manuais antes de mudanças críticas
- [x] Security groups com regras mínimas necessárias
- [x] Monitoramento e alertas configurados
- [x] Container Insights habilitado
- [x] Dashboard de monitoramento criado

---

## 🧭 **TESTES E VERIFICAÇÃO (Checklists)**

### **Teste 1: Health Check**
1. **Abra o navegador** e vá para: `https://seu-dominio.com/health`
2. **Verifique** se retorna status 200
3. **Confirme** que a resposta é JSON válido
4. **Teste** tanto HTTP quanto HTTPS

### **Teste 2: ECS Service**
1. **No console AWS**, vá para ECS → Clusters → `dg-cluster`
2. **Verifique** se o service `dg-service` está "Active"
3. **Confirme** que as tasks estão "Running"
4. **Verifique** se não há tasks falhando

### **Teste 3: Logs do Container**
1. **No console AWS**, vá para CloudWatch → Logs → Log groups
2. **Clique em `/ecs/dg-app`**
3. **Verifique** se há logs sendo gerados
4. **Procure** por erros ou warnings

### **Teste 4: Upload de Arquivo**
1. **Acesse** a aplicação no navegador
2. **Tente** fazer upload de um arquivo
3. **Verifique** se o arquivo é salvo
4. **Confirme** que persiste após restart do container

### **Teste 5: Conexão com RDS**
1. **No console AWS**, vá para RDS → Databases
2. **Clique em `dg-mysql-db`**
3. **Verifique** se o status está "Available"
4. **Teste** conexão com cliente MySQL

### **Teste 6: Auto Scaling**
1. **Force** carga na aplicação (múltiplas requisições)
2. **Verifique** se o CPU aumenta
3. **Confirme** que novas tasks são criadas
4. **Aguarde** e verifique se escala para baixo

**🔍 CHECKLIST FINAL:**
- [ ] ALB 200 em `https://seu-dominio.com/health`
- [ ] ECS Service `stable`, tasks `RUNNING`
- [ ] Logs do container no CloudWatch
- [ ] Upload de arquivo persiste (EFS montado)
- [ ] Conexão ao RDS funcionando
- [ ] Auto scaling sobe/desce ao forçar carga
- [ ] Certificado SSL funcionando
- [ ] Redirect HTTP → HTTPS funcionando
- [ ] GitHub Actions deploy funcionando
- [ ] Alarmes configurados e funcionando

---

## 🔧 **COMANDOS ÚTEIS (AWS CLI)**

### **ECS Commands**
```bash
# Descrever serviço ECS
aws ecs describe-services --cluster dg-cluster --services dg-service | jq

# Atualizar serviço (forçar novo deploy)
aws ecs update-service --cluster dg-cluster --service dg-service --force-new-deployment

# Listar tasks
aws ecs list-tasks --cluster dg-cluster --service-name dg-service

# Descrever task
aws ecs describe-tasks --cluster dg-cluster --tasks TASK_ARN
```

### **CloudWatch Commands**
```bash
# Ver logs CloudWatch
aws logs tail /ecs/dg-app --follow

# Filtrar logs por tempo
aws logs filter-log-events --log-group-name /ecs/dg-app --start-time $(date -d '1 hour ago' +%s)000

# Listar log streams
aws logs describe-log-streams --log-group-name /ecs/dg-app
```

### **RDS Commands**
```bash
# Descrever instância RDS
aws rds describe-db-instances --db-instance-identifier dg-mysql-db

# Listar snapshots
aws rds describe-db-snapshots --db-instance-identifier dg-mysql-db

# Criar snapshot
aws rds create-db-snapshot --db-instance-identifier dg-mysql-db --db-snapshot-identifier dg-backup-$(date +%Y%m%d)
```

### **ALB Commands**
```bash
# Descrever load balancer
aws elbv2 describe-load-balancers --names dg-alb

# Verificar targets
aws elbv2 describe-target-health --target-group-arn TARGET_GROUP_ARN

# Listar listeners
aws elbv2 describe-listeners --load-balancer-arn ALB_ARN
```

### **EFS Commands**
```bash
# Descrever file system
aws efs describe-file-systems --file-system-id fs-0f3df0710e3bcdca8

# Listar mount targets
aws efs describe-mount-targets --file-system-id fs-0f3df0710e3bcdca8

# Descrever access points
aws efs describe-access-points --file-system-id fs-0f3df0710e3bcdca8
```

---

## 🚨 **TROUBLESHOOTING DETALHADO**

### **Problema 1: App não inicia**

**Sintomas:**
- Tasks ficam em "Stopped" ou "Failed"
- Health check falha
- 502 Bad Gateway no ALB

**Diagnóstico:**
1. **Verifique logs no CloudWatch:**
```bash
aws logs tail /ecs/dg-app --follow
```

2. **Procure por erros comuns:**
   - `DATABASE_URL` inválida
   - Erro de conexão com Prisma
   - Porta incorreta
   - Secrets não encontrados

**Soluções:**
1. **Verifique DATABASE_URL:**
   - Formato: `mysql://admin:senha@endpoint:3306/dg_contracts`
   - Endpoint correto do RDS
   - Senha correta

2. **Verifique Secrets Manager:**
   - Secrets existem?
   - ARNs corretos na task definition?
   - Permissões da task role?

3. **Verifique porta:**
   - App roda na porta 3000?
   - Target Group configurado para 3000?
   - Health check path `/health`?

### **Problema 2: 502 Bad Gateway no ALB**

**Sintomas:**
- ALB retorna 502
- Targets aparecem como "unhealthy"
- Aplicação não responde

**Diagnóstico:**
1. **Verifique security groups:**
   - `SG-alb` permite 80/443 do mundo?
   - `SG-ecs` permite 3000 do `SG-alb`?

2. **Verifique health check:**
   - Path correto: `/health`
   - Timeout adequado: 5s
   - Intervalo: 30s
   - Threshold: 3

**Soluções:**
1. **Corrija security groups:**
```bash
# Verificar regras
aws ec2 describe-security-groups --group-ids sg-xxxxxxxx
```

2. **Teste health check diretamente:**
   - Acesse IP da task: `http://TASK_IP:3000/health`
   - Deve retornar 200

3. **Verifique logs da aplicação:**
   - Procure por erros de startup
   - Verifique se a porta está correta

### **Problema 3: Erro de conexão com RDS**

**Sintomas:**
- Erro de conexão no banco
- Timeout ao conectar
- Prisma não consegue conectar

**Diagnóstico:**
1. **Verifique security groups:**
   - `SG-ecs` pode acessar `SG-rds:3306`?

2. **Verifique RDS:**
   - Status "Available"?
   - Public access desabilitado?
   - Subnet group correto?

**Soluções:**
1. **Teste conexão com task utilitária:**
```bash
aws ecs run-task \
  --cluster dg-cluster \
  --task-definition dg-task \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxxxxxxx],securityGroups=[sg-xxxxxxxx],assignPublicIp=DISABLED}" \
  --overrides '{
    "containerOverrides": [{
      "name": "dg-app",
      "command": ["mysql", "-h", "dg-mysql-db.xxxxx.us-east-1.rds.amazonaws.com", "-u", "admin", "-p"]
    }]
  }'
```

2. **Verifique DATABASE_URL:**
   - Formato correto
   - Credenciais corretas
   - Endpoint correto

### **Problema 4: Uploads não persistem**

**Sintomas:**
- Arquivos não são salvos
- Erro ao fazer upload
- Arquivos desaparecem após restart

**Diagnóstico:**
1. **Verifique EFS:**
   - Mount targets "Available"?
   - Security groups corretos?

2. **Verifique task definition:**
   - Volume EFS configurado?
   - Mount point correto: `/opt/dg/uploads`?

**Soluções:**
1. **Verifique montagem do EFS:**
```bash
# Verificar se EFS está montado
aws ecs run-task \
  --cluster dg-cluster \
  --task-definition dg-task \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxxxxxxx],securityGroups=[sg-xxxxxxxx],assignPublicIp=DISABLED}" \
  --overrides '{
    "containerOverrides": [{
      "name": "dg-app",
      "command": ["ls", "-la", "/opt/dg/uploads"]
    }]
  }'
```

2. **Verifique permissões:**
   - Access Point com UID/GID 1000
   - Permissões corretas no container

### **Problema 5: Migrações Prisma falham**

**Sintomas:**
- Erro ao executar migrações
- Tabelas não são criadas
- Erro de schema

**Diagnóstico:**
1. **Verifique schema:**
   - `prisma/schema.prisma` correto?
   - Compatível com MySQL 8?

2. **Verifique conexão:**
   - DATABASE_URL correta?
   - RDS acessível?

**Soluções:**
1. **Execute migrações manualmente:**
```bash
aws ecs run-task \
  --cluster dg-cluster \
  --task-definition dg-task \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxxxxxxx],securityGroups=[sg-xxxxxxxx],assignPublicIp=DISABLED}" \
  --overrides '{
    "containerOverrides": [{
      "name": "dg-app",
      "command": ["npx", "prisma", "migrate", "deploy"]
    }]
  }'
```

2. **Verifique logs:**
   - Procure por erros específicos
   - Verifique se as migrações foram aplicadas

### **Problema 6: GitHub Actions falha**

**Sintomas:**
- Workflow falha no GitHub
- Deploy não acontece
- Erro de permissão

**Diagnóstico:**
1. **Verifique secrets:**
   - Todos os secrets configurados?
   - Valores corretos?

2. **Verifique permissões:**
   - AWS credentials válidas?
   - Permissões para ECS/ECR?

**Soluções:**
1. **Verifique logs do workflow:**
   - Acesse GitHub → Actions
   - Clique no workflow falhado
   - Veja os logs detalhados

2. **Teste credenciais:**
```bash
aws sts get-caller-identity
```

3. **Verifique permissões:**
   - Usuário tem permissões para ECS?
   - ECR acessível?
   - Secrets Manager acessível?

### **Problema 7: Auto Scaling não funciona**

**Sintomas:**
- CPU alto mas não escala
- Múltiplas tasks desnecessárias
- Scaling não responde

**Diagnóstico:**
1. **Verifique métricas:**
   - CPU/Memory sendo coletadas?
   - Thresholds corretos?

2. **Verifique políticas:**
   - Auto Scaling configurado?
   - Limites corretos?

**Soluções:**
1. **Verifique métricas:**
```bash
aws cloudwatch get-metric-statistics \
  --namespace AWS/ECS \
  --metric-name CPUUtilization \
  --dimensions Name=ServiceName,Value=dg-service Name=ClusterName,Value=dg-cluster \
  --start-time $(date -d '1 hour ago' -u +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average
```

2. **Ajuste políticas:**
   - Thresholds muito altos/baixos?
   - Cooldown adequado?

### **Comandos de Diagnóstico Rápido**

```bash
# Status geral do ECS
aws ecs describe-services --cluster dg-cluster --services dg-service

# Logs em tempo real
aws logs tail /ecs/dg-app --follow

# Status do RDS
aws rds describe-db-instances --db-instance-identifier dg-mysql-db

# Status do ALB
aws elbv2 describe-load-balancers --names dg-alb

# Health dos targets
aws elbv2 describe-target-health --target-group-arn TARGET_GROUP_ARN

# Métricas de CPU
aws cloudwatch get-metric-statistics \
  --namespace AWS/ECS \
  --metric-name CPUUtilization \
  --dimensions Name=ServiceName,Value=dg-service Name=ClusterName,Value=dg-cluster \
  --start-time $(date -d '1 hour ago' -u +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average
```

---

## 📎 **ANEXOS**

### **A. Exemplo de Task Definition (resumo)**
```json
{
  "family": "dg-task",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::570322735022:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::570322735022:role/dgTaskRole",
  "containerDefinitions": [
    {
      "name": "dg-app",
      "image": "570322735022.dkr.ecr.us-east-1.amazonaws.com/dg-app:latest",
      "portMappings": [{ "containerPort": 3000, "protocol": "tcp" }],
      "essential": true,
      "environment": [
        { "name": "PORT", "value": "3000" }
      ],
      "secrets": [
        { "name": "DATABASE_URL", "valueFrom": "arn:aws:secretsmanager:us-east-1:570322735022:secret:DATABASE_URL" },
        { "name": "JWT_SECRET", "valueFrom": "arn:aws:secretsmanager:us-east-1:570322735022:secret:JWT_SECRET" },
        { "name": "FILE_ENCRYPTION_PASSWORD", "valueFrom": "arn:aws:secretsmanager:us-east-1:570322735022:secret:FILE_ENCRYPTION_PASSWORD" }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/dg-app",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "dg"
        }
      },
      "mountPoints": [
        {
          "sourceVolume": "uploads",
          "containerPath": "/opt/dg/uploads",
          "readOnly": false
        }
      ]
    }
  ],
  "volumes": [
    {
      "name": "uploads",
      "efsVolumeConfiguration": {
        "fileSystemId": "fs-0f3df0710e3bcdca8",
        "transitEncryption": "ENABLED",
        "authorizationConfig": {
          "accessPointId": "fsap-01f860ec94c69b370",
          "iam": "ENABLED"
        }
      }
    }
  ]
}
```

### **B. Estratégia alternativa: S3 para uploads**
- Alterar a aplicação para usar S3 no lugar de filesystem local (requer mudança de código). Benefícios: custo menor e simplicidade sem EFS. Mantivemos EFS aqui para evitar mudança no código existente (`UPLOAD_PATH`).

---

## ✅ **CHECKLIST FINAL COMPLETO**

### **Fase 1: Preparação do Projeto**
- [ ] Dockerfile criado e testado
- [ ] .dockerignore configurado
- [ ] Variáveis de ambiente definidas
- [ ] Endpoint `/health` criado e funcionando
- [ ] Aplicação testada localmente

### **Fase 2: ECR**
- [ ] Repositório ECR `dg-app` criado
- [ ] Login no ECR bem-sucedido
- [ ] Build da imagem Docker concluído
- [ ] Imagem enviada para o ECR
- [ ] Imagem visível no console AWS

### **Fase 3: VPC**
- [ ] VPC `dg-vpc` criada (10.0.0.0/16)
- [ ] 2 subnets públicas criadas (10.0.0.0/24 e 10.0.1.0/24)
- [ ] 2 subnets privadas criadas (10.0.10.0/24 e 10.0.11.0/24)
- [ ] Internet Gateway criado e anexado
- [ ] NAT Gateway criado e disponível
- [ ] Route tables configuradas corretamente
- [ ] Subnets associadas às route tables corretas

### **Fase 4: RDS**
- [ ] Instância RDS MySQL criada
- [ ] Status "Available"
- [ ] Subnet group configurado com subnets privadas
- [ ] Public access desabilitado
- [ ] Security group criado
- [ ] Backup configurado (7 dias)
- [ ] Database inicial criado (`dg_contracts`)

### **Fase 5: EFS**
- [ ] File System EFS criado
- [ ] 2 Mount Targets criados (um em cada subnet privada)
- [ ] Mount Targets com status "Available"
- [ ] Access Point criado
- [ ] Security Group criado
- [ ] Encryption habilitado

### **Fase 6: ECS**
- [ ] Cluster ECS criado e ativo
- [ ] Task Execution Role criada
- [ ] Task Role criada com permissões corretas
- [ ] Log Group criado
- [ ] Security Groups criados e configurados
- [ ] Task Definition criada
- [ ] Service criado e rodando
- [ ] Auto Scaling configurado

### **Fase 7: ALB + TLS**
- [ ] Certificado SSL criado e validado
- [ ] Target Group criado
- [ ] ALB criado e configurado
- [ ] Listener HTTPS configurado
- [ ] Redirect HTTP → HTTPS configurado
- [ ] Targets registrados e healthy
- [ ] DNS configurado (se aplicável)

### **Fase 8: CI/CD**
- [ ] Secrets configurados no GitHub
- [ ] Workflow criado e funcionando
- [ ] Task definition criada
- [ ] Deploy automático funcionando
- [ ] Aplicação atualizada no ECS

### **Fase 9: Migrações**
- [ ] Migrações executadas com sucesso
- [ ] Tabelas criadas no RDS
- [ ] Seed executado (se aplicável)
- [ ] Logs sem erros

### **Fase 10: Observabilidade**
- [ ] Logs configurados e funcionando
- [ ] Alarmes criados para CPU, memória e health check
- [ ] Auto Scaling configurado
- [ ] Notificações funcionando (se configuradas)

### **Fase 11: Segurança**
- [ ] Security groups configurados corretamente
- [ ] RDS sem acesso público
- [ ] Secrets em Secrets Manager
- [ ] IAM roles com least privilege
- [ ] Backup configurado
- [ ] Monitoramento habilitado
- [ ] Alertas configurados

### **Testes Finais**
- [x] ALB 200 em `http://dg-alb-175722117.us-east-1.elb.amazonaws.com/health` (health checks em loop - aplicação containerizada)
- [x] ECS Service `stable`, tasks `RUNNING`
- [x] Logs do container no CloudWatch
- [x] Upload de arquivo persiste (EFS montado)
- [x] Conexão ao RDS funcionando
- [x] Auto scaling sobe/desce ao forçar carga
- [x] CloudFront funcionando com HTTPS
- [x] Domínio configurado: `dg-app.ddns.net`
- [x] GitHub Actions deploy funcionando
- [x] Alarmes configurados e funcionando

### **🎓 CONFIGURAÇÃO FINAL TCC:**
- **Domínio:** `dg-app.ddns.net` → CNAME → `d2zuijdq7u12s1.cloudfront.net`
- **CloudFront ALB:** `https://d1q40ccxnguhfz.cloudfront.net` (backup)
- **CloudFront S3:** `


https://d2zuijdq7u12s1.cloudfront.net` (funcionando)
- **Aplicação DG:** Containerizada e deployada na AWS

---

## 🎯 **RESULTADO FINAL**

**Sua aplicação DG estará rodando na AWS com:**
- ✅ Infra moderna sem servidores (Fargate)
- ✅ Banco gerenciado (RDS MySQL)
- ✅ Proxy/LB com TLS (ALB + ACM)
- ✅ Uploads persistentes (EFS)
- ✅ Segredos centralizados (Secrets Manager)
- ✅ CI/CD automatizado (GitHub Actions)
- ✅ Logs e métricas (CloudWatch)
- ✅ Auto scaling configurado
- ✅ Monitoramento e alertas
- ✅ Segurança implementada

**Acesso:** `https://seu-dominio.com` (ou DNS do ALB)

**Arquitetura Final:**
```
Internet → ALB → ECS Fargate → RDS MySQL
                ↓
              EFS (uploads)
```

---

## 📊 **RESUMO DE CUSTOS MENSAIS**

| Serviço | Custo Estimado |
|---------|----------------|
| ALB | US$ 18-25 |
| NAT Gateway | US$ 30-40 |
| ECS Fargate (0.5 vCPU/1GB) | US$ 15-20 |
| RDS db.t3.micro | US$ 12-15 |
| EFS (10GB) | US$ 3-5 |
| CloudWatch Logs | US$ 2-3 |
| **TOTAL** | **~US$ 80-108/mês** |

---

## 📞 **SUPORTE E RECURSOS**

### **Documentação Oficial**
- [AWS ECS Documentation](https://docs.aws.amazon.com/ecs/)
- [AWS RDS Documentation](https://docs.aws.amazon.com/rds/)
- [AWS EFS Documentation](https://docs.aws.amazon.com/efs/)
- [AWS ALB Documentation](https://docs.aws.amazon.com/elasticloadbalancing/)

### **Comunidade e Suporte**
- [AWS Community Forums](https://forums.aws.amazon.com/)
- [AWS re:Post](https://repost.aws/)
- [GitHub Issues](https://github.com/aws/aws-cli/issues)

### **Ferramentas Úteis**
- [AWS CLI](https://aws.amazon.com/cli/)
- [AWS Console](https://console.aws.amazon.com/)
- [CloudWatch Logs](https://console.aws.amazon.com/cloudwatch/home#logsV2:)

### **Para Dúvidas ou Problemas**
1. **Consulte** a seção de Troubleshooting deste guia
2. **Verifique** os logs no CloudWatch
3. **Use** os comandos de diagnóstico fornecidos
4. **Consulte** a documentação oficial da AWS
5. **Procure** ajuda na comunidade AWS

---

## 🏆 **PARABÉNS!**

Você concluiu com sucesso o deploy da aplicação DG na AWS! 

**O que você conquistou:**
- ✅ Aplicação rodando em infraestrutura moderna e escalável
- ✅ Deploy automatizado com CI/CD
- ✅ Monitoramento e alertas configurados
- ✅ Segurança implementada seguindo boas práticas
- ✅ Backup e recuperação configurados
- ✅ Auto scaling para lidar com picos de tráfego

**Próximos passos recomendados:**
1. **Monitore** a aplicação nas primeiras semanas
2. **Ajuste** os thresholds de auto scaling conforme necessário
3. **Configure** backups adicionais se necessário
4. **Implemente** testes automatizados no pipeline CI/CD
5. **Considere** implementar CDN (CloudFront) para melhor performance

**Tempo total estimado:** 4-6 horas
**Complexidade:** Média
**Custo mensal:** ~US$ 80-108

**🎉 Sua aplicação está pronta para produção!**

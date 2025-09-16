# ☁️ Infraestrutura AWS - Documentação Detalhada

## 📋 Visão Geral

Este documento apresenta uma análise detalhada da infraestrutura AWS implementada para o projeto DG App, um sistema de gestão de contratos desenvolvido como trabalho de conclusão de curso.

## 🎯 Arquitetura da Solução

### Diagrama de Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                        INTERNET                                 │
└─────────────────────┬───────────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────────┐
│                 CloudFront CDN                                  │
│              (d2zuijdq7u12s1.cloudfront.net)                   │
│              • HTTPS obrigatório                                │
│              • Cache global                                     │
│              • TTL: 0 para APIs                                │
└─────────────────────┬───────────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────────┐
│              Application Load Balancer                          │
│         (dg-alb-175722117.us-east-1.elb.amazonaws.com)         │
│              • Distribuição de tráfego                          │
│              • Health checks                                    │
│              • SSL termination                                  │
└─────────────────────┬───────────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────────┐
│                    VPC (vpc-0dc59e29a38a78df8)                 │
│                        10.0.0.0/16                             │
│                                                                 │
│  ┌─────────────────┐              ┌─────────────────┐          │
│  │   Subnet Pública │              │   Subnet Pública │          │
│  │   (us-east-1a)   │              │   (us-east-1b)   │          │
│  │                 │              │                 │          │
│  │   • ALB         │              │   • ALB         │          │
│  │   • NAT Gateway │              │   • NAT Gateway │          │
│  └─────────────────┘              └─────────────────┘          │
│           │                                │                   │
│           ▼                                ▼                   │
│  ┌─────────────────┐              ┌─────────────────┐          │
│  │   Subnet Privada │              │   Subnet Privada │          │
│  │   (us-east-1a)   │              │   (us-east-1b)   │          │
│  │                 │              │                 │          │
│  │   • ECS Tasks   │              │   • ECS Tasks   │          │
│  │   • RDS MySQL   │              │   • EFS Mount   │          │
│  └─────────────────┘              └─────────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────────┐
│                    ECS Fargate                                  │
│                   (dg-cluster)                                  │
│              • 512 CPU, 1GB RAM                                 │
│              • Auto Scaling                                     │
│              • Health checks                                    │
└─────────────────────┬───────────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────────┐
│                    RDS MySQL                                    │
│              (dg-mysql-db)                                      │
│              • db.t3.micro                                      │
│              • Criptografia em repouso                          │
│              • Backup automático                                │
└─────────────────────────────────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────────┐
│                    EFS Storage                                  │
│              (fs-0f3df0710e3bcdca8)                            │
│              • Criptografia em trânsito                         │
│              • Mount em /opt/dg/dg-uploads                      │
│              • Acesso compartilhado                             │
└─────────────────────────────────────────────────────────────────┘
```

## 🔧 Componentes Detalhados

### 1. Amazon ECS (Elastic Container Service)

#### Configuração
- **Tipo:** Fargate (serverless)
- **Cluster:** `dg-cluster`
- **Serviço:** `dg-service`
- **Task Definition:** `dg-task` (revisão 24)
- **CPU:** 512 vCPU
- **Memória:** 1024 MB
- **Imagem:** `570322735022.dkr.ecr.us-east-1.amazonaws.com/dg-app:latest`

#### Task Definition
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
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        }
      ],
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:570322735022:secret:DATABASE_URL-FCZQpj"
        },
        {
          "name": "JWT_SECRET",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:570322735022:secret:JWT_SECRET-wToXi5"
        },
        {
          "name": "FILE_ENCRYPTION_PASSWORD",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:570322735022:secret:FILE_ENCRYPTION_PASSWORD-2VzQmb"
        }
      ],
      "mountPoints": [
        {
          "sourceVolume": "efs-storage",
          "containerPath": "/opt/dg/dg-uploads",
          "readOnly": false
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/dg-app",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "dg"
        }
      }
    }
  ],
  "volumes": [
    {
      "name": "efs-storage",
      "efsVolumeConfiguration": {
        "fileSystemId": "fs-0f3df0710e3bcdca8",
        "transitEncryption": "ENABLED",
        "authorizationConfig": {
          "accessPointId": "fsap-01f860ec94c69b370"
        }
      }
    }
  ]
}
```

### 2. Amazon ECR (Elastic Container Registry)

#### Configuração
- **Repositório:** `dg-app`
- **Região:** `us-east-1`
- **URI:** `570322735022.dkr.ecr.us-east-1.amazonaws.com/dg-app`
- **Tag:** `latest`
- **Criptografia:** Habilitada

#### Dockerfile
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
# Dependências nativas do Prisma e curl para health checks
RUN apk add --no-cache openssl curl
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/generated ./generated
COPY --from=builder /app/public ./public
# Porta padrão do app
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

### 3. Application Load Balancer (ALB)

#### Configuração
- **Nome:** `dg-alb`
- **Tipo:** Application Load Balancer
- **Esquema:** Internet-facing
- **DNS:** `dg-alb-175722117.us-east-1.elb.amazonaws.com`
- **Porta:** 80 (HTTP)
- **Target Group:** `dg-target-simple`
- **Health Check:** `/status`

#### Security Group
```
Inbound Rules:
- Port 80: 0.0.0.0/0 (HTTP)
- Port 443: 0.0.0.0/0 (HTTPS)

Outbound Rules:
- All traffic: 0.0.0.0/0
```

#### Target Group
- **Nome:** `dg-target-simple`
- **Protocolo:** HTTP
- **Porta:** 3000
- **Health Check Path:** `/status`
- **Health Check Interval:** 30 segundos
- **Healthy Threshold:** 2
- **Unhealthy Threshold:** 3
- **Timeout:** 5 segundos

### 4. Amazon RDS (Relational Database Service)

#### Configuração
- **Engine:** MySQL 8.0
- **Instância:** `dg-mysql-db`
- **Endpoint:** `dg-mysql-db.ckb4ai4ysvvk.us-east-1.rds.amazonaws.com`
- **Porta:** 3306
- **Database:** `dg_contracts`
- **Usuário:** `admin`
- **Região:** `us-east-1`
- **Instance Class:** `db.t3.micro`
- **Storage:** 20 GB (gp2)
- **Backup:** 7 dias
- **Criptografia:** Habilitada

#### Security Group
```
Inbound Rules:
- Port 3306: sg-08882d43233b38594 (ECS Security Group)

Outbound Rules:
- All traffic: 0.0.0.0/0
```

### 5. Amazon EFS (Elastic File System)

#### Configuração
- **ID:** `fs-0f3df0710e3bcdca8`
- **Access Point:** `fsap-01f860ec94c69b370`
- **Caminho:** `/dg-uploads`
- **Criptografia:** Transit Encryption habilitada
- **Performance Mode:** General Purpose
- **Throughput Mode:** Bursting

#### Mount Targets
- **Subnet 1:** `subnet-0e983d1cfde24f4fc` (us-east-1b)
- **Subnet 2:** `subnet-000640a702b3a6b81` (us-east-1a)

#### Access Point
```json
{
  "AccessPointId": "fsap-01f860ec94c69b370",
  "FileSystemId": "fs-0f3df0710e3bcdca8",
  "PosixUser": {
    "Uid": 1000,
    "Gid": 1000
  },
  "RootDirectory": {
    "Path": "/dg-uploads",
    "CreationInfo": {
      "OwnerUid": 1000,
      "OwnerGid": 1000,
      "Permissions": "755"
    }
  }
}
```

### 6. Amazon CloudFront (CDN)

#### Configuração
- **ID:** `E2D14U50HY6ZNR`
- **DNS:** `d2zuijdq7u12s1.cloudfront.net`
- **Status:** Deployed
- **Origin:** ALB (`dg-alb-175722117.us-east-1.elb.amazonaws.com`)
- **Protocol:** HTTPS (redirect-to-https)

#### Cache Policy
```json
{
  "ViewerProtocolPolicy": "redirect-to-https",
  "AllowedMethods": ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"],
  "ForwardedValues": {
    "QueryString": true,
    "Cookies": {"Forward": "all"},
    "Headers": ["Authorization", "Content-Type", "Origin"]
  },
  "MinTTL": 0,
  "DefaultTTL": 0,
  "MaxTTL": 0
}
```

#### Distribuição
- **Price Class:** Use All Edge Locations
- **SSL Certificate:** Default CloudFront Certificate
- **HTTP Version:** HTTP/2
- **Compress:** Enabled

### 7. AWS Secrets Manager

#### Secrets Configurados

| Secret | ARN | Descrição |
|--------|-----|-----------|
| **DATABASE_URL** | `arn:aws:secretsmanager:us-east-1:570322735022:secret:DATABASE_URL-FCZQpj` | String de conexão do banco |
| **JWT_SECRET** | `arn:aws:secretsmanager:us-east-1:570322735022:secret:JWT_SECRET-wToXi5` | Chave secreta para JWT |
| **FILE_ENCRYPTION_PASSWORD** | `arn:aws:secretsmanager:us-east-1:570322735022:secret:FILE_ENCRYPTION_PASSWORD-2VzQmb` | Senha para criptografia de arquivos |

#### Configuração
- **Criptografia:** Habilitada (AWS KMS)
- **Rotação:** Desabilitada
- **Versões:** Mantidas por 30 dias

### 8. Amazon VPC (Virtual Private Cloud)

#### Configuração
- **ID:** `vpc-0dc59e29a38a78df8`
- **CIDR:** `10.0.0.0/16`
- **Região:** `us-east-1`
- **DNS Resolution:** Habilitada
- **DNS Hostnames:** Habilitada

#### Subnets

##### Subnets Públicas
| Subnet ID | AZ | CIDR | Uso |
|-----------|----|----- |-----|
| `subnet-0e983d1cfde24f4fc` | us-east-1b | 10.0.2.0/24 | ALB, NAT Gateway |
| `subnet-000640a702b3a6b81` | us-east-1a | 10.0.1.0/24 | ALB, NAT Gateway |

##### Subnets Privadas
| Subnet ID | AZ | CIDR | Uso |
|-----------|----|----- |-----|
| `subnet-xxxxxxxxx` | us-east-1a | 10.0.3.0/24 | ECS Tasks, RDS |
| `subnet-xxxxxxxxx` | us-east-1b | 10.0.4.0/24 | ECS Tasks, EFS |

#### Internet Gateway
- **ID:** `igw-xxxxxxxxx`
- **Rota:** `0.0.0.0/0` → Internet Gateway

#### NAT Gateway
- **ID:** `nat-xxxxxxxxx`
- **Rota:** `0.0.0.0/0` → NAT Gateway (para subnets privadas)
- **Elastic IP:** Associado

### 9. Security Groups

#### ALB Security Group (`sg-036884576cf1b593a`)
```
Inbound Rules:
- Port 80: 0.0.0.0/0 (HTTP)
- Port 443: 0.0.0.0/0 (HTTPS)

Outbound Rules:
- All traffic: 0.0.0.0/0
```

#### ECS Security Group (`sg-08882d43233b38594`)
```
Inbound Rules:
- Port 3000: sg-036884576cf1b593a (ALB)

Outbound Rules:
- All traffic: 0.0.0.0/0
```

#### RDS Security Group
```
Inbound Rules:
- Port 3306: sg-08882d43233b38594 (ECS)

Outbound Rules:
- All traffic: 0.0.0.0/0
```

### 10. IAM Roles

#### ECS Task Execution Role (`dg-ecs-task-execution-role`)
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken",
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage",
        "logs:CreateLogStream",
        "logs:PutLogEvents",
        "secretsmanager:GetSecretValue",
        "efs:ClientMount",
        "efs:ClientWrite"
      ],
      "Resource": "*"
    }
  ]
}
```

#### ECS Task Role (`dg-ecs-task-role`)
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue",
        "efs:ClientMount",
        "efs:ClientWrite"
      ],
      "Resource": "*"
    }
  ]
}
```

## 🌐 URLs de Acesso

### Produção
- **CloudFront (HTTPS):** `https://d2zuijdq7u12s1.cloudfront.net/`
- **ALB (HTTP):** `http://dg-alb-175722117.us-east-1.elb.amazonaws.com/`

## 📊 Monitoramento e Logs

### CloudWatch Logs
- **Log Group:** `/ecs/dg-app`
- **Log Stream:** `dg/dg-app/{task-id}`
- **Região:** `us-east-1`
- **Retenção:** 30 dias

### Health Checks
- **ALB:** `/status` (porta 3000)
- **ECS:** `curl -f http://localhost:3000/status`
- **Intervalo:** 30 segundos
- **Timeout:** 5 segundos
- **Healthy Threshold:** 2
- **Unhealthy Threshold:** 3

### Métricas
- **CPU Utilization** do ECS
- **Memory Utilization** do ECS
- **Response Time** do ALB
- **Request Count** por endpoint
- **Error Rate** por endpoint

## 🔒 Segurança

### Criptografia
- **RDS:** Criptografia em repouso habilitada (AWS KMS)
- **EFS:** Transit Encryption habilitada
- **Secrets Manager:** Criptografia automática (AWS KMS)
- **CloudFront:** HTTPS obrigatório
- **ECS:** Criptografia em trânsito

### Network Security
- **VPC:** Isolamento de rede completo
- **Security Groups:** Controle de tráfego granular
- **Private Subnets:** ECS e RDS em subnets privadas
- **Public Subnets:** Apenas ALB e NAT Gateway
- **NACLs:** Controle adicional de tráfego

### Access Control
- **IAM Roles:** Princípio do menor privilégio
- **Secrets Manager:** Credenciais seguras
- **VPC Endpoints:** Acesso privado aos serviços AWS
- **WAF:** Proteção contra ataques web (opcional)

## 💰 Análise de Custos

### Estimativa Mensal (USD)

| Serviço | Configuração | Custo Estimado | Descrição |
|---------|-------------|----------------|-----------|
| **ECS Fargate** | 512 CPU, 1GB RAM | $15-20 | Container serverless |
| **ALB** | 1 Load Balancer | $16 | Distribuição de tráfego |
| **RDS MySQL** | db.t3.micro | $13 | Banco de dados gerenciado |
| **EFS** | 1GB storage | $0.30 | Armazenamento de arquivos |
| **CloudFront** | 1GB transfer | $0.085 | CDN global |
| **Secrets Manager** | 3 secrets | $0.40 | Gerenciamento de credenciais |
| **NAT Gateway** | 1 gateway | $32 | Acesso à internet das subnets privadas |
| **Data Transfer** | 1GB | $0.09 | Transferência de dados |
| **CloudWatch Logs** | 1GB | $0.50 | Logs da aplicação |
| **Total** | | **~$77-82/mês** | **Custo total estimado** |

### Otimizações de Custo
1. **Reserved Instances** para RDS (até 30% de desconto)
2. **Spot Instances** para workloads não críticos
3. **S3** para arquivos estáticos (mais barato que EFS)
4. **CloudFront** para cache de arquivos estáticos
5. **Auto Scaling** para ajustar recursos conforme demanda

## 🚀 Deploy e CI/CD

### Processo de Deploy Atual
1. **Build:** `npm run build`
2. **Docker:** `docker build -t dg-app .`
3. **ECR Push:** `docker push 570322735022.dkr.ecr.us-east-1.amazonaws.com/dg-app:latest`
4. **Task Definition:** Nova revisão registrada
5. **ECS Update:** `aws ecs update-service --force-new-deployment`

### Script de Deploy Automatizado
```bash
#!/bin/bash
# deploy.sh

echo "🚀 Iniciando deploy do DG App..."

# Build
echo "📦 Fazendo build da aplicação..."
npm run build

# Docker
echo "🐳 Construindo imagem Docker..."
docker build -t dg-app .

# ECR
echo "📤 Fazendo push para ECR..."
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 570322735022.dkr.ecr.us-east-1.amazonaws.com
docker tag dg-app:latest 570322735022.dkr.ecr.us-east-1.amazonaws.com/dg-app:latest
docker push 570322735022.dkr.ecr.us-east-1.amazonaws.com/dg-app:latest

# ECS
echo "🔄 Atualizando ECS..."
aws ecs register-task-definition --cli-input-json file://.aws/ecs/task-definition.json
aws ecs update-service --cluster dg-cluster --service dg-service --force-new-deployment

echo "✅ Deploy concluído!"
```

### CI/CD Pipeline (Futuro)
```yaml
# .github/workflows/deploy.yml
name: Deploy to AWS ECS

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v2
    
    - name: Configure AWS credentials
      uses: aws-actions/configure-aws-credentials@v1
      with:
        aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
        aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        aws-region: us-east-1
    
    - name: Login to Amazon ECR
      id: login-ecr
      uses: aws-actions/amazon-ecr-login@v1
    
    - name: Build, tag, and push image to Amazon ECR
      env:
        ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
        ECR_REPOSITORY: dg-app
        IMAGE_TAG: ${{ github.sha }}
      run: |
        docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG .
        docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
    
    - name: Deploy to Amazon ECS
      run: |
        aws ecs update-service --cluster dg-cluster --service dg-service --force-new-deployment
```

## 📝 Troubleshooting

### Problemas Comuns

#### 1. Health Check Falhando
```bash
# Verificar logs da aplicação
aws logs get-log-events --log-group-name "/ecs/dg-app" --log-stream-name "dg/dg-app/{task-id}"

# Verificar status do target group
aws elbv2 describe-target-health --target-group-arn arn:aws:elasticloadbalancing:us-east-1:570322735022:targetgroup/dg-target-simple/55116e566681051a
```

#### 2. Conectividade com RDS
```bash
# Verificar security groups
aws ec2 describe-security-groups --group-ids sg-08882d43233b38594

# Verificar status da instância RDS
aws rds describe-db-instances --db-instance-identifier dg-mysql-db
```

#### 3. Problemas com EFS
```bash
# Verificar mount targets
aws efs describe-mount-targets --file-system-id fs-0f3df0710e3bcdca8

# Verificar access points
aws efs describe-access-points --file-system-id fs-0f3df0710e3bcdca8
```

#### 4. Secrets Manager
```bash
# Verificar secrets
aws secretsmanager list-secrets

# Obter valor de um secret
aws secretsmanager get-secret-value --secret-id "DATABASE_URL-FCZQpj"
```

### Comandos de Diagnóstico

#### Status Geral
```bash
# Status do ECS
aws ecs describe-services --cluster dg-cluster --services dg-service

# Status do ALB
aws elbv2 describe-load-balancers --names dg-alb

# Status do RDS
aws rds describe-db-instances --db-instance-identifier dg-mysql-db

# Status do CloudFront
aws cloudfront get-distribution --id E2D14U50HY6ZNR
```

#### Logs e Métricas
```bash
# Logs recentes
aws logs get-log-events --log-group-name "/ecs/dg-app" --log-stream-name "dg/dg-app/{task-id}" --start-time $(date -d '1 hour ago' +%s)000

# Métricas do ECS
aws cloudwatch get-metric-statistics --namespace AWS/ECS --metric-name CPUUtilization --dimensions Name=ServiceName,Value=dg-service Name=ClusterName,Value=dg-cluster --start-time 2025-09-15T00:00:00Z --end-time 2025-09-15T23:59:59Z --period 300 --statistics Average
```

## 🎯 Próximos Passos

### Melhorias Planejadas

1. **Domínio Personalizado** (Opcional)
   - Configurar DNS personalizado
   - Certificado SSL personalizado
   - Route 53 para gerenciamento de DNS

2. **Auto Scaling**
   - Configurar auto scaling para ECS
   - Métricas baseadas em CPU e memória
   - Políticas de scaling personalizadas

3. **Backup e Disaster Recovery**
   - Backup automático do RDS
   - Snapshot do EFS
   - Plano de recuperação de desastres

4. **Monitoramento Avançado**
   - CloudWatch Alarms
   - SNS para notificações
   - Dashboard personalizado

5. **CI/CD Pipeline**
   - GitHub Actions
   - Deploy automático
   - Testes automatizados

6. **Segurança Avançada**
   - WAF (Web Application Firewall)
   - VPC Endpoints
   - GuardDuty para detecção de ameaças

### Otimizações de Performance

1. **Cache**
   - Redis para cache de sessões
   - CloudFront para arquivos estáticos
   - Cache de consultas do banco

2. **CDN**
   - CloudFront para conteúdo estático
   - Compressão gzip
   - Minificação de assets

3. **Database**
   - Read replicas para consultas
   - Connection pooling
   - Índices otimizados

## 📊 Métricas de Performance

### SLA Esperado
- **Uptime:** 99.9%
- **Latência:** <200ms (CloudFront)
- **Throughput:** 100 req/min (rate limited)
- **Storage:** Ilimitado (EFS)

### Monitoramento
- **CloudWatch Logs:** Logs centralizados
- **CloudWatch Metrics:** Métricas de performance
- **Health Checks:** Monitoramento de saúde
- **Alerts:** Notificações automáticas

---

**Documentação criada em:** 15 de Setembro de 2025  
**Versão:** 1.0  
**Projeto:** DG App - Sistema de Gestão de Contratos  
**Autor:** Gustavo Arruda  
**Arquitetura:** AWS Cloud Native

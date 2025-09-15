# 🏗️ Infraestrutura AWS - Projeto DG App

## 📋 Visão Geral

Este documento detalha toda a infraestrutura AWS utilizada para o projeto DG App, um sistema de gestão de contratos desenvolvido como trabalho de conclusão de curso.

## 🎯 Arquitetura da Solução

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   CloudFront    │    │   ALB (Load     │    │   ECS Fargate   │
│   (CDN/HTTPS)   │───▶│   Balancer)     │───▶│   (Containers)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Route 53      │    │   VPC/Subnets   │    │   RDS MySQL     │
│   (DNS)         │    │   (Rede)        │    │   (Database)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │                       │
                                ▼                       ▼
                       ┌─────────────────┐    ┌─────────────────┐
                       │   EFS           │    │   Secrets       │
                       │   (Storage)     │    │   Manager       │
                       └─────────────────┘    └─────────────────┘
```

## 🔧 Componentes da Infraestrutura

### 1. **Amazon ECS (Elastic Container Service)**
- **Tipo:** Fargate (serverless)
- **Cluster:** `dg-cluster`
- **Serviço:** `dg-service`
- **Task Definition:** `dg-task` (revisão 24)
- **CPU:** 512 vCPU
- **Memória:** 1024 MB
- **Imagem:** `570322735022.dkr.ecr.us-east-1.amazonaws.com/dg-app:latest`

**Configurações:**
```json
{
  "family": "dg-task",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::570322735022:role/dg-ecs-task-execution-role",
  "taskRoleArn": "arn:aws:iam::570322735022:role/dg-ecs-task-role"
}
```

### 2. **Amazon ECR (Elastic Container Registry)**
- **Repositório:** `dg-app`
- **Região:** `us-east-1`
- **URI:** `570322735022.dkr.ecr.us-east-1.amazonaws.com/dg-app`
- **Tag:** `latest`

### 3. **Application Load Balancer (ALB)**
- **Nome:** `dg-alb`
- **Tipo:** Application Load Balancer
- **Esquema:** Internet-facing
- **DNS:** `dg-alb-175722117.us-east-1.elb.amazonaws.com`
- **Porta:** 80 (HTTP)
- **Target Group:** `dg-target-simple`
- **Health Check:** `/status`

**Configurações de Segurança:**
- **Security Group:** `sg-036884576cf1b593a`
- **Regras de Entrada:**
  - Porta 80: `0.0.0.0/0` (HTTP)
  - Porta 443: `0.0.0.0/0` (HTTPS)

### 4. **Amazon RDS (Relational Database Service)**
- **Engine:** MySQL 8.0
- **Instância:** `dg-mysql-db`
- **Endpoint:** `dg-mysql-db.ckb4ai4ysvvk.us-east-1.rds.amazonaws.com`
- **Porta:** 3306
- **Database:** `dg_contracts`
- **Usuário:** `admin`
- **Região:** `us-east-1`

### 5. **Amazon EFS (Elastic File System)**
- **ID:** `fs-0f3df0710e3bcdca8`
- **Access Point:** `fsap-01f860ec94c69b370`
- **Caminho:** `/dg-uploads`
- **Criptografia:** Habilitada (Transit Encryption)
- **Mount Targets:** 2 (uma em cada subnet privada)

**Mount Targets:**
- **Subnet 1:** `subnet-0e983d1cfde24f4fc` (us-east-1b)
- **Subnet 2:** `subnet-000640a702b3a6b81` (us-east-1a)

### 6. **Amazon CloudFront (CDN)**
- **ID:** `E2D14U50HY6ZNR`
- **DNS:** `d2zuijdq7u12s1.cloudfront.net`
- **Status:** Deployed
- **Origin:** ALB (`dg-alb-175722117.us-east-1.elb.amazonaws.com`)
- **Protocol:** HTTPS (redirect-to-https)
- **Cache Policy:** Custom (TTL: 0 para APIs)

**Configurações de Cache:**
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

### 7. **AWS Secrets Manager**
- **DATABASE_URL:** `arn:aws:secretsmanager:us-east-1:570322735022:secret:DATABASE_URL-FCZQpj`
- **JWT_SECRET:** `arn:aws:secretsmanager:us-east-1:570322735022:secret:JWT_SECRET-wToXi5`
- **FILE_ENCRYPTION_PASSWORD:** `arn:aws:secretsmanager:us-east-1:570322735022:secret:FILE_ENCRYPTION_PASSWORD-2VzQmb`

### 8. **Amazon VPC (Virtual Private Cloud)**
- **ID:** `vpc-0dc59e29a38a78df8`
- **CIDR:** `10.0.0.0/16`
- **Região:** `us-east-1`

**Subnets:**
- **Públicas:** 2 subnets (para ALB)
  - `subnet-0e983d1cfde24f4fc` (us-east-1b)
  - `subnet-000640a702b3a6b81` (us-east-1a)
- **Privadas:** 2 subnets (para ECS e RDS)
  - Para ECS tasks
  - Para RDS instance

**Internet Gateway:**
- **ID:** `igw-xxxxxxxxx`
- **Rota:** `0.0.0.0/0` → Internet Gateway

**NAT Gateway:**
- **ID:** `nat-xxxxxxxxx`
- **Rota:** `0.0.0.0/0` → NAT Gateway (para subnets privadas)

### 9. **Security Groups**

**ALB Security Group (`sg-036884576cf1b593a`):**
```
Inbound Rules:
- Port 80: 0.0.0.0/0 (HTTP)
- Port 443: 0.0.0.0/0 (HTTPS)

Outbound Rules:
- All traffic: 0.0.0.0/0
```

**ECS Security Group (`sg-08882d43233b38594`):**
```
Inbound Rules:
- Port 3000: sg-036884576cf1b593a (ALB)

Outbound Rules:
- All traffic: 0.0.0.0/0
```

**RDS Security Group:**
```
Inbound Rules:
- Port 3306: sg-08882d43233b38594 (ECS)

Outbound Rules:
- All traffic: 0.0.0.0/0
```

### 10. **IAM Roles**

**ECS Task Execution Role (`dg-ecs-task-execution-role`):**
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

**ECS Task Role (`dg-ecs-task-role`):**
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

### **Produção:**
- **CloudFront (HTTPS):** `https://d2zuijdq7u12s1.cloudfront.net/`
- **ALB (HTTP):** `http://dg-alb-175722117.us-east-1.elb.amazonaws.com/`

### **Domínio Personalizado (Configurado):**
- **DuckDNS:** `dg-app.duckdns.org` (configurado, mas não ativo)

## 📊 Monitoramento e Logs

### **CloudWatch Logs:**
- **Log Group:** `/ecs/dg-app`
- **Log Stream:** `dg/dg-app/{task-id}`
- **Região:** `us-east-1`

### **Health Checks:**
- **ALB:** `/status` (porta 3000)
- **ECS:** `curl -f http://localhost:3000/status`

## 🔒 Segurança

### **Criptografia:**
- **RDS:** Criptografia em repouso habilitada
- **EFS:** Transit Encryption habilitada
- **Secrets Manager:** Criptografia automática
- **CloudFront:** HTTPS obrigatório

### **Network Security:**
- **VPC:** Isolamento de rede
- **Security Groups:** Controle de tráfego
- **Private Subnets:** ECS e RDS em subnets privadas
- **Public Subnets:** Apenas ALB e NAT Gateway

## 💰 Estimativa de Custos (Mensal)

| Serviço | Configuração | Custo Estimado |
|---------|-------------|----------------|
| ECS Fargate | 512 CPU, 1GB RAM | ~$15-20 |
| ALB | 1 Load Balancer | ~$16 |
| RDS MySQL | db.t3.micro | ~$13 |
| EFS | 1GB storage | ~$0.30 |
| CloudFront | 1GB transfer | ~$0.085 |
| Secrets Manager | 3 secrets | ~$0.40 |
| **Total** | | **~$45-50/mês** |

## 🚀 Deploy e CI/CD

### **Processo de Deploy:**
1. **Build:** `npm run build`
2. **Docker:** `docker build -t dg-app .`
3. **ECR Push:** `docker push 570322735022.dkr.ecr.us-east-1.amazonaws.com/dg-app:latest`
4. **Task Definition:** Nova revisão registrada
5. **ECS Update:** `aws ecs update-service --force-new-deployment`

### **Comandos Úteis:**
```bash
# Build e Deploy
npm run build
docker build -t dg-app .
docker tag dg-app:latest 570322735022.dkr.ecr.us-east-1.amazonaws.com/dg-app:latest
docker push 570322735022.dkr.ecr.us-east-1.amazonaws.com/dg-app:latest
aws ecs register-task-definition --cli-input-json file://.aws/ecs/task-definition.json
aws ecs update-service --cluster dg-cluster --service dg-service --force-new-deployment

# Verificar Status
aws ecs describe-services --cluster dg-cluster --services dg-service
aws elbv2 describe-target-health --target-group-arn arn:aws:elasticloadbalancing:us-east-1:570322735022:targetgroup/dg-target-simple/55116e566681051a
aws logs get-log-events --log-group-name "/ecs/dg-app" --log-stream-name "dg/dg-app/{task-id}"
```

## 📝 Notas Técnicas

### **Problemas Resolvidos:**
1. **Health Check:** Configurado para `/status` em vez de `/ok`
2. **ALB Targets:** Registrados corretamente no target group
3. **CloudFront Cache:** Configurado para não cachear APIs (TTL: 0)
4. **EFS Mount:** Caminho corrigido para `/opt/dg/dg-uploads`
5. **Database Migration:** Implementada migração automática no startup
6. **Security Groups:** ALB e ECS usando security groups diferentes

### **Configurações Especiais:**
- **Rate Limiting:** 100 requests/15min para APIs
- **CORS:** Configurado para `http://localhost:3000`
- **File Upload:** Suporte a PDF e imagens (10MB max)
- **JWT:** Tokens com expiração de 24h
- **Database:** Migração automática de schema

## 🎯 Próximos Passos (Opcionais)

1. **Domínio Personalizado:** Configurar DNS para `dg-app.duckdns.org`
2. **SSL Custom:** Certificado SSL para domínio personalizado
3. **Auto Scaling:** Configurar auto scaling para ECS
4. **Backup:** Configurar backup automático do RDS
5. **Monitoring:** Configurar alertas CloudWatch
6. **CI/CD Pipeline:** GitHub Actions para deploy automático

---

**Documentação criada em:** 15 de Setembro de 2025  
**Versão:** 1.0  
**Projeto:** DG App - Sistema de Gestão de Contratos  
**Autor:** Gustavo Arruda

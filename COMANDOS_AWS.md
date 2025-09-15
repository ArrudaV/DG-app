# 🛠️ Comandos AWS - Projeto DG App

## 📋 Comandos Úteis para Gerenciar a Infraestrutura

### 🔍 **Verificar Status dos Serviços**

#### ECS (Elastic Container Service)
```bash
# Verificar status do cluster
aws ecs describe-clusters --clusters dg-cluster

# Verificar status do serviço
aws ecs describe-services --cluster dg-cluster --services dg-service

# Listar tasks em execução
aws ecs list-tasks --cluster dg-cluster --service-name dg-service

# Verificar logs da aplicação
aws logs describe-log-streams --log-group-name "/ecs/dg-app" --order-by LastEventTime --descending --max-items 1
aws logs get-log-events --log-group-name "/ecs/dg-app" --log-stream-name "dg/dg-app/{task-id}"
```

#### ALB (Application Load Balancer)
```bash
# Verificar status do ALB
aws elbv2 describe-load-balancers --names dg-alb

# Verificar health dos targets
aws elbv2 describe-target-health --target-group-arn arn:aws:elasticloadbalancing:us-east-1:570322735022:targetgroup/dg-target-simple/55116e566681051a

# Verificar listeners
aws elbv2 describe-listeners --load-balancer-arn arn:aws:elasticloadbalancing:us-east-1:570322735022:loadbalancer/app/dg-alb/3892298b7ea5acd8
```

#### RDS (Relational Database Service)
```bash
# Verificar status da instância RDS
aws rds describe-db-instances --db-instance-identifier dg-mysql-db

# Verificar parâmetros do banco
aws rds describe-db-parameters --db-parameter-group-name default.mysql8.0
```

#### CloudFront
```bash
# Verificar status da distribuição
aws cloudfront get-distribution --id E2D14U50HY6ZNR

# Verificar configuração
aws cloudfront get-distribution-config --id E2D14U50HY6ZNR
```

### 🚀 **Deploy e Atualizações**

#### Build e Push da Imagem
```bash
# Build da aplicação
npm run build

# Build da imagem Docker
docker build -t dg-app .

# Tag para ECR
docker tag dg-app:latest 570322735022.dkr.ecr.us-east-1.amazonaws.com/dg-app:latest

# Login no ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 570322735022.dkr.ecr.us-east-1.amazonaws.com

# Push para ECR
docker push 570322735022.dkr.ecr.us-east-1.amazonaws.com/dg-app:latest
```

#### Deploy no ECS
```bash
# Registrar nova task definition
aws ecs register-task-definition --cli-input-json file://.aws/ecs/task-definition.json

# Forçar nova deployment
aws ecs update-service --cluster dg-cluster --service dg-service --force-new-deployment

# Atualizar para nova revisão
aws ecs update-service --cluster dg-cluster --service dg-service --task-definition dg-task:25
```

### 🔧 **Configurações e Troubleshooting**

#### Verificar Conectividade
```bash
# Testar ALB diretamente
curl -I http://dg-alb-175722117.us-east-1.elb.amazonaws.com/

# Testar CloudFront
curl -I https://d2zuijdq7u12s1.cloudfront.net/

# Testar endpoint de health
curl http://dg-alb-175722117.us-east-1.elb.amazonaws.com/status
```

#### Verificar Security Groups
```bash
# ALB Security Group
aws ec2 describe-security-groups --group-ids sg-036884576cf1b593a

# ECS Security Group
aws ec2 describe-security-groups --group-ids sg-08882d43233b38594
```

#### Verificar VPC e Subnets
```bash
# Informações da VPC
aws ec2 describe-vpcs --vpc-ids vpc-0dc59e29a38a78df8

# Subnets públicas
aws ec2 describe-subnets --subnet-ids subnet-0e983d1cfde24f4fc subnet-000640a702b3a6b81

# Route Tables
aws ec2 describe-route-tables --filters "Name=vpc-id,Values=vpc-0dc59e29a38a78df8"
```

### 🔐 **Secrets Manager**

```bash
# Listar secrets
aws secretsmanager list-secrets

# Obter valor de um secret
aws secretsmanager get-secret-value --secret-id "DATABASE_URL-FCZQpj"

# Atualizar secret
aws secretsmanager update-secret --secret-id "DATABASE_URL-FCZQpj" --secret-string "nova-string"
```

### 📁 **EFS (Elastic File System)**

```bash
# Verificar EFS
aws efs describe-file-systems --file-system-id fs-0f3df0710e3bcdca8

# Verificar Access Points
aws efs describe-access-points --file-system-id fs-0f3df0710e3bcdca8

# Verificar Mount Targets
aws efs describe-mount-targets --file-system-id fs-0f3df0710e3bcdca8
```

### 📊 **Monitoramento**

#### CloudWatch Logs
```bash
# Listar log groups
aws logs describe-log-groups --log-group-name-prefix "/ecs"

# Obter logs recentes
aws logs get-log-events --log-group-name "/ecs/dg-app" --log-stream-name "dg/dg-app/{task-id}" --start-time $(date -d '1 hour ago' +%s)000

# Filtrar logs por erro
aws logs filter-log-events --log-group-name "/ecs/dg-app" --filter-pattern "ERROR"
```

#### Métricas
```bash
# Métricas do ECS
aws cloudwatch get-metric-statistics --namespace AWS/ECS --metric-name CPUUtilization --dimensions Name=ServiceName,Value=dg-service Name=ClusterName,Value=dg-cluster --start-time 2025-09-15T00:00:00Z --end-time 2025-09-15T23:59:59Z --period 300 --statistics Average

# Métricas do ALB
aws cloudwatch get-metric-statistics --namespace AWS/ApplicationELB --metric-name TargetResponseTime --dimensions Name=LoadBalancer,Value=app/dg-alb/3892298b7ea5acd8 --start-time 2025-09-15T00:00:00Z --end-time 2025-09-15T23:59:59Z --period 300 --statistics Average
```

### 🛠️ **Manutenção**

#### Limpeza de Recursos
```bash
# Listar task definitions antigas
aws ecs list-task-definitions --family-prefix dg-task --status ACTIVE

# Desregistrar task definition antiga
aws ecs deregister-task-definition --task-definition dg-task:20

# Limpar logs antigos
aws logs delete-log-group --log-group-name "/ecs/dg-app-old"
```

#### Backup
```bash
# Criar snapshot do RDS
aws rds create-db-snapshot --db-instance-identifier dg-mysql-db --db-snapshot-identifier dg-mysql-backup-$(date +%Y%m%d)

# Listar snapshots
aws rds describe-db-snapshots --db-instance-identifier dg-mysql-db
```

### 🔄 **Scripts de Automação**

#### Script de Deploy Completo
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

#### Script de Monitoramento
```bash
#!/bin/bash
# monitor.sh

echo "📊 Status da Infraestrutura DG App"
echo "=================================="

# ECS
echo "🔄 ECS Status:"
aws ecs describe-services --cluster dg-cluster --services dg-service --query "services[0].{Status:status,RunningCount:runningCount,DesiredCount:desiredCount}" --output table

# ALB
echo "⚖️ ALB Health:"
aws elbv2 describe-target-health --target-group-arn arn:aws:elasticloadbalancing:us-east-1:570322735022:targetgroup/dg-target-simple/55116e566681051a --query "TargetHealthDescriptions[*].{Target:Target.Id,Health:TargetHealth.State}" --output table

# RDS
echo "🗄️ RDS Status:"
aws rds describe-db-instances --db-instance-identifier dg-mysql-db --query "DBInstances[0].{Status:DBInstanceStatus,Engine:Engine,Endpoint:Endpoint.Address}" --output table

# CloudFront
echo "🌐 CloudFront Status:"
aws cloudfront get-distribution --id E2D14U50HY6ZNR --query "Distribution.{Status:Status,DomainName:DomainName}" --output table
```

### 📝 **Variáveis de Ambiente**

```bash
# Exportar variáveis úteis
export AWS_REGION=us-east-1
export ECS_CLUSTER=dg-cluster
export ECS_SERVICE=dg-service
export TASK_DEFINITION=dg-task
export ALB_DNS=dg-alb-175722117.us-east-1.elb.amazonaws.com
export CLOUDFRONT_DNS=d2zuijdq7u12s1.cloudfront.net
export RDS_ENDPOINT=dg-mysql-db.ckb4ai4ysvvk.us-east-1.rds.amazonaws.com
export EFS_ID=fs-0f3df0710e3bcdca8
```

### 🆘 **Comandos de Emergência**

#### Restart do Serviço
```bash
# Restart completo do serviço
aws ecs update-service --cluster dg-cluster --service dg-service --desired-count 0
sleep 30
aws ecs update-service --cluster dg-cluster --service dg-service --desired-count 1
```

#### Verificar Logs de Erro
```bash
# Logs dos últimos 30 minutos
aws logs get-log-events --log-group-name "/ecs/dg-app" --log-stream-name "dg/dg-app/{task-id}" --start-time $(date -d '30 minutes ago' +%s)000
```

#### Teste de Conectividade
```bash
# Teste completo
curl -v http://dg-alb-175722117.us-east-1.elb.amazonaws.com/status
curl -v https://d2zuijdq7u12s1.cloudfront.net/status
```

---

**Nota:** Substitua `{task-id}` pelo ID real da task em execução.  
**Região:** Todos os comandos assumem região `us-east-1`.  
**Última atualização:** 15 de Setembro de 2025

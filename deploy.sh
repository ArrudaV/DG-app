#!/bin/bash

# Script de Deploy para AWS ECS
echo "🚀 Iniciando deploy da aplicação DG App..."

# 1. Build da aplicação
echo "📦 Fazendo build da aplicação..."
npm run build

# 2. Build da imagem Docker
echo "🐳 Construindo imagem Docker..."
docker build -t dg-app .

# 3. Tag da imagem para ECR
echo "🏷️ Marcando imagem para ECR..."
docker tag dg-app:latest 570322735022.dkr.ecr.us-east-1.amazonaws.com/dg-app:latest

# 4. Login no ECR
echo "🔐 Fazendo login no ECR..."
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 570322735022.dkr.ecr.us-east-1.amazonaws.com

# 5. Push da imagem
echo "⬆️ Enviando imagem para ECR..."
docker push 570322735022.dkr.ecr.us-east-1.amazonaws.com/dg-app:latest

# 6. Atualizar serviço ECS
echo "🔄 Atualizando serviço ECS..."
aws ecs update-service --cluster dg-cluster --service dg-service --force-new-deployment --region us-east-1

echo "✅ Deploy concluído! A aplicação será atualizada em alguns minutos."
echo "🌐 URL: https://d2zuijdq7u12s1.cloudfront.net/"


# Script de Deploy para AWS ECS - PowerShell
Write-Host "🚀 Iniciando deploy da aplicação DG App..." -ForegroundColor Green

# 1. Build da aplicação
Write-Host "📦 Fazendo build da aplicação..." -ForegroundColor Yellow
npm run build

# 2. Build da imagem Docker
Write-Host "🐳 Construindo imagem Docker..." -ForegroundColor Yellow
docker build -t dg-app .

# 3. Tag da imagem para ECR
Write-Host "🏷️ Marcando imagem para ECR..." -ForegroundColor Yellow
docker tag dg-app:latest 570322735022.dkr.ecr.us-east-1.amazonaws.com/dg-app:latest

# 4. Login no ECR
Write-Host "🔐 Fazendo login no ECR..." -ForegroundColor Yellow
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 570322735022.dkr.ecr.us-east-1.amazonaws.com

# 5. Push da imagem
Write-Host "⬆️ Enviando imagem para ECR..." -ForegroundColor Yellow
docker push 570322735022.dkr.ecr.us-east-1.amazonaws.com/dg-app:latest

# 6. Atualizar serviço ECS
Write-Host "🔄 Atualizando serviço ECS..." -ForegroundColor Yellow
aws ecs update-service --cluster dg-cluster --service dg-service --force-new-deployment --region us-east-1

Write-Host "✅ Deploy concluído! A aplicação será atualizada em alguns minutos." -ForegroundColor Green
Write-Host "🌐 URL: https://d2zuijdq7u12s1.cloudfront.net/" -ForegroundColor Cyan


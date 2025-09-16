import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import * as path from 'path';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import { authRouter } from './routes/auth';
import { clientsRouter } from './routes/clients';
import { contractsRouter } from './routes/contracts';
import { reportsRouter } from './routes/reports';
import { dashboardRouter } from './routes/dashboard';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';
import { FileEncryption } from './lib/fileEncryption';
import { PrismaClient } from '../generated/prisma';

// Função para migrar banco de dados
async function migrateDatabase() {
  const prisma = new PrismaClient();
  
  try {
    console.log('Verificando schema do banco de dados...');
    
    // Verificar se a coluna password existe na tabela Employee
    const result = await prisma.$queryRaw<{count: number}[]>`
      SELECT COUNT(*) as count 
      FROM information_schema.columns 
      WHERE table_schema = DATABASE() 
      AND table_name = 'Employee'
      AND column_name = 'password'
    `;
    
    console.log('Resultado da verificação da coluna password:', result);
    console.log('Count value:', result[0].count);
    console.log('Count type:', typeof result[0].count);
    console.log('Count === 0:', result[0].count === 0);
    console.log('Count == 0:', result[0].count == 0);
    
    // Se a coluna password não existe (count === 0), recriar as tabelas
    if (result[0].count === 0 || result[0].count == 0) {
      console.log('Coluna password não encontrada. Schema incompleto detectado. Recriando tabelas...');
      
      // Dropar tabelas existentes (em ordem reversa devido às foreign keys)
      try {
        await prisma.$executeRaw`DROP TABLE IF EXISTS ActivityLog`;
        await prisma.$executeRaw`DROP TABLE IF EXISTS Contract`;
        await prisma.$executeRaw`DROP TABLE IF EXISTS Client`;
        await prisma.$executeRaw`DROP TABLE IF EXISTS Employee`;
        console.log('Tabelas antigas removidas.');
      } catch (error) {
        console.log('Erro ao remover tabelas antigas (pode ser normal):', error);
      }
      
      // Criar tabela Employee
      await prisma.$executeRaw`
        CREATE TABLE Employee (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          role VARCHAR(255) DEFAULT 'EMPLOYEE',
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `;
      
      // Criar tabela Client
      await prisma.$executeRaw`
        CREATE TABLE Client (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          createdById INT NOT NULL,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (createdById) REFERENCES Employee(id)
        )
      `;
      
      // Criar tabela Contract
      await prisma.$executeRaw`
        CREATE TABLE Contract (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          status ENUM('DRAFT', 'ACTIVE', 'EXPIRING', 'EXPIRED') DEFAULT 'DRAFT',
          value DECIMAL(10,2) NOT NULL,
          expirationDate DATETIME,
          autoStatus BOOLEAN DEFAULT TRUE,
          fileUrl VARCHAR(500),
          fileName VARCHAR(255),
          fileType VARCHAR(50),
          employeeId INT NOT NULL,
          clientId INT NOT NULL,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (employeeId) REFERENCES Employee(id),
          FOREIGN KEY (clientId) REFERENCES Client(id)
        )
      `;
      
      // Criar tabela ActivityLog
      await prisma.$executeRaw`
        CREATE TABLE ActivityLog (
          id INT AUTO_INCREMENT PRIMARY KEY,
          action VARCHAR(50) NOT NULL,
          entityType VARCHAR(50) NOT NULL,
          entityId INT,
          description TEXT NOT NULL,
          userId INT NOT NULL,
          userRole VARCHAR(50) NOT NULL,
          userEmail VARCHAR(255) NOT NULL,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `;
      
      console.log('Schema recriado com sucesso!');
    } else {
      console.log('Schema já está correto.');
    }
    
  } catch (error) {
    console.error('Erro ao migrar banco de dados:', error);
  } finally {
    await prisma.$disconnect();
  }
}

const app = express();

// Configuração de rate limiting (EXCLUINDO HEALTH CHECKS)
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutos
  max: process.env.NODE_ENV === 'development' ? 50000 : parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '50000'), // 50000 em dev, 50000 em produção
  message: {
    error: 'Muitas tentativas. Tente novamente em alguns minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Pular rate limiting para health checks
    const healthCheckPaths = ['/health', '/ping', '/alive', '/ok', '/debug', '/status', '/test'];
    return healthCheckPaths.includes(req.path);
  }
});

// Rate limiting mais restritivo para autenticação
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: process.env.NODE_ENV === 'development' ? 1000 : 500, // 1000 tentativas em dev, 500 em produção
  message: {
    error: 'Muitas tentativas de login. Tente novamente em 15 minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// Configuração do multer para upload de arquivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Usar o diretório EFS montado
    cb(null, '/opt/dg/dg-uploads');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    // Lista de tipos MIME permitidos
    const allowedMimes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/gif',
      'image/webp'
    ];
    
    // Verificar tipo MIME
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos PDF e imagens (JPEG, PNG, GIF, WebP) são permitidos'));
    }
  },
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB por padrão
    files: 1 // Apenas 1 arquivo por vez
  }
});

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Rota para servir arquivos criptografados (descriptografando-os)
app.get('/uploads/:filename', async (req: Request, res: Response) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join('/opt/dg/dg-uploads', filename);
    
    // Verificar se o arquivo existe
    const fs = await import('fs/promises');
    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({ message: 'Arquivo não encontrado' });
    }
    
    // Se o arquivo tem extensão .encrypted, descriptografar
    if (filename.endsWith('.encrypted')) {
      try {
        // Criar um arquivo temporário para descriptografia
        const tempPath = filePath + '.temp';
        await FileEncryption.decryptFile(filePath, tempPath, FileEncryption.getEncryptionPassword());
        
        // Determinar o tipo de conteúdo baseado na extensão original
        const originalFilename = filename.replace('.encrypted', '');
        const ext = path.extname(originalFilename).toLowerCase();
        let contentType = 'application/octet-stream';
        
        switch (ext) {
          case '.pdf':
            contentType = 'application/pdf';
            break;
          case '.jpg':
          case '.jpeg':
            contentType = 'image/jpeg';
            break;
          case '.png':
            contentType = 'image/png';
            break;
          case '.gif':
            contentType = 'image/gif';
            break;
          case '.webp':
            contentType = 'image/webp';
            break;
        }
        
        // Configurar headers
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `inline; filename="${originalFilename}"`);
        
        // Enviar arquivo descriptografado
        const decryptedData = await fs.readFile(tempPath);
        res.send(decryptedData);
        
        // Remover arquivo temporário
        await fs.unlink(tempPath);
      } catch (decryptError) {
        console.error('❌ Erro ao descriptografar arquivo:', decryptError);
        return res.status(500).json({ message: 'Erro ao descriptografar arquivo' });
      }
    } else {
      // Arquivo não criptografado (para compatibilidade com arquivos antigos)
      res.sendFile(filePath);
    }
  } catch (error) {
    console.error('Erro ao servir arquivo:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Health check - simplified for ALB
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Even simpler health check
app.get('/ping', (req, res) => {
  res.status(200).send('pong');
});

// Always return 200 for ALB
app.get('/alive', (req, res) => {
  res.status(200).send('alive');
});

// Super simple endpoint for ALB
app.get('/ok', (req, res) => {
  res.status(200).send('ok');
});

// Debug endpoint
app.get('/debug', (req, res) => {
  console.log('Debug endpoint called');
  res.status(200).json({ 
    message: 'Debug endpoint working',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Ultra simple endpoint for ALB
app.get('/status', (req, res) => {
  console.log('Status endpoint called');
  res.status(200).send('OK');
});

// Simple test endpoint
app.get('/test', (req, res) => {
  res.status(200).json({ message: 'Test endpoint working!' });
});

// Rotas da API
app.use('/auth', authLimiter, authRouter);
app.use('/clients', clientsRouter);
app.use('/contracts', contractsRouter);
app.use('/reports', reportsRouter);
app.use('/dashboard', dashboardRouter);

// Rota para upload de arquivos
app.post('/upload', upload.single('contractFile'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Nenhum arquivo foi enviado' });
    }
    
    // Criptografar o arquivo
    const originalPath = req.file.path;
    const encryptedPath = originalPath + '.encrypted';
    
    try {
      await FileEncryption.encryptFile(originalPath, encryptedPath, FileEncryption.getEncryptionPassword());
      
      // Remover arquivo original não criptografado
      const fs = await import('fs/promises');
      await fs.unlink(originalPath);
      
      // Atualizar o nome do arquivo para incluir extensão .encrypted
      const encryptedFilename = req.file.filename + '.encrypted';
      const fileUrl = `/uploads/${encryptedFilename}`;
      
      res.json({ 
        message: 'Arquivo enviado e criptografado com sucesso',
        fileUrl,
        fileName: req.file.originalname,
        fileType: req.file.mimetype,
        encrypted: true
      });
    } catch (encryptionError) {
      console.error('❌ Erro na criptografia:', encryptionError);
      // Se a criptografia falhar, remover o arquivo original
      const fs = await import('fs/promises');
      try {
        await fs.unlink(originalPath);
      } catch (unlinkError) {
        console.error('Erro ao remover arquivo original:', unlinkError);
      }
      return res.status(500).json({ message: 'Erro ao criptografar o arquivo' });
    }
  } catch (error) {
    console.error('Erro no upload:', error);
    res.status(500).json({ message: 'Erro ao fazer upload do arquivo' });
  }
});

// Rota para servir a página principal (APENAS UMA ROTA "/")
app.get('/', (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Middleware de erro para capturar erros do multer
app.use((error: any, req: Request, res: Response, next: any) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'Arquivo muito grande. Tamanho máximo: 10MB.' });
    }
    
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ message: 'Muitos arquivos enviados. Máximo: 1 arquivo.' });
    }
    
    return res.status(400).json({ message: `Erro no upload: ${error.message}` });
  }
  
  if (error.message && error.message.includes('Apenas arquivos PDF e imagens são permitidos')) {
    return res.status(400).json({ message: error.message });
  }
  
  next(error);
});

// Middleware para rotas não encontradas
app.use(notFoundHandler);

// Middleware global de tratamento de erros
app.use(errorHandler);

const PORT = parseInt(process.env.PORT || '3000');
const HOST = process.env.HOST || '0.0.0.0';

// Inicializar servidor com migração do banco de dados
async function startServer() {
  try {
    console.log('Iniciando migração do banco de dados...');
    await migrateDatabase();
    console.log('Migração concluída. Iniciando servidor...');
    
    app.listen(PORT, HOST, () => {
      console.log(`API rodando na porta ${PORT}`);
      console.log(`Interface web disponível em: http://${HOST}:${PORT}`);
    });
  } catch (error) {
    console.error('Erro ao iniciar servidor:', error);
    process.exit(1);
  }
}

startServer();

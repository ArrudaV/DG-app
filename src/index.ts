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

const app = express();

// Configuração de rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutos
  max: process.env.NODE_ENV === 'development' ? 1000 : parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // 1000 em dev, 100 em produção
  message: {
    error: 'Muitas tentativas. Tente novamente em alguns minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting mais restritivo para autenticação
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: process.env.NODE_ENV === 'development' ? 200 : 5, // 200 tentativas em dev, 5 em produção
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
    cb(null, path.join(__dirname, '../uploads'));
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
    const filePath = path.join(__dirname, '../uploads', filename);
    
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

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
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

// Rota para servir a página principal
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API rodando na porta ${PORT}`);
  console.log(`Interface web disponível em: http://localhost:${PORT}`);
});

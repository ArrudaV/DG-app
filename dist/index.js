"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path = __importStar(require("path"));
const multer_1 = __importDefault(require("multer"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const auth_1 = require("./routes/auth");
const clients_1 = require("./routes/clients");
const contracts_1 = require("./routes/contracts");
const reports_1 = require("./routes/reports");
const dashboard_1 = require("./routes/dashboard");
const errorHandler_1 = require("./middlewares/errorHandler");
const fileEncryption_1 = require("./lib/fileEncryption");
const app = (0, express_1.default)();
// Configuração de rate limiting
const limiter = (0, express_rate_limit_1.default)({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutos
    max: process.env.NODE_ENV === 'development' ? 1000 : parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // 1000 em dev, 100 em produção
    message: {
        error: 'Muitas tentativas. Tente novamente em alguns minutos.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});
// Rate limiting mais restritivo para autenticação
const authLimiter = (0, express_rate_limit_1.default)({
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
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../uploads'));
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = (0, multer_1.default)({
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
        }
        else {
            cb(new Error('Apenas arquivos PDF e imagens (JPEG, PNG, GIF, WebP) são permitidos'));
        }
    },
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB por padrão
        files: 1 // Apenas 1 arquivo por vez
    }
});
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express_1.default.json());
app.use(express_1.default.static(path.join(__dirname, '../public')));
// Rota para servir arquivos criptografados (descriptografando-os)
app.get('/uploads/:filename', async (req, res) => {
    try {
        const filename = req.params.filename;
        const filePath = path.join(__dirname, '../uploads', filename);
        // Verificar se o arquivo existe
        const fs = await Promise.resolve().then(() => __importStar(require('fs/promises')));
        try {
            await fs.access(filePath);
        }
        catch {
            return res.status(404).json({ message: 'Arquivo não encontrado' });
        }
        // Se o arquivo tem extensão .encrypted, descriptografar
        if (filename.endsWith('.encrypted')) {
            try {
                // Criar um arquivo temporário para descriptografia
                const tempPath = filePath + '.temp';
                await fileEncryption_1.FileEncryption.decryptFile(filePath, tempPath, fileEncryption_1.FileEncryption.getEncryptionPassword());
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
            }
            catch (decryptError) {
                console.error('❌ Erro ao descriptografar arquivo:', decryptError);
                return res.status(500).json({ message: 'Erro ao descriptografar arquivo' });
            }
        }
        else {
            // Arquivo não criptografado (para compatibilidade com arquivos antigos)
            res.sendFile(filePath);
        }
    }
    catch (error) {
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
// Simple test endpoint
app.get('/test', (req, res) => {
    res.status(200).json({ message: 'Test endpoint working!' });
});
// Root endpoint
app.get('/', (req, res) => {
    res.status(200).json({
        message: 'DG Application is running!',
        timestamp: new Date().toISOString(),
        status: 'OK'
    });
});
// Rotas da API
app.use('/auth', authLimiter, auth_1.authRouter);
app.use('/clients', clients_1.clientsRouter);
app.use('/contracts', contracts_1.contractsRouter);
app.use('/reports', reports_1.reportsRouter);
app.use('/dashboard', dashboard_1.dashboardRouter);
// Rota para upload de arquivos
app.post('/upload', upload.single('contractFile'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Nenhum arquivo foi enviado' });
        }
        // Criptografar o arquivo
        const originalPath = req.file.path;
        const encryptedPath = originalPath + '.encrypted';
        try {
            await fileEncryption_1.FileEncryption.encryptFile(originalPath, encryptedPath, fileEncryption_1.FileEncryption.getEncryptionPassword());
            // Remover arquivo original não criptografado
            const fs = await Promise.resolve().then(() => __importStar(require('fs/promises')));
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
        }
        catch (encryptionError) {
            console.error('❌ Erro na criptografia:', encryptionError);
            // Se a criptografia falhar, remover o arquivo original
            const fs = await Promise.resolve().then(() => __importStar(require('fs/promises')));
            try {
                await fs.unlink(originalPath);
            }
            catch (unlinkError) {
                console.error('Erro ao remover arquivo original:', unlinkError);
            }
            return res.status(500).json({ message: 'Erro ao criptografar o arquivo' });
        }
    }
    catch (error) {
        console.error('Erro no upload:', error);
        res.status(500).json({ message: 'Erro ao fazer upload do arquivo' });
    }
});
// Rota para servir a página principal
app.get('/', (_req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});
// Middleware de erro para capturar erros do multer
app.use((error, req, res, next) => {
    if (error instanceof multer_1.default.MulterError) {
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
app.use(errorHandler_1.notFoundHandler);
// Middleware global de tratamento de erros
app.use(errorHandler_1.errorHandler);
const PORT = parseInt(process.env.PORT || '3000');
const HOST = process.env.HOST || '0.0.0.0';
app.listen(PORT, HOST, () => {
    console.log(`API rodando na porta ${PORT}`);
    console.log(`Interface web disponível em: http://${HOST}:${PORT}`);
});
//# sourceMappingURL=index.js.map
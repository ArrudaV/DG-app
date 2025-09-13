"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomError = void 0;
exports.errorHandler = errorHandler;
exports.notFoundHandler = notFoundHandler;
exports.asyncHandler = asyncHandler;
const zod_1 = require("zod");
const logger_1 = __importDefault(require("../lib/logger"));
class CustomError extends Error {
    constructor(message, statusCode = 500) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.CustomError = CustomError;
function errorHandler(error, req, res, next) {
    let statusCode = error.statusCode || 500;
    let message = error.message || 'Erro interno do servidor';
    // Log do erro
    logger_1.default.error('Erro capturado', {
        message: error.message,
        stack: error.stack,
        url: req.url,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        userId: req.user?.id,
        timestamp: new Date().toISOString()
    });
    // Tratamento de erros específicos
    if (error instanceof zod_1.ZodError) {
        statusCode = 400;
        message = 'Dados de entrada inválidos';
        return res.status(statusCode).json({
            message,
            errors: error.format()
        });
    }
    // Verificar se é erro do Prisma
    if (error.name === 'PrismaClientKnownRequestError') {
        const prismaError = error;
        switch (prismaError.code) {
            case 'P2002':
                statusCode = 409;
                message = 'Registro já existe (violação de constraint única)';
                break;
            case 'P2025':
                statusCode = 404;
                message = 'Registro não encontrado';
                break;
            case 'P2003':
                statusCode = 400;
                message = 'Referência inválida (foreign key constraint)';
                break;
            default:
                statusCode = 500;
                message = 'Erro no banco de dados';
        }
    }
    if (error.name === 'PrismaClientValidationError') {
        statusCode = 400;
        message = 'Dados inválidos para o banco de dados';
    }
    // Resposta do erro
    const errorResponse = {
        message,
        timestamp: new Date().toISOString(),
        path: req.url,
        method: req.method
    };
    // Incluir stack trace apenas em desenvolvimento
    if (process.env.NODE_ENV === 'development') {
        errorResponse.stack = error.stack;
        errorResponse.details = error;
    }
    res.status(statusCode).json(errorResponse);
}
function notFoundHandler(req, res, next) {
    const error = new CustomError(`Rota não encontrada: ${req.method} ${req.url}`, 404);
    next(error);
}
function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}
//# sourceMappingURL=errorHandler.js.map
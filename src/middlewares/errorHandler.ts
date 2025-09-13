import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import logger from '../lib/logger';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export class CustomError extends Error implements AppError {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

export function errorHandler(
  error: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) {
  let statusCode = error.statusCode || 500;
  let message = error.message || 'Erro interno do servidor';

  // Log do erro
  logger.error('Erro capturado', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: (req as any).user?.id,
    timestamp: new Date().toISOString()
  });

  // Tratamento de erros específicos
  if (error instanceof ZodError) {
    statusCode = 400;
    message = 'Dados de entrada inválidos';
    return res.status(statusCode).json({
      message,
      errors: error.format()
    });
  }

  // Verificar se é erro do Prisma
  if (error.name === 'PrismaClientKnownRequestError') {
    const prismaError = error as any;
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
  const errorResponse: any = {
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

export function notFoundHandler(req: Request, res: Response, next: NextFunction) {
  const error = new CustomError(`Rota não encontrada: ${req.method} ${req.url}`, 404);
  next(error);
}

export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

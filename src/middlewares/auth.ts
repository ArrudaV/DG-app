import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export type AuthUser = {
  id: number;
  role: 'EMPLOYEE' | 'CLIENT';
  email?: string;
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  
  if (!header) {
    return res.status(401).json({ message: 'Não autenticado' });
  }
  
  const token = header.replace('Bearer ', '');
  
  try {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return res.status(500).json({ message: 'Configuração de segurança inválida' });
    }
    
    const payload = jwt.verify(token, jwtSecret) as AuthUser;
    req.user = payload;
    next();
  } catch (e) {
    return res.status(401).json({ message: 'Token inválido' });
  }
}

export function requireRole(role: AuthUser['role']) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Não autenticado' });
    }
    
    if (req.user.role !== role) {
      return res.status(403).json({ message: 'Acesso negado' });
    }
    
    next();
  };
}





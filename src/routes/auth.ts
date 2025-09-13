import { Router } from 'express';
import { prisma } from '../lib/prisma';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { ActivityLogger } from '../services/activityLogger';

export const authRouter = Router();

const registerEmployeeSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(100, 'Nome muito longo'),
  email: z.string().email('Email inválido').max(255, 'Email muito longo'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres').max(100, 'Senha muito longa'),
});

authRouter.post('/employee/register', async (req, res) => {
  const parse = registerEmployeeSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json(parse.error.format());
  const { name, email, password } = parse.data;
  const existing = await prisma.employee.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ message: 'Email já cadastrado' });
  const passwordHash = await bcrypt.hash(password, 10);
  const employee = await prisma.employee.create({ data: { name, email, password: passwordHash } });
  
  // Registrar atividade
  await ActivityLogger.log({
    action: 'CREATE',
    entityType: 'EMPLOYEE',
    entityId: employee.id,
    description: `Funcionário ${name} (${email}) foi cadastrado no sistema`,
    userId: employee.id,
    userRole: 'EMPLOYEE',
    userEmail: email
  });
  
  return res.status(201).json({ id: employee.id, name: employee.name, email: employee.email });
});

const loginSchema = z.object({
  email: z.string().email('Email inválido').max(255, 'Email muito longo'),
  password: z.string().min(1, 'Senha é obrigatória').max(100, 'Senha muito longa'),
});

authRouter.post('/employee/login', async (req, res) => {
  const parse = loginSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json(parse.error.format());
  const { email, password } = parse.data;
  const employee = await prisma.employee.findUnique({ where: { email } });
  if (!employee) return res.status(401).json({ message: 'Credenciais inválidas' });
  const ok = await bcrypt.compare(password, employee.password);
  if (!ok) return res.status(401).json({ message: 'Credenciais inválidas' });
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    return res.status(500).json({ message: 'Configuração de segurança inválida' });
  }
  const token = jwt.sign({ id: employee.id, role: 'EMPLOYEE', email: employee.email }, jwtSecret, { expiresIn: '1d' });
  
  // Registrar atividade
  await ActivityLogger.log({
    action: 'LOGIN',
    entityType: 'EMPLOYEE',
    description: `Funcionário ${employee.name} (${email}) fez login no sistema`,
    userId: employee.id,
    userRole: 'EMPLOYEE',
    userEmail: email
  });
  
  res.json({ 
    token,
    user: {
      id: employee.id,
      name: employee.name,
      email: employee.email,
      role: 'EMPLOYEE'
    }
  });
});

const registerClientSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(100, 'Nome muito longo'),
  email: z.string().email('Email inválido').max(255, 'Email muito longo'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres').max(100, 'Senha muito longa'),
});

// Registro de cliente só pode ser feito por funcionário autenticado
import { authenticate, requireRole } from '../middlewares/auth';
authRouter.post('/client/register', authenticate, requireRole('EMPLOYEE'), async (req, res) => {
  const parse = registerClientSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json(parse.error.format());
  const { name, email, password } = parse.data;
  const existing = await prisma.client.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ message: 'Email já cadastrado' });
  const passwordHash = await bcrypt.hash(password, 10);
  const client = await prisma.client.create({ data: { name, email, password: passwordHash, createdById: req.user!.id } });
  
  // Registrar atividade
  await ActivityLogger.log({
    action: 'CREATE',
    entityType: 'CLIENT',
    entityId: client.id,
    description: `Cliente ${name} (${email}) foi cadastrado pelo funcionário ${req.user!.id}`,
    userId: req.user!.id,
    userRole: 'EMPLOYEE',
    userEmail: req.user!.email || 'unknown'
  });
  
  return res.status(201).json({ id: client.id, name: client.name, email: client.email });
});

authRouter.post('/client/login', async (req, res) => {
  const parse = loginSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json(parse.error.format());
  const { email, password } = parse.data;
  const client = await prisma.client.findUnique({ where: { email } });
  if (!client) return res.status(401).json({ message: 'Credenciais inválidas' });
  const ok = await bcrypt.compare(password, client.password);
  if (!ok) return res.status(401).json({ message: 'Credenciais inválidas' });
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    return res.status(500).json({ message: 'Configuração de segurança inválida' });
  }
  const token = jwt.sign({ id: client.id, role: 'CLIENT', email: client.email }, jwtSecret, { expiresIn: '1d' });
  
  // Registrar atividade
  await ActivityLogger.log({
    action: 'LOGIN',
    entityType: 'CLIENT',
    description: `Cliente ${client.name} (${email}) fez login no sistema`,
    userId: client.id,
    userRole: 'CLIENT',
    userEmail: email
  });
  
  res.json({ 
    token,
    user: {
      id: client.id,
      name: client.name,
      email: client.email,
      role: 'CLIENT'
    }
  });
});





import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, requireRole } from '../middlewares/auth';
import { z } from 'zod';
import { ActivityLogger } from '../services/activityLogger';

export const clientsRouter = Router();

clientsRouter.use(authenticate, requireRole('EMPLOYEE'));

clientsRouter.get('/', async (req, res) => {
  
  const { search } = req.query;
  
  let whereClause = {};
  if (search) {
    whereClause = {
      name: {
        contains: search as string
      }
    };
  }
  
  const clients = await prisma.client.findMany({ 
    where: whereClause,
    orderBy: { id: 'desc' },
    include: {
      _count: {
        select: {
          contracts: true
        }
      }
    }
  });
  
  const result = clients.map((c: any) => ({ 
    id: c.id, 
    name: c.name, 
    email: c.email, 
    createdById: c.createdById,
    contractsCount: c._count.contracts
  }));
  
  res.json(result);
});

clientsRouter.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const client = await prisma.client.findUnique({ where: { id } });
  if (!client) return res.status(404).json({ message: 'Cliente não encontrado' });
  res.json({ id: client.id, name: client.name, email: client.email });
});

const upsertSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6).optional(),
});

clientsRouter.post('/', async (req, res) => {
  const parse = upsertSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json(parse.error.format());
  const { name, email, password } = parse.data;
  const exists = await prisma.client.findUnique({ where: { email } });
  if (exists) return res.status(409).json({ message: 'Email já cadastrado' });
  let passwordHash: string | undefined;
  if (password) {
    const bcrypt = await import('bcrypt');
    passwordHash = await bcrypt.hash(password, 10);
  } else {
    return res.status(400).json({ message: 'Senha é obrigatória na criação' });
  }
  const client = await prisma.client.create({ data: { name, email, password: passwordHash, createdById: req.user!.id } });
  
  // Registrar atividade
  await ActivityLogger.log({
    action: 'CREATE',
    entityType: 'CLIENT',
    entityId: client.id,
    description: `Cliente ${name} (${email}) foi criado pelo funcionário ${req.user!.id}`,
    userId: req.user!.id,
    userRole: 'EMPLOYEE',
    userEmail: req.user!.email || 'unknown'
  });
  
  res.status(201).json({ id: client.id, name: client.name, email: client.email });
});

clientsRouter.put('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const parse = upsertSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json(parse.error.format());
  const { name, email, password } = parse.data;
  let passwordHash: string | undefined;
  if (password) {
    const bcrypt = await import('bcrypt');
    passwordHash = await bcrypt.hash(password, 10);
  }
  const updated = await prisma.client.update({ where: { id }, data: { name, email, ...(passwordHash ? { password: passwordHash } : {}) } });
  
  // Registrar atividade
  await ActivityLogger.log({
    action: 'UPDATE',
    entityType: 'CLIENT',
    entityId: id,
    description: `Cliente ${updated.name} (${updated.email}) foi atualizado pelo funcionário ${req.user!.id}`,
    userId: req.user!.id,
    userRole: 'EMPLOYEE',
    userEmail: req.user!.email || 'unknown'
  });
  
  res.json({ id: updated.id, name: updated.name, email: updated.email });
});

clientsRouter.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  
  // Buscar dados do cliente antes de deletar
  const client = await prisma.client.findUnique({ where: { id } });
  
  await prisma.contract.deleteMany({ where: { clientId: id } });
  await prisma.client.delete({ where: { id } });
  
  // Registrar atividade
  if (client) {
    await ActivityLogger.log({
      action: 'DELETE',
      entityType: 'CLIENT',
      entityId: id,
      description: `Cliente ${client.name} (${client.email}) foi excluído pelo funcionário ${req.user!.id}`,
      userId: req.user!.id,
      userRole: 'EMPLOYEE',
      userEmail: req.user!.email || 'unknown'
    });
  }
  
  res.status(204).send();
});

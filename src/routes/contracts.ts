import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, requireRole } from '../middlewares/auth';
import { z } from 'zod';
import { ActivityLogger } from '../services/activityLogger';
import { ContractStatusService } from '../services/contractStatusService';

export const contractsRouter = Router();

const upsertSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'EXPIRING', 'EXPIRED']).optional(),
  autoStatus: z.boolean().optional(),
  value: z.union([z.number().positive('Valor deve ser positivo'), z.string().transform((val) => parseFloat(val)).refine((val) => !isNaN(val) && val > 0, 'Valor deve ser um número positivo')]),
  expirationDate: z.string().optional().transform((val) => val ? new Date(val + 'T00:00:00') : null),
  fileUrl: z.string().optional(),
  fileName: z.string().optional(),
  fileType: z.string().optional(),
  clientId: z.union([z.number().int('ID do cliente deve ser um número inteiro'), z.string().transform((val) => parseInt(val)).refine((val) => !isNaN(val) && val > 0, 'ID do cliente deve ser um número válido')]),
});

// CRUD completo para funcionários
contractsRouter.use(authenticate);

contractsRouter.get('/', requireRole('EMPLOYEE'), async (req, res) => {
  const { search, page = '1', limit = '10' } = req.query;
  
  const pageNum = parseInt(page as string) || 1;
  const limitNum = parseInt(limit as string) || 10;
  const skip = (pageNum - 1) * limitNum;
  
  let whereClause = {};
  if (search) {
    whereClause = {
      name: {
        contains: search as string
      }
    };
  }
  
  // Buscar total de contratos para paginação
  const total = await prisma.contract.count({ where: whereClause });
  
  const contracts = await prisma.contract.findMany({ 
    where: whereClause,
    include: { client: true }, 
    orderBy: { id: 'desc' },
    skip,
    take: limitNum
  });

  // Atualizar status automaticamente para contratos com autoStatus = true
  // Usar Promise.all para executar todas as atualizações em paralelo
  const updatePromises = contracts
    .filter((contract: any) => contract.autoStatus && contract.expirationDate)
    .map((contract: any) => ContractStatusService.updateContractStatus(contract.id));
  
  await Promise.all(updatePromises);

  // Buscar contratos atualizados
  const updatedContracts = await prisma.contract.findMany({ 
    where: whereClause,
    include: { client: true }, 
    orderBy: { id: 'desc' },
    skip,
    take: limitNum
  });

  res.json({
    data: updatedContracts,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum)
    }
  });
});

// Cliente visualiza apenas os próprios contratos
contractsRouter.get('/my', requireRole('CLIENT'), async (req, res) => {
  const contracts = await prisma.contract.findMany({ 
    where: { clientId: req.user!.id }, 
    orderBy: { id: 'desc' },
    include: { client: true }
  });
  res.json(contracts);
});

contractsRouter.get('/:id', requireRole('EMPLOYEE'), async (req, res) => {
  const id = Number(req.params.id);
  const contract = await prisma.contract.findUnique({ 
    where: { id },
    include: { client: true }
  });
  if (!contract) return res.status(404).json({ message: 'Contrato não encontrado' });
  res.json(contract);
});

contractsRouter.post('/', requireRole('EMPLOYEE'), async (req, res) => {
  try {
    const parse = upsertSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ 
        message: 'Dados inválidos', 
        errors: parse.error.format() 
      });
    }
    
    const { name, description, status, autoStatus, value, expirationDate, fileUrl, fileName, fileType, clientId } = parse.data;
    
            // Dados recebidos para criação/atualização do contrato
    
    // Verificar se o cliente existe
    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) {
      return res.status(404).json({ message: 'Cliente não encontrado' });
    }
    
    // Calcular status inicial baseado no autoStatus e data de expiração
    let initialStatus = status || 'DRAFT';
    // Calcular status automático se habilitado
    if (autoStatus && expirationDate) {
      const calculatedStatus = ContractStatusService.calculateContractStatus(expirationDate);
      if (calculatedStatus) {
        initialStatus = calculatedStatus;
      }
    }
    
    // Criar o contrato
    const contract = await prisma.contract.create({ 
      data: { 
        name, 
        description, 
        status: initialStatus, 
        autoStatus: autoStatus ?? true, // Padrão é true se não especificado
        value: value, 
        expirationDate, 
        fileUrl, 
        fileName, 
        fileType, 
        clientId, 
        employeeId: req.user!.id 
      } 
    });
    
    // Registrar atividade (não bloquear se falhar)
    try {
      await ActivityLogger.log({
        action: 'CREATE',
        entityType: 'CONTRACT',
        entityId: contract.id,
        description: `Contrato "${name}" foi criado pelo funcionário ${req.user!.id} para o cliente ${client.name}`,
        userId: req.user!.id,
        userRole: 'EMPLOYEE',
        userEmail: req.user!.email || 'unknown'
      });
    } catch (logError) {
      console.error('Erro ao registrar atividade:', logError);
      // Não falhar a operação principal por causa do log
    }
    
    res.status(201).json(contract);
  } catch (error) {
    console.error('Erro ao criar contrato:', error);
    res.status(500).json({ 
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
});

contractsRouter.put('/:id', requireRole('EMPLOYEE'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    
    // Verificar se o contrato existe
    const existingContract = await prisma.contract.findUnique({ where: { id } });
    if (!existingContract) {
      return res.status(404).json({ message: 'Contrato não encontrado' });
    }
    
    const parse = upsertSchema.partial({ clientId: true }).safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ 
        message: 'Dados inválidos', 
        errors: parse.error.format() 
      });
    }
    
    // Processar dados de atualização
    const updateData: any = { ...parse.data };
    
    // Processar valor se fornecido
    if (updateData.value) {
      updateData.value = updateData.value;
    }
    
    // Calcular status automaticamente se autoStatus estiver ativo
    if (updateData.autoStatus && updateData.expirationDate) {
      const calculatedStatus = ContractStatusService.calculateContractStatus(updateData.expirationDate);
      if (calculatedStatus) {
        updateData.status = calculatedStatus;
      }
    }
    
    // Remover clientId se não for fornecido para evitar erro de tipo
    if (!updateData.clientId) {
      delete updateData.clientId;
    }
    
    const updated = await prisma.contract.update({ where: { id }, data: updateData });
    
    // Registrar atividade
    await ActivityLogger.log({
      action: 'UPDATE',
      entityType: 'CONTRACT',
      entityId: id,
      description: `Contrato "${updated.name}" foi atualizado pelo funcionário ${req.user!.id}`,
      userId: req.user!.id,
      userRole: 'EMPLOYEE',
      userEmail: req.user!.email || 'unknown'
    });
    
    res.json(updated);
  } catch (error) {
    console.error('Erro ao atualizar contrato:', error);
    res.status(500).json({ 
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
});

contractsRouter.delete('/:id', requireRole('EMPLOYEE'), async (req, res) => {
  const id = Number(req.params.id);
  
  // Buscar dados do contrato antes de deletar
  const contract = await prisma.contract.findUnique({ where: { id } });
  
  await prisma.contract.delete({ where: { id } });
  
  // Registrar atividade
  if (contract) {
    await ActivityLogger.log({
      action: 'DELETE',
      entityType: 'CONTRACT',
      entityId: id,
      description: `Contrato "${contract.name}" foi excluído pelo funcionário ${req.user!.id}`,
      userId: req.user!.id,
      userRole: 'EMPLOYEE',
      userEmail: req.user!.email || 'unknown'
    });
  }
  
  res.status(204).send();
});

// Rota para atualizar status de todos os contratos automaticamente
contractsRouter.post('/update-statuses', requireRole('EMPLOYEE'), async (req, res) => {
  try {
    await ContractStatusService.updateAllContractStatuses();
    res.json({ message: 'Status de todos os contratos atualizados com sucesso' });
  } catch (error) {
    console.error('Erro ao atualizar status dos contratos:', error);
    res.status(500).json({ 
      message: 'Erro ao atualizar status dos contratos',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
});

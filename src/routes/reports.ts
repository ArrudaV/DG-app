import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, requireRole } from '../middlewares/auth';
import { ActivityLogger } from '../services/activityLogger';
import { z } from 'zod';

export const reportsRouter = Router();

// Todas as rotas de relatórios requerem autenticação
reportsRouter.use(authenticate);

// Relatório de atividades (apenas funcionários)
reportsRouter.get('/activities', requireRole('EMPLOYEE'), async (req, res) => {
  try {
    const { action, entityType, userRole, startDate, endDate } = req.query;
    
    const filters: any = {};
    if (action) filters.action = action;
    if (entityType) filters.entityType = entityType;
    if (userRole) filters.userRole = userRole;
    if (startDate) filters.startDate = new Date(startDate as string);
    if (endDate) filters.endDate = new Date(endDate as string);
    
    const logs = await ActivityLogger.getLogs(filters);
    res.json(logs);
  } catch (error) {
    console.error('Erro ao buscar logs:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Relatório de atividades do usuário logado
reportsRouter.get('/my-activities', async (req, res) => {
  try {
    const logs = await ActivityLogger.getLogsByUser(req.user!.id, req.user!.role);
    res.json(logs);
  } catch (error) {
    console.error('Erro ao buscar logs do usuário:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Relatório de estatísticas gerais (apenas funcionários)
reportsRouter.get('/statistics', requireRole('EMPLOYEE'), async (req, res) => {
  try {
    // Calcular contratos expirando (expira em 30 dias ou menos)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    
    const [
      totalEmployees,
      totalClients,
      totalContracts,
      activeContracts,
      draftContracts,
      cancelledContracts,
      expiringContracts,
      recentActivities
    ] = await Promise.all([
      prisma.employee.count(),
      prisma.client.count(),
      prisma.contract.count(),
      prisma.contract.count({ where: { status: 'ACTIVE' } }),
      prisma.contract.count({ where: { status: 'DRAFT' } }),
      prisma.contract.count({ where: { status: 'EXPIRED' } }),
      prisma.contract.count({ 
        where: { 
          status: 'ACTIVE',
          expirationDate: {
            not: null,
            lte: thirtyDaysFromNow
          }
        } 
      }),
      prisma.activityLog.count({ where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } })
    ]);

    res.json({
      employees: totalEmployees,
      clients: totalClients,
      contracts: {
        total: totalContracts,
        active: activeContracts,
        draft: draftContracts,
        cancelled: cancelledContracts,
        expiring: expiringContracts
      },
      recentActivities
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Relatório de contratos por status (apenas funcionários)
reportsRouter.get('/contracts-by-status', requireRole('EMPLOYEE'), async (req, res) => {
  try {
    const contracts = await prisma.contract.groupBy({
      by: ['status'],
      _count: {
        status: true
      }
    });

    res.json(contracts);
  } catch (error) {
    console.error('Erro ao buscar contratos por status:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Relatório de atividades por período (apenas funcionários)
reportsRouter.get('/activities-by-period', requireRole('EMPLOYEE'), async (req, res) => {
  try {
    const { period = '7d' } = req.query;
    
    let startDate: Date;
    const now = new Date();
    
    switch (period) {
      case '1d':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    const activities = await prisma.activityLog.groupBy({
      by: ['action'],
      where: {
        createdAt: {
          gte: startDate
        }
      },
      _count: {
        action: true
      }
    });

    res.json(activities);
  } catch (error) {
    console.error('Erro ao buscar atividades por período:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

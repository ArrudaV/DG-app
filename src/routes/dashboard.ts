import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middlewares/auth';

const router = Router();

// Middleware para verificar se é funcionário
const requireEmployee = (req: Request, res: Response, next: Function) => {
  if (req.user?.role !== 'EMPLOYEE') {
    return res.status(403).json({ message: 'Acesso negado. Apenas funcionários podem acessar o dashboard.' });
  }
  next();
};

// Dashboard principal - estatísticas e contratos ativos
router.get('/', authenticate, requireEmployee, async (req: Request, res: Response) => {
  try {
    const { search } = req.query;
    
    // Buscar estatísticas
    const totalContracts = await prisma.contract.count();
    const activeContracts = await prisma.contract.count({
      where: { status: 'ACTIVE' }
    });
    const expiringContracts = await prisma.contract.count({
      where: { status: 'EXPIRING' }
    });
    const expiredContracts = await prisma.contract.count({
      where: { status: 'EXPIRED' }
    });

    // Calcular valor total dos contratos ativos e expirando
    const activeAndExpiringValue = await prisma.contract.aggregate({
      where: {
        status: {
          in: ['ACTIVE', 'EXPIRING']
        }
      },
      _sum: {
        value: true
      }
    });

    const totalValue = activeAndExpiringValue._sum.value || 0;

    // Buscar contratos expirando e ativos com informações do cliente
    let expiringContractsList;
    let activeContractsList;
    
    if (search) {
      // Busca por nome do contrato ou nome do cliente
      expiringContractsList = await prisma.contract.findMany({
        where: {
          status: 'EXPIRING',
          OR: [
            {
              name: {
                contains: search as string
              }
            },
            {
              client: {
                name: {
                  contains: search as string
                }
              }
            }
          ]
        },
        include: {
          client: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: {
          expirationDate: 'asc' // Ordenar por data de expiração (mais próximos primeiro)
        },
        take: 10
      });

      activeContractsList = await prisma.contract.findMany({
        where: {
          status: 'ACTIVE',
          OR: [
            {
              name: {
                contains: search as string
              }
            },
            {
              client: {
                name: {
                  contains: search as string
                }
              }
            }
          ]
        },
        include: {
          client: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 10
      });
    } else {
      expiringContractsList = await prisma.contract.findMany({
        where: { status: 'EXPIRING' },
        include: {
          client: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: {
          expirationDate: 'asc' // Ordenar por data de expiração (mais próximos primeiro)
        },
        take: 10 // Limitar a 10 contratos mais próximos de expirar
      });

      activeContractsList = await prisma.contract.findMany({
        where: { status: 'ACTIVE' },
        include: {
          client: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 10 // Limitar a 10 contratos ativos mais recentes
      });
    }



    res.json({
      statistics: {
        totalContracts,
        activeContracts,
        expiringContracts,
        expiredContracts,
        totalValue
      },
      expiringContracts: expiringContractsList,
      activeContracts: activeContractsList
    });
  } catch (error) {
    console.error('Erro ao carregar dashboard:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Buscar contratos ativos (para visualização)
router.get('/active-contracts', authenticate, requireEmployee, async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const contracts = await prisma.contract.findMany({
      where: { status: 'ACTIVE' },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip,
      take: Number(limit)
    });

    const total = await prisma.contract.count({
      where: { status: 'ACTIVE' }
    });

    res.json({
      contracts,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Erro ao buscar contratos ativos:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

export { router as dashboardRouter };

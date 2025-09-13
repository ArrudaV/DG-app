"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dashboardRouter = void 0;
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middlewares/auth");
const router = (0, express_1.Router)();
exports.dashboardRouter = router;
// Middleware para verificar se é funcionário
const requireEmployee = (req, res, next) => {
    if (req.user?.role !== 'EMPLOYEE') {
        return res.status(403).json({ message: 'Acesso negado. Apenas funcionários podem acessar o dashboard.' });
    }
    next();
};
// Dashboard principal - estatísticas e contratos ativos
router.get('/', auth_1.authenticate, requireEmployee, async (req, res) => {
    try {
        const { search } = req.query;
        // Buscar estatísticas
        const totalContracts = await prisma_1.prisma.contract.count();
        const activeContracts = await prisma_1.prisma.contract.count({
            where: { status: 'ACTIVE' }
        });
        const expiringContracts = await prisma_1.prisma.contract.count({
            where: { status: 'EXPIRING' }
        });
        const expiredContracts = await prisma_1.prisma.contract.count({
            where: { status: 'EXPIRED' }
        });
        // Calcular valor total dos contratos ativos e expirando
        const activeAndExpiringValue = await prisma_1.prisma.contract.aggregate({
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
            expiringContractsList = await prisma_1.prisma.contract.findMany({
                where: {
                    status: 'EXPIRING',
                    OR: [
                        {
                            name: {
                                contains: search
                            }
                        },
                        {
                            client: {
                                name: {
                                    contains: search
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
            activeContractsList = await prisma_1.prisma.contract.findMany({
                where: {
                    status: 'ACTIVE',
                    OR: [
                        {
                            name: {
                                contains: search
                            }
                        },
                        {
                            client: {
                                name: {
                                    contains: search
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
        }
        else {
            expiringContractsList = await prisma_1.prisma.contract.findMany({
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
            activeContractsList = await prisma_1.prisma.contract.findMany({
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
    }
    catch (error) {
        console.error('Erro ao carregar dashboard:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});
// Buscar contratos ativos (para visualização)
router.get('/active-contracts', auth_1.authenticate, requireEmployee, async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        const contracts = await prisma_1.prisma.contract.findMany({
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
        const total = await prisma_1.prisma.contract.count({
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
    }
    catch (error) {
        console.error('Erro ao buscar contratos ativos:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});
//# sourceMappingURL=dashboard.js.map
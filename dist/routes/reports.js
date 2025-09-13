"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reportsRouter = void 0;
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middlewares/auth");
const activityLogger_1 = require("../services/activityLogger");
exports.reportsRouter = (0, express_1.Router)();
// Todas as rotas de relatórios requerem autenticação
exports.reportsRouter.use(auth_1.authenticate);
// Relatório de atividades (apenas funcionários)
exports.reportsRouter.get('/activities', (0, auth_1.requireRole)('EMPLOYEE'), async (req, res) => {
    try {
        const { action, entityType, userRole, startDate, endDate } = req.query;
        const filters = {};
        if (action)
            filters.action = action;
        if (entityType)
            filters.entityType = entityType;
        if (userRole)
            filters.userRole = userRole;
        if (startDate)
            filters.startDate = new Date(startDate);
        if (endDate)
            filters.endDate = new Date(endDate);
        const logs = await activityLogger_1.ActivityLogger.getLogs(filters);
        res.json(logs);
    }
    catch (error) {
        console.error('Erro ao buscar logs:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});
// Relatório de atividades do usuário logado
exports.reportsRouter.get('/my-activities', async (req, res) => {
    try {
        const logs = await activityLogger_1.ActivityLogger.getLogsByUser(req.user.id, req.user.role);
        res.json(logs);
    }
    catch (error) {
        console.error('Erro ao buscar logs do usuário:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});
// Relatório de estatísticas gerais (apenas funcionários)
exports.reportsRouter.get('/statistics', (0, auth_1.requireRole)('EMPLOYEE'), async (req, res) => {
    try {
        // Calcular contratos expirando (expira em 30 dias ou menos)
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
        const [totalEmployees, totalClients, totalContracts, activeContracts, draftContracts, cancelledContracts, expiringContracts, recentActivities] = await Promise.all([
            prisma_1.prisma.employee.count(),
            prisma_1.prisma.client.count(),
            prisma_1.prisma.contract.count(),
            prisma_1.prisma.contract.count({ where: { status: 'ACTIVE' } }),
            prisma_1.prisma.contract.count({ where: { status: 'DRAFT' } }),
            prisma_1.prisma.contract.count({ where: { status: 'EXPIRED' } }),
            prisma_1.prisma.contract.count({
                where: {
                    status: 'ACTIVE',
                    expirationDate: {
                        not: null,
                        lte: thirtyDaysFromNow
                    }
                }
            }),
            prisma_1.prisma.activityLog.count({ where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } })
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
    }
    catch (error) {
        console.error('Erro ao buscar estatísticas:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});
// Relatório de contratos por status (apenas funcionários)
exports.reportsRouter.get('/contracts-by-status', (0, auth_1.requireRole)('EMPLOYEE'), async (req, res) => {
    try {
        const contracts = await prisma_1.prisma.contract.groupBy({
            by: ['status'],
            _count: {
                status: true
            }
        });
        res.json(contracts);
    }
    catch (error) {
        console.error('Erro ao buscar contratos por status:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});
// Relatório de atividades por período (apenas funcionários)
exports.reportsRouter.get('/activities-by-period', (0, auth_1.requireRole)('EMPLOYEE'), async (req, res) => {
    try {
        const { period = '7d' } = req.query;
        let startDate;
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
        const activities = await prisma_1.prisma.activityLog.groupBy({
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
    }
    catch (error) {
        console.error('Erro ao buscar atividades por período:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
    }
});
//# sourceMappingURL=reports.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActivityLogger = void 0;
const prisma_1 = require("../lib/prisma");
class ActivityLogger {
    static async log(data) {
        try {
            await prisma_1.prisma.activityLog.create({
                data: {
                    action: data.action,
                    entityType: data.entityType,
                    entityId: data.entityId,
                    description: data.description,
                    userId: data.userId,
                    userRole: data.userRole,
                    userEmail: data.userEmail,
                },
            });
        }
        catch (error) {
            console.error('Erro ao registrar atividade:', error);
            // Não vamos falhar a operação principal por causa do log
            // Apenas registramos o erro
        }
    }
    static async getLogs(filters) {
        const where = {};
        if (filters?.action)
            where.action = filters.action;
        if (filters?.entityType)
            where.entityType = filters.entityType;
        if (filters?.userRole)
            where.userRole = filters.userRole;
        if (filters?.startDate || filters?.endDate) {
            where.createdAt = {};
            if (filters?.startDate)
                where.createdAt.gte = filters.startDate;
            if (filters?.endDate)
                where.createdAt.lte = filters.endDate;
        }
        return await prisma_1.prisma.activityLog.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: 100, // Limitar a 100 registros mais recentes
        });
    }
    static async getLogsByUser(userId, userRole) {
        return await prisma_1.prisma.activityLog.findMany({
            where: {
                userId,
                userRole,
            },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });
    }
}
exports.ActivityLogger = ActivityLogger;
//# sourceMappingURL=activityLogger.js.map
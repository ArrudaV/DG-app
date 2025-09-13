import { prisma } from '../lib/prisma';

export type ActivityAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT';
export type EntityType = 'EMPLOYEE' | 'CLIENT' | 'CONTRACT';

export interface ActivityLogData {
  action: ActivityAction;
  entityType: EntityType;
  entityId?: number;
  description: string;
  userId: number;
  userRole: 'EMPLOYEE' | 'CLIENT';
  userEmail: string;
}

export class ActivityLogger {
  static async log(data: ActivityLogData) {
    try {
      await prisma.activityLog.create({
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
    } catch (error) {
      console.error('Erro ao registrar atividade:', error);
      // Não vamos falhar a operação principal por causa do log
      // Apenas registramos o erro
    }
  }

  static async getLogs(filters?: {
    action?: ActivityAction;
    entityType?: EntityType;
    userRole?: 'EMPLOYEE' | 'CLIENT';
    startDate?: Date;
    endDate?: Date;
  }) {
    const where: any = {};

    if (filters?.action) where.action = filters.action;
    if (filters?.entityType) where.entityType = filters.entityType;
    if (filters?.userRole) where.userRole = filters.userRole;
    
    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters?.startDate) where.createdAt.gte = filters.startDate;
      if (filters?.endDate) where.createdAt.lte = filters.endDate;
    }

    return await prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100, // Limitar a 100 registros mais recentes
    });
  }

  static async getLogsByUser(userId: number, userRole: 'EMPLOYEE' | 'CLIENT') {
    return await prisma.activityLog.findMany({
      where: {
        userId,
        userRole,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }
}

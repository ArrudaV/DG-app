"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.contractsRouter = void 0;
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middlewares/auth");
const zod_1 = require("zod");
const activityLogger_1 = require("../services/activityLogger");
const contractStatusService_1 = require("../services/contractStatusService");
exports.contractsRouter = (0, express_1.Router)();
const upsertSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Nome é obrigatório'),
    description: zod_1.z.string().optional(),
    status: zod_1.z.enum(['DRAFT', 'ACTIVE', 'EXPIRING', 'EXPIRED']).optional(),
    autoStatus: zod_1.z.boolean().optional(),
    value: zod_1.z.union([zod_1.z.number().positive('Valor deve ser positivo'), zod_1.z.string().transform((val) => parseFloat(val)).refine((val) => !isNaN(val) && val > 0, 'Valor deve ser um número positivo')]),
    expirationDate: zod_1.z.string().optional().transform((val) => val ? new Date(val + 'T00:00:00') : null),
    fileUrl: zod_1.z.string().optional(),
    fileName: zod_1.z.string().optional(),
    fileType: zod_1.z.string().optional(),
    clientId: zod_1.z.union([zod_1.z.number().int('ID do cliente deve ser um número inteiro'), zod_1.z.string().transform((val) => parseInt(val)).refine((val) => !isNaN(val) && val > 0, 'ID do cliente deve ser um número válido')]),
});
// CRUD completo para funcionários
exports.contractsRouter.use(auth_1.authenticate);
exports.contractsRouter.get('/', (0, auth_1.requireRole)('EMPLOYEE'), async (req, res) => {
    const { search, page = '1', limit = '10' } = req.query;
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    const skip = (pageNum - 1) * limitNum;
    let whereClause = {};
    if (search) {
        whereClause = {
            name: {
                contains: search
            }
        };
    }
    // Buscar total de contratos para paginação
    const total = await prisma_1.prisma.contract.count({ where: whereClause });
    const contracts = await prisma_1.prisma.contract.findMany({
        where: whereClause,
        include: { client: true },
        orderBy: { id: 'desc' },
        skip,
        take: limitNum
    });
    // Atualizar status automaticamente para contratos com autoStatus = true
    // Usar Promise.all para executar todas as atualizações em paralelo
    const updatePromises = contracts
        .filter((contract) => contract.autoStatus && contract.expirationDate)
        .map((contract) => contractStatusService_1.ContractStatusService.updateContractStatus(contract.id));
    await Promise.all(updatePromises);
    // Buscar contratos atualizados
    const updatedContracts = await prisma_1.prisma.contract.findMany({
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
exports.contractsRouter.get('/my', (0, auth_1.requireRole)('CLIENT'), async (req, res) => {
    const contracts = await prisma_1.prisma.contract.findMany({
        where: { clientId: req.user.id },
        orderBy: { id: 'desc' },
        include: { client: true }
    });
    res.json(contracts);
});
exports.contractsRouter.get('/:id', (0, auth_1.requireRole)('EMPLOYEE'), async (req, res) => {
    const id = Number(req.params.id);
    const contract = await prisma_1.prisma.contract.findUnique({
        where: { id },
        include: { client: true }
    });
    if (!contract)
        return res.status(404).json({ message: 'Contrato não encontrado' });
    res.json(contract);
});
exports.contractsRouter.post('/', (0, auth_1.requireRole)('EMPLOYEE'), async (req, res) => {
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
        const client = await prisma_1.prisma.client.findUnique({ where: { id: clientId } });
        if (!client) {
            return res.status(404).json({ message: 'Cliente não encontrado' });
        }
        // Calcular status inicial baseado no autoStatus e data de expiração
        let initialStatus = status || 'DRAFT';
        // Calcular status automático se habilitado
        if (autoStatus && expirationDate) {
            const calculatedStatus = contractStatusService_1.ContractStatusService.calculateContractStatus(expirationDate);
            if (calculatedStatus) {
                initialStatus = calculatedStatus;
            }
        }
        // Criar o contrato
        const contract = await prisma_1.prisma.contract.create({
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
                employeeId: req.user.id
            }
        });
        // Registrar atividade (não bloquear se falhar)
        try {
            await activityLogger_1.ActivityLogger.log({
                action: 'CREATE',
                entityType: 'CONTRACT',
                entityId: contract.id,
                description: `Contrato "${name}" foi criado pelo funcionário ${req.user.id} para o cliente ${client.name}`,
                userId: req.user.id,
                userRole: 'EMPLOYEE',
                userEmail: req.user.email || 'unknown'
            });
        }
        catch (logError) {
            console.error('Erro ao registrar atividade:', logError);
            // Não falhar a operação principal por causa do log
        }
        res.status(201).json(contract);
    }
    catch (error) {
        console.error('Erro ao criar contrato:', error);
        res.status(500).json({
            message: 'Erro interno do servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});
exports.contractsRouter.put('/:id', (0, auth_1.requireRole)('EMPLOYEE'), async (req, res) => {
    try {
        const id = Number(req.params.id);
        // Verificar se o contrato existe
        const existingContract = await prisma_1.prisma.contract.findUnique({ where: { id } });
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
        const updateData = { ...parse.data };
        // Processar valor se fornecido
        if (updateData.value) {
            updateData.value = updateData.value;
        }
        // Calcular status automaticamente se autoStatus estiver ativo
        if (updateData.autoStatus && updateData.expirationDate) {
            const calculatedStatus = contractStatusService_1.ContractStatusService.calculateContractStatus(updateData.expirationDate);
            if (calculatedStatus) {
                updateData.status = calculatedStatus;
            }
        }
        // Remover clientId se não for fornecido para evitar erro de tipo
        if (!updateData.clientId) {
            delete updateData.clientId;
        }
        const updated = await prisma_1.prisma.contract.update({ where: { id }, data: updateData });
        // Registrar atividade
        await activityLogger_1.ActivityLogger.log({
            action: 'UPDATE',
            entityType: 'CONTRACT',
            entityId: id,
            description: `Contrato "${updated.name}" foi atualizado pelo funcionário ${req.user.id}`,
            userId: req.user.id,
            userRole: 'EMPLOYEE',
            userEmail: req.user.email || 'unknown'
        });
        res.json(updated);
    }
    catch (error) {
        console.error('Erro ao atualizar contrato:', error);
        res.status(500).json({
            message: 'Erro interno do servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});
exports.contractsRouter.delete('/:id', (0, auth_1.requireRole)('EMPLOYEE'), async (req, res) => {
    const id = Number(req.params.id);
    // Buscar dados do contrato antes de deletar
    const contract = await prisma_1.prisma.contract.findUnique({ where: { id } });
    await prisma_1.prisma.contract.delete({ where: { id } });
    // Registrar atividade
    if (contract) {
        await activityLogger_1.ActivityLogger.log({
            action: 'DELETE',
            entityType: 'CONTRACT',
            entityId: id,
            description: `Contrato "${contract.name}" foi excluído pelo funcionário ${req.user.id}`,
            userId: req.user.id,
            userRole: 'EMPLOYEE',
            userEmail: req.user.email || 'unknown'
        });
    }
    res.status(204).send();
});
// Rota para atualizar status de todos os contratos automaticamente
exports.contractsRouter.post('/update-statuses', (0, auth_1.requireRole)('EMPLOYEE'), async (req, res) => {
    try {
        await contractStatusService_1.ContractStatusService.updateAllContractStatuses();
        res.json({ message: 'Status de todos os contratos atualizados com sucesso' });
    }
    catch (error) {
        console.error('Erro ao atualizar status dos contratos:', error);
        res.status(500).json({
            message: 'Erro ao atualizar status dos contratos',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});
//# sourceMappingURL=contracts.js.map
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.clientsRouter = void 0;
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middlewares/auth");
const zod_1 = require("zod");
const activityLogger_1 = require("../services/activityLogger");
exports.clientsRouter = (0, express_1.Router)();
exports.clientsRouter.use(auth_1.authenticate, (0, auth_1.requireRole)('EMPLOYEE'));
exports.clientsRouter.get('/', async (req, res) => {
    const { search } = req.query;
    let whereClause = {};
    if (search) {
        whereClause = {
            name: {
                contains: search
            }
        };
    }
    const clients = await prisma_1.prisma.client.findMany({
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
    const result = clients.map((c) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        createdById: c.createdById,
        contractsCount: c._count.contracts
    }));
    res.json(result);
});
exports.clientsRouter.get('/:id', async (req, res) => {
    const id = Number(req.params.id);
    const client = await prisma_1.prisma.client.findUnique({ where: { id } });
    if (!client)
        return res.status(404).json({ message: 'Cliente não encontrado' });
    res.json({ id: client.id, name: client.name, email: client.email });
});
const upsertSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(6).optional(),
});
exports.clientsRouter.post('/', async (req, res) => {
    const parse = upsertSchema.safeParse(req.body);
    if (!parse.success)
        return res.status(400).json(parse.error.format());
    const { name, email, password } = parse.data;
    const exists = await prisma_1.prisma.client.findUnique({ where: { email } });
    if (exists)
        return res.status(409).json({ message: 'Email já cadastrado' });
    let passwordHash;
    if (password) {
        const bcrypt = await Promise.resolve().then(() => __importStar(require('bcrypt')));
        passwordHash = await bcrypt.hash(password, 10);
    }
    else {
        return res.status(400).json({ message: 'Senha é obrigatória na criação' });
    }
    const client = await prisma_1.prisma.client.create({ data: { name, email, password: passwordHash, createdById: req.user.id } });
    // Registrar atividade
    await activityLogger_1.ActivityLogger.log({
        action: 'CREATE',
        entityType: 'CLIENT',
        entityId: client.id,
        description: `Cliente ${name} (${email}) foi criado pelo funcionário ${req.user.id}`,
        userId: req.user.id,
        userRole: 'EMPLOYEE',
        userEmail: req.user.email || 'unknown'
    });
    res.status(201).json({ id: client.id, name: client.name, email: client.email });
});
exports.clientsRouter.put('/:id', async (req, res) => {
    const id = Number(req.params.id);
    const parse = upsertSchema.safeParse(req.body);
    if (!parse.success)
        return res.status(400).json(parse.error.format());
    const { name, email, password } = parse.data;
    let passwordHash;
    if (password) {
        const bcrypt = await Promise.resolve().then(() => __importStar(require('bcrypt')));
        passwordHash = await bcrypt.hash(password, 10);
    }
    const updated = await prisma_1.prisma.client.update({ where: { id }, data: { name, email, ...(passwordHash ? { password: passwordHash } : {}) } });
    // Registrar atividade
    await activityLogger_1.ActivityLogger.log({
        action: 'UPDATE',
        entityType: 'CLIENT',
        entityId: id,
        description: `Cliente ${updated.name} (${updated.email}) foi atualizado pelo funcionário ${req.user.id}`,
        userId: req.user.id,
        userRole: 'EMPLOYEE',
        userEmail: req.user.email || 'unknown'
    });
    res.json({ id: updated.id, name: updated.name, email: updated.email });
});
exports.clientsRouter.delete('/:id', async (req, res) => {
    const id = Number(req.params.id);
    // Buscar dados do cliente antes de deletar
    const client = await prisma_1.prisma.client.findUnique({ where: { id } });
    await prisma_1.prisma.contract.deleteMany({ where: { clientId: id } });
    await prisma_1.prisma.client.delete({ where: { id } });
    // Registrar atividade
    if (client) {
        await activityLogger_1.ActivityLogger.log({
            action: 'DELETE',
            entityType: 'CLIENT',
            entityId: id,
            description: `Cliente ${client.name} (${client.email}) foi excluído pelo funcionário ${req.user.id}`,
            userId: req.user.id,
            userRole: 'EMPLOYEE',
            userEmail: req.user.email || 'unknown'
        });
    }
    res.status(204).send();
});
//# sourceMappingURL=clients.js.map
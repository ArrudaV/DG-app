"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRouter = void 0;
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const zod_1 = require("zod");
const activityLogger_1 = require("../services/activityLogger");
exports.authRouter = (0, express_1.Router)();
const registerEmployeeSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Nome é obrigatório').max(100, 'Nome muito longo'),
    email: zod_1.z.string().email('Email inválido').max(255, 'Email muito longo'),
    password: zod_1.z.string().min(6, 'Senha deve ter pelo menos 6 caracteres').max(100, 'Senha muito longa'),
});
exports.authRouter.post('/employee/register', async (req, res) => {
    const parse = registerEmployeeSchema.safeParse(req.body);
    if (!parse.success)
        return res.status(400).json(parse.error.format());
    const { name, email, password } = parse.data;
    const existing = await prisma_1.prisma.employee.findUnique({ where: { email } });
    if (existing)
        return res.status(409).json({ message: 'Email já cadastrado' });
    const passwordHash = await bcrypt_1.default.hash(password, 10);
    const employee = await prisma_1.prisma.employee.create({ data: { name, email, password: passwordHash } });
    // Registrar atividade
    await activityLogger_1.ActivityLogger.log({
        action: 'CREATE',
        entityType: 'EMPLOYEE',
        entityId: employee.id,
        description: `Funcionário ${name} (${email}) foi cadastrado no sistema`,
        userId: employee.id,
        userRole: 'EMPLOYEE',
        userEmail: email
    });
    return res.status(201).json({ id: employee.id, name: employee.name, email: employee.email });
});
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email('Email inválido').max(255, 'Email muito longo'),
    password: zod_1.z.string().min(1, 'Senha é obrigatória').max(100, 'Senha muito longa'),
});
exports.authRouter.post('/employee/login', async (req, res) => {
    const parse = loginSchema.safeParse(req.body);
    if (!parse.success)
        return res.status(400).json(parse.error.format());
    const { email, password } = parse.data;
    const employee = await prisma_1.prisma.employee.findUnique({ where: { email } });
    if (!employee)
        return res.status(401).json({ message: 'Credenciais inválidas' });
    const ok = await bcrypt_1.default.compare(password, employee.password);
    if (!ok)
        return res.status(401).json({ message: 'Credenciais inválidas' });
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
        return res.status(500).json({ message: 'Configuração de segurança inválida' });
    }
    const token = jsonwebtoken_1.default.sign({ id: employee.id, role: 'EMPLOYEE', email: employee.email }, jwtSecret, { expiresIn: '1d' });
    // Registrar atividade
    await activityLogger_1.ActivityLogger.log({
        action: 'LOGIN',
        entityType: 'EMPLOYEE',
        description: `Funcionário ${employee.name} (${email}) fez login no sistema`,
        userId: employee.id,
        userRole: 'EMPLOYEE',
        userEmail: email
    });
    res.json({
        token,
        user: {
            id: employee.id,
            name: employee.name,
            email: employee.email,
            role: 'EMPLOYEE'
        }
    });
});
const registerClientSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Nome é obrigatório').max(100, 'Nome muito longo'),
    email: zod_1.z.string().email('Email inválido').max(255, 'Email muito longo'),
    password: zod_1.z.string().min(6, 'Senha deve ter pelo menos 6 caracteres').max(100, 'Senha muito longa'),
});
// Registro de cliente só pode ser feito por funcionário autenticado
const auth_1 = require("../middlewares/auth");
exports.authRouter.post('/client/register', auth_1.authenticate, (0, auth_1.requireRole)('EMPLOYEE'), async (req, res) => {
    const parse = registerClientSchema.safeParse(req.body);
    if (!parse.success)
        return res.status(400).json(parse.error.format());
    const { name, email, password } = parse.data;
    const existing = await prisma_1.prisma.client.findUnique({ where: { email } });
    if (existing)
        return res.status(409).json({ message: 'Email já cadastrado' });
    const passwordHash = await bcrypt_1.default.hash(password, 10);
    const client = await prisma_1.prisma.client.create({ data: { name, email, password: passwordHash, createdById: req.user.id } });
    // Registrar atividade
    await activityLogger_1.ActivityLogger.log({
        action: 'CREATE',
        entityType: 'CLIENT',
        entityId: client.id,
        description: `Cliente ${name} (${email}) foi cadastrado pelo funcionário ${req.user.id}`,
        userId: req.user.id,
        userRole: 'EMPLOYEE',
        userEmail: req.user.email || 'unknown'
    });
    return res.status(201).json({ id: client.id, name: client.name, email: client.email });
});
exports.authRouter.post('/client/login', async (req, res) => {
    const parse = loginSchema.safeParse(req.body);
    if (!parse.success)
        return res.status(400).json(parse.error.format());
    const { email, password } = parse.data;
    const client = await prisma_1.prisma.client.findUnique({ where: { email } });
    if (!client)
        return res.status(401).json({ message: 'Credenciais inválidas' });
    const ok = await bcrypt_1.default.compare(password, client.password);
    if (!ok)
        return res.status(401).json({ message: 'Credenciais inválidas' });
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
        return res.status(500).json({ message: 'Configuração de segurança inválida' });
    }
    const token = jsonwebtoken_1.default.sign({ id: client.id, role: 'CLIENT', email: client.email }, jwtSecret, { expiresIn: '1d' });
    // Registrar atividade
    await activityLogger_1.ActivityLogger.log({
        action: 'LOGIN',
        entityType: 'CLIENT',
        description: `Cliente ${client.name} (${email}) fez login no sistema`,
        userId: client.id,
        userRole: 'CLIENT',
        userEmail: email
    });
    res.json({
        token,
        user: {
            id: client.id,
            name: client.name,
            email: client.email,
            role: 'CLIENT'
        }
    });
});
//# sourceMappingURL=auth.js.map
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = authenticate;
exports.requireRole = requireRole;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
function authenticate(req, res, next) {
    const header = req.headers.authorization;
    if (!header) {
        return res.status(401).json({ message: 'Não autenticado' });
    }
    const token = header.replace('Bearer ', '');
    try {
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            return res.status(500).json({ message: 'Configuração de segurança inválida' });
        }
        const payload = jsonwebtoken_1.default.verify(token, jwtSecret);
        req.user = payload;
        next();
    }
    catch (e) {
        return res.status(401).json({ message: 'Token inválido' });
    }
}
function requireRole(role) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Não autenticado' });
        }
        if (req.user.role !== role) {
            return res.status(403).json({ message: 'Acesso negado' });
        }
        next();
    };
}
//# sourceMappingURL=auth.js.map
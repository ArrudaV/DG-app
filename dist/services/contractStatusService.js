"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContractStatusService = void 0;
const prisma_1 = require("../lib/prisma");
class ContractStatusService {
    /**
     * Atualiza automaticamente o status de um contrato baseado na data de expiração
     */
    static async updateContractStatus(contractId) {
        const contract = await prisma_1.prisma.contract.findUnique({
            where: { id: contractId }
        });
        if (!contract || !contract.autoStatus || !contract.expirationDate) {
            return;
        }
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Reset para início do dia
        const expirationDate = new Date(contract.expirationDate);
        expirationDate.setHours(0, 0, 0, 0);
        const daysUntilExpiration = Math.ceil((expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        let newStatus;
        if (daysUntilExpiration < 0) {
            // Contrato já expirou
            newStatus = 'EXPIRED';
        }
        else if (daysUntilExpiration <= 15) {
            // Contrato expira em 15 dias ou menos
            newStatus = 'EXPIRING';
        }
        else {
            // Contrato ainda tem mais de 15 dias
            newStatus = 'ACTIVE';
        }
        // Só atualiza se o status mudou
        if (contract.status !== newStatus) {
            await prisma_1.prisma.contract.update({
                where: { id: contractId },
                data: { status: newStatus }
            });
        }
    }
    /**
     * Atualiza automaticamente o status de todos os contratos com autoStatus = true
     */
    static async updateAllContractStatuses() {
        const contracts = await prisma_1.prisma.contract.findMany({
            where: {
                autoStatus: true,
                expirationDate: { not: null }
            }
        });
        for (const contract of contracts) {
            await this.updateContractStatus(contract.id);
        }
    }
    /**
     * Calcula o status que um contrato teria baseado na data de expiração
     * (sem salvar no banco, apenas para exibição)
     */
    static calculateContractStatus(expirationDate) {
        if (!expirationDate) {
            return null;
        }
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const expDate = new Date(expirationDate);
        expDate.setHours(0, 0, 0, 0);
        const daysUntilExpiration = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (daysUntilExpiration < 0) {
            return 'EXPIRED';
        }
        else if (daysUntilExpiration <= 15) {
            return 'EXPIRING';
        }
        else {
            return 'ACTIVE';
        }
    }
}
exports.ContractStatusService = ContractStatusService;
//# sourceMappingURL=contractStatusService.js.map
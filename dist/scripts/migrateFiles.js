"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateExistingFiles = migrateExistingFiles;
const fileEncryption_1 = require("../lib/fileEncryption");
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
/**
 * Script para migrar arquivos existentes para o formato criptografado
 */
async function migrateExistingFiles() {
    try {
        console.log('🔄 Iniciando migração de arquivos para criptografia...');
        const uploadsDir = path_1.default.join(__dirname, '../../uploads');
        // Verificar se o diretório de uploads existe
        try {
            await promises_1.default.access(uploadsDir);
        }
        catch {
            console.log('❌ Diretório de uploads não encontrado');
            return;
        }
        // Listar todos os arquivos no diretório de uploads
        const files = await promises_1.default.readdir(uploadsDir);
        const filesToEncrypt = files.filter(file => !file.endsWith('.encrypted') &&
            !file.endsWith('.temp') &&
            !file.startsWith('.'));
        if (filesToEncrypt.length === 0) {
            console.log('✅ Nenhum arquivo para migrar encontrado');
            return;
        }
        console.log(`📁 Encontrados ${filesToEncrypt.length} arquivos para migrar:`);
        filesToEncrypt.forEach(file => console.log(`  - ${file}`));
        let successCount = 0;
        let errorCount = 0;
        for (const file of filesToEncrypt) {
            try {
                const originalPath = path_1.default.join(uploadsDir, file);
                const encryptedPath = originalPath + '.encrypted';
                console.log(`🔐 Criptografando: ${file}`);
                // Criptografar o arquivo
                await fileEncryption_1.FileEncryption.encryptFile(originalPath, encryptedPath, fileEncryption_1.FileEncryption.getEncryptionPassword());
                // Remover arquivo original
                await promises_1.default.unlink(originalPath);
                console.log(`✅ Migrado com sucesso: ${file}`);
                successCount++;
            }
            catch (error) {
                console.error(`❌ Erro ao migrar ${file}:`, error);
                errorCount++;
            }
        }
        console.log('\n📊 Resumo da migração:');
        console.log(`✅ Arquivos migrados com sucesso: ${successCount}`);
        console.log(`❌ Arquivos com erro: ${errorCount}`);
        console.log(`📁 Total de arquivos processados: ${filesToEncrypt.length}`);
        if (errorCount === 0) {
            console.log('\n🎉 Migração concluída com sucesso!');
        }
        else {
            console.log('\n⚠️  Migração concluída com alguns erros. Verifique os logs acima.');
        }
    }
    catch (error) {
        console.error('❌ Erro fatal durante a migração:', error);
        process.exit(1);
    }
}
// Executar migração se o script for chamado diretamente
if (require.main === module) {
    migrateExistingFiles();
}
//# sourceMappingURL=migrateFiles.js.map
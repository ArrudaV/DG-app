import { FileEncryption } from '../lib/fileEncryption';
import fs from 'fs/promises';
import path from 'path';

/**
 * Script para migrar arquivos existentes para o formato criptografado
 */
async function migrateExistingFiles() {
  try {
    console.log('🔄 Iniciando migração de arquivos para criptografia...');
    
    const uploadsDir = path.join(__dirname, '../../uploads');
    
    // Verificar se o diretório de uploads existe
    try {
      await fs.access(uploadsDir);
    } catch {
      console.log('❌ Diretório de uploads não encontrado');
      return;
    }
    
    // Listar todos os arquivos no diretório de uploads
    const files = await fs.readdir(uploadsDir);
    const filesToEncrypt = files.filter(file => 
      !file.endsWith('.encrypted') && 
      !file.endsWith('.temp') &&
      !file.startsWith('.')
    );
    
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
        const originalPath = path.join(uploadsDir, file);
        const encryptedPath = originalPath + '.encrypted';
        
        console.log(`🔐 Criptografando: ${file}`);
        
        // Criptografar o arquivo
        await FileEncryption.encryptFile(originalPath, encryptedPath, FileEncryption.getEncryptionPassword());
        
        // Remover arquivo original
        await fs.unlink(originalPath);
        
        console.log(`✅ Migrado com sucesso: ${file}`);
        successCount++;
        
      } catch (error) {
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
    } else {
      console.log('\n⚠️  Migração concluída com alguns erros. Verifique os logs acima.');
    }
    
  } catch (error) {
    console.error('❌ Erro fatal durante a migração:', error);
    process.exit(1);
  }
}

// Executar migração se o script for chamado diretamente
if (require.main === module) {
  migrateExistingFiles();
}

export { migrateExistingFiles };


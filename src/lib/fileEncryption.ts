import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

export class FileEncryption {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly KEY_LENGTH = 32; // 256 bits
  private static readonly IV_LENGTH = 16; // 128 bits
  private static readonly TAG_LENGTH = 16; // 128 bits

  /**
   * Gera uma chave de criptografia a partir de uma senha usando PBKDF2
   */
  private static generateKey(password: string, salt: Buffer): Buffer {
    return crypto.pbkdf2Sync(password, salt, 100000, this.KEY_LENGTH, 'sha256');
  }

  /**
   * Criptografa um arquivo
   */
  static async encryptFile(inputPath: string, outputPath: string, password: string): Promise<void> {
    try {
      // Ler o arquivo original
      const fileData = await fs.readFile(inputPath);
      
      // Gerar salt e IV aleatórios
      const salt = crypto.randomBytes(16);
      const iv = crypto.randomBytes(this.IV_LENGTH);
      
      // Gerar chave a partir da senha
      const key = this.generateKey(password, salt);
      
      // Criar cipher
      const cipher = crypto.createCipheriv(this.ALGORITHM, key, iv);
      cipher.setAAD(salt); // Adicionar salt como dados adicionais autenticados
      
      // Criptografar dados
      let encrypted = cipher.update(fileData);
      encrypted = Buffer.concat([encrypted, cipher.final()]);
      
      // Obter tag de autenticação
      const tag = cipher.getAuthTag();
      
      // Combinar salt + iv + tag + dados criptografados
      const encryptedData = Buffer.concat([salt, iv, tag, encrypted]);
      
      // Salvar arquivo criptografado
      await fs.writeFile(outputPath, encryptedData);
      
      console.log(`✅ Arquivo criptografado: ${inputPath} -> ${outputPath}`);
    } catch (error) {
      console.error('❌ Erro ao criptografar arquivo:', error);
      throw new Error('Falha na criptografia do arquivo');
    }
  }

  /**
   * Descriptografa um arquivo
   */
  static async decryptFile(inputPath: string, outputPath: string, password: string): Promise<void> {
    try {
      // Ler arquivo criptografado
      const encryptedData = await fs.readFile(inputPath);
      
      // Extrair componentes
      const salt = encryptedData.subarray(0, 16);
      const iv = encryptedData.subarray(16, 16 + this.IV_LENGTH);
      const tag = encryptedData.subarray(16 + this.IV_LENGTH, 16 + this.IV_LENGTH + this.TAG_LENGTH);
      const encrypted = encryptedData.subarray(16 + this.IV_LENGTH + this.TAG_LENGTH);
      
      // Gerar chave a partir da senha
      const key = this.generateKey(password, salt);
      
      // Criar decipher
      const decipher = crypto.createDecipheriv(this.ALGORITHM, key, iv);
      decipher.setAAD(salt); // Verificar dados adicionais autenticados
      decipher.setAuthTag(tag); // Definir tag de autenticação
      
      // Descriptografar dados
      let decrypted = decipher.update(encrypted);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      
      // Salvar arquivo descriptografado
      await fs.writeFile(outputPath, decrypted);
      
      console.log(`✅ Arquivo descriptografado: ${inputPath} -> ${outputPath}`);
    } catch (error) {
      console.error('❌ Erro ao descriptografar arquivo:', error);
      throw new Error('Falha na descriptografia do arquivo');
    }
  }

  /**
   * Criptografa dados em buffer
   */
  static encryptBuffer(data: Buffer, password: string): Buffer {
    // Gerar salt e IV aleatórios
    const salt = crypto.randomBytes(16);
    const iv = crypto.randomBytes(this.IV_LENGTH);
    
    // Gerar chave a partir da senha
    const key = this.generateKey(password, salt);
    
    // Criar cipher
    const cipher = crypto.createCipheriv(this.ALGORITHM, key, iv);
    cipher.setAAD(salt);
    
    // Criptografar dados
    let encrypted = cipher.update(data);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    
    // Obter tag de autenticação
    const tag = cipher.getAuthTag();
    
    // Combinar salt + iv + tag + dados criptografados
    return Buffer.concat([salt, iv, tag, encrypted]);
  }

  /**
   * Descriptografa dados em buffer
   */
  static decryptBuffer(encryptedData: Buffer, password: string): Buffer {
    // Extrair componentes
    const salt = encryptedData.subarray(0, 16);
    const iv = encryptedData.subarray(16, 16 + this.IV_LENGTH);
    const tag = encryptedData.subarray(16 + this.IV_LENGTH, 16 + this.IV_LENGTH + this.TAG_LENGTH);
    const encrypted = encryptedData.subarray(16 + this.IV_LENGTH + this.TAG_LENGTH);
    
    // Gerar chave a partir da senha
    const key = this.generateKey(password, salt);
    
    // Criar decipher
    const decipher = crypto.createDecipheriv(this.ALGORITHM, key, iv);
    decipher.setAAD(salt);
    decipher.setAuthTag(tag);
    
    // Descriptografar dados
    let decrypted = decipher.update(encrypted);
    return Buffer.concat([decrypted, decipher.final()]);
  }

  /**
   * Obtém a senha de criptografia do ambiente
   */
  static getEncryptionPassword(): string {
    const password = process.env.FILE_ENCRYPTION_PASSWORD;
    if (!password) {
      throw new Error('FILE_ENCRYPTION_PASSWORD não configurada no ambiente');
    }
    return password;
  }
}

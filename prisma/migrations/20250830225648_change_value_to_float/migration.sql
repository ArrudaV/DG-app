/*
  Warnings:

  - You are about to drop the column `title` on the `contract` table. All the data in the column will be lost.
  - The values [CANCELLED] on the enum `Contract_status` will be removed. If these variants are still used in the database, this will fail.
  - Added the required column `dueDate` to the `Contract` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `Contract` table without a default value. This is not possible if the table is not empty.
  - Added the required column `value` to the `Contract` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `contract` DROP COLUMN `title`,
    ADD COLUMN `dueDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `name` VARCHAR(191) NOT NULL DEFAULT 'Contrato',
    ADD COLUMN `value` DOUBLE NOT NULL DEFAULT 0,
    MODIFY `status` ENUM('DRAFT', 'ACTIVE', 'EXPIRING', 'EXPIRED') NOT NULL DEFAULT 'DRAFT';

-- Update existing records with proper values
UPDATE `contract` SET 
    `name` = CONCAT('Contrato ', id),
    `value` = 1000.00,
    `dueDate` = DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 30 DAY)
WHERE `name` = 'Contrato';

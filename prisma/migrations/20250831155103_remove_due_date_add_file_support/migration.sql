/*
  Warnings:

  - You are about to drop the column `dueDate` on the `contract` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `contract` DROP COLUMN `dueDate`,
    ADD COLUMN `fileName` VARCHAR(191) NULL,
    ADD COLUMN `fileType` VARCHAR(191) NULL,
    ADD COLUMN `fileUrl` VARCHAR(191) NULL;

/*
  Warnings:

  - You are about to drop the column `passwordHash` on the `client` table. All the data in the column will be lost.
  - You are about to drop the column `passwordHash` on the `employee` table. All the data in the column will be lost.
  - Added the required column `password` to the `Client` table without a default value. This is not possible if the table is not empty.
  - Added the required column `password` to the `Employee` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `client` ADD COLUMN `password` VARCHAR(191) NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE `employee` ADD COLUMN `password` VARCHAR(191) NOT NULL DEFAULT '';

-- Copy data from passwordHash to password
UPDATE `client` SET `password` = `passwordHash`;
UPDATE `employee` SET `password` = `passwordHash`;

-- Drop old columns
ALTER TABLE `client` DROP COLUMN `passwordHash`;
ALTER TABLE `employee` DROP COLUMN `passwordHash`;

-- CreateTable
CREATE TABLE `ActivityLog` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `action` VARCHAR(191) NOT NULL,
    `entityType` VARCHAR(191) NOT NULL,
    `entityId` INTEGER NULL,
    `description` VARCHAR(191) NOT NULL,
    `userId` INTEGER NOT NULL,
    `userRole` VARCHAR(191) NOT NULL,
    `userEmail` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

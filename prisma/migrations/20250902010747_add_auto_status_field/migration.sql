-- AlterTable
ALTER TABLE `contract` ADD COLUMN `autoStatus` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `expirationDate` DATETIME(3) NULL;

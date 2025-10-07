-- CreateTable
CREATE TABLE `docker` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `status` ENUM('ACTIVE', 'INACTIVE', 'PENDING') NOT NULL DEFAULT 'ACTIVE',
    `type` VARCHAR(191) NULL,
    `stopcommand` VARCHAR(191) NULL,
    `pid` INTEGER NULL,
    `localport` INTEGER NULL,
    `bindport` INTEGER NULL,
    `dockercompose` VARCHAR(191) NULL,
    `dockerlocation` VARCHAR(191) NULL,
    `description` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `docker_name_key`(`name`),
    INDEX `docker_name_idx`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `servermonitor` (
    `id` VARCHAR(191) NOT NULL,
    `dockerId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `cpu` DOUBLE NULL,
    `ram` DOUBLE NULL,
    `status` ENUM('ACTIVE', 'INACTIVE', 'PENDING') NOT NULL DEFAULT 'ACTIVE',
    `description` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `servermonitor_name_key`(`name`),
    INDEX `servermonitor_dockerId_idx`(`dockerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `servermonitor` ADD CONSTRAINT `servermonitor_dockerId_fkey` FOREIGN KEY (`dockerId`) REFERENCES `docker`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

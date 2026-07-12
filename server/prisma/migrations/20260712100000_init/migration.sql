-- CreateTable
CREATE TABLE `User` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `role` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Vehicle` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `regNo` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `capacityKg` DOUBLE NOT NULL,
    `odometer` DOUBLE NOT NULL,
    `acquisitionCost` DOUBLE NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'Available',

    UNIQUE INDEX `Vehicle_regNo_key`(`regNo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Driver` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `licenseNo` VARCHAR(191) NOT NULL,
    `licenseCategory` VARCHAR(191) NOT NULL,
    `licenseExpiry` DATETIME(3) NOT NULL,
    `contact` VARCHAR(191) NOT NULL,
    `safetyScore` INTEGER NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'Available',

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Trip` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `source` VARCHAR(191) NOT NULL,
    `destination` VARCHAR(191) NOT NULL,
    `vehicleId` INTEGER NOT NULL,
    `driverId` INTEGER NOT NULL,
    `cargoWeightKg` DOUBLE NOT NULL,
    `plannedDistanceKm` DOUBLE NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'Draft',
    `revenue` DOUBLE NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MaintenanceLog` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `vehicleId` INTEGER NOT NULL,
    `serviceType` VARCHAR(191) NOT NULL,
    `cost` DOUBLE NOT NULL,
    `date` DATETIME(3) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'Active',

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FuelLog` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `vehicleId` INTEGER NOT NULL,
    `liters` DOUBLE NOT NULL,
    `cost` DOUBLE NOT NULL,
    `date` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Expense` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tripId` INTEGER NULL,
    `vehicleId` INTEGER NOT NULL,
    `toll` DOUBLE NOT NULL,
    `misc` DOUBLE NOT NULL,
    `date` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `airRegSyncLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`syncId` varchar(64) NOT NULL,
	`facilityId` varchar(64) NOT NULL,
	`syncType` enum('full','incremental') NOT NULL,
	`status` enum('success','failed','pending') NOT NULL DEFAULT 'pending',
	`recordsProcessed` int NOT NULL DEFAULT 0,
	`recordsSucceeded` int NOT NULL DEFAULT 0,
	`recordsFailed` int NOT NULL DEFAULT 0,
	`errorMessage` varchar(1000),
	`syncStartTime` timestamp NOT NULL,
	`syncEndTime` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `airRegSyncLogs_id` PRIMARY KEY(`id`),
	CONSTRAINT `airRegSyncLogs_syncId_unique` UNIQUE(`syncId`)
);
--> statement-breakpoint
CREATE TABLE `dailySalesAggregation` (
	`id` int AUTO_INCREMENT NOT NULL,
	`aggregationId` varchar(64) NOT NULL,
	`facilityId` varchar(64) NOT NULL,
	`saleDate` date NOT NULL,
	`totalSales` int NOT NULL DEFAULT 0,
	`totalTransactions` int NOT NULL DEFAULT 0,
	`totalCustomers` int NOT NULL DEFAULT 0,
	`averageTransactionAmount` int NOT NULL DEFAULT 0,
	`totalTax` int NOT NULL DEFAULT 0,
	`totalDiscount` int NOT NULL DEFAULT 0,
	`paymentMethodBreakdown` varchar(1000),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `dailySalesAggregation_id` PRIMARY KEY(`id`),
	CONSTRAINT `dailySalesAggregation_aggregationId_unique` UNIQUE(`aggregationId`)
);
--> statement-breakpoint
CREATE TABLE `facilities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`facilityId` varchar(64) NOT NULL,
	`facilityName` varchar(100) NOT NULL,
	`facilityType` enum('clinic','gym','wellness','other') NOT NULL,
	`phone` varchar(20),
	`email` varchar(320),
	`postalCode` varchar(10),
	`prefecture` varchar(50),
	`city` varchar(100),
	`addressLine1` varchar(200),
	`addressLine2` varchar(200),
	`airRegId` varchar(100),
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `facilities_id` PRIMARY KEY(`id`),
	CONSTRAINT `facilities_facilityId_unique` UNIQUE(`facilityId`)
);
--> statement-breakpoint
CREATE TABLE `sales` (
	`id` int AUTO_INCREMENT NOT NULL,
	`saleId` varchar(64) NOT NULL,
	`facilityId` varchar(64) NOT NULL,
	`customerId` varchar(64),
	`transactionId` varchar(100) NOT NULL,
	`amount` int NOT NULL,
	`paymentMethod` enum('cash','credit_card','qr_code','other') NOT NULL,
	`itemCount` int NOT NULL DEFAULT 0,
	`taxAmount` int NOT NULL DEFAULT 0,
	`discountAmount` int NOT NULL DEFAULT 0,
	`notes` varchar(500),
	`syncedAt` timestamp NOT NULL DEFAULT (now()),
	`saleDate` date NOT NULL,
	`saleTime` varchar(10),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sales_id` PRIMARY KEY(`id`),
	CONSTRAINT `sales_saleId_unique` UNIQUE(`saleId`)
);
--> statement-breakpoint
CREATE TABLE `userFacilityRoles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`facilityId` varchar(64) NOT NULL,
	`role` enum('owner','manager','staff','viewer') NOT NULL DEFAULT 'staff',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `userFacilityRoles_id` PRIMARY KEY(`id`)
);

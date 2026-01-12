CREATE TABLE `advertisingChannels` (
	`id` int AUTO_INCREMENT NOT NULL,
	`channelId` varchar(64) NOT NULL,
	`facilityId` varchar(64) NOT NULL,
	`channelName` varchar(100) NOT NULL,
	`channelType` enum('google_ads','facebook','instagram','flyer','word_of_mouth','other') NOT NULL,
	`description` varchar(500),
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `advertisingChannels_id` PRIMARY KEY(`id`),
	CONSTRAINT `advertisingChannels_channelId_unique` UNIQUE(`channelId`)
);
--> statement-breakpoint
CREATE TABLE `advertisingExpenses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`expenseId` varchar(64) NOT NULL,
	`facilityId` varchar(64) NOT NULL,
	`channelId` varchar(64) NOT NULL,
	`expenseDate` date NOT NULL,
	`amount` int NOT NULL,
	`budget` int,
	`description` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `advertisingExpenses_id` PRIMARY KEY(`id`),
	CONSTRAINT `advertisingExpenses_expenseId_unique` UNIQUE(`expenseId`)
);
--> statement-breakpoint
CREATE TABLE `advertisingMetrics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`metricsId` varchar(64) NOT NULL,
	`facilityId` varchar(64) NOT NULL,
	`channelId` varchar(64) NOT NULL,
	`metricsDate` date NOT NULL,
	`totalExpense` int NOT NULL DEFAULT 0,
	`newCustomers` int NOT NULL DEFAULT 0,
	`cpa` int NOT NULL DEFAULT 0,
	`totalRevenue` int NOT NULL DEFAULT 0,
	`roas` int NOT NULL DEFAULT 0,
	`ltv` int NOT NULL DEFAULT 0,
	`ltvCacRatio` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `advertisingMetrics_id` PRIMARY KEY(`id`),
	CONSTRAINT `advertisingMetrics_metricsId_unique` UNIQUE(`metricsId`)
);
--> statement-breakpoint
CREATE TABLE `customerAcquisitionChannels` (
	`id` int AUTO_INCREMENT NOT NULL,
	`acquisitionId` varchar(64) NOT NULL,
	`customerId` varchar(64) NOT NULL,
	`facilityId` varchar(64) NOT NULL,
	`channelId` varchar(64) NOT NULL,
	`acquisitionDate` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `customerAcquisitionChannels_id` PRIMARY KEY(`id`),
	CONSTRAINT `customerAcquisitionChannels_acquisitionId_unique` UNIQUE(`acquisitionId`)
);

CREATE TABLE `advertisingBreakdown` (
	`id` int AUTO_INCREMENT NOT NULL,
	`breakdownId` varchar(64) NOT NULL,
	`expenseId` varchar(64) NOT NULL,
	`channel` enum('meta','google','flyer') NOT NULL,
	`amount` decimal(12,2) NOT NULL DEFAULT '0',
	`notes` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `advertisingBreakdown_id` PRIMARY KEY(`id`),
	CONSTRAINT `advertisingBreakdown_breakdownId_unique` UNIQUE(`breakdownId`)
);
--> statement-breakpoint
CREATE TABLE `monthlyExpenses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`expenseId` varchar(64) NOT NULL,
	`yearMonth` varchar(7) NOT NULL,
	`revenue` decimal(12,2) NOT NULL DEFAULT '0',
	`costProductSales` decimal(12,2) NOT NULL DEFAULT '0',
	`costTreatmentMaterials` decimal(12,2) NOT NULL DEFAULT '0',
	`laborCosts` decimal(12,2) NOT NULL DEFAULT '0',
	`rent` decimal(12,2) NOT NULL DEFAULT '0',
	`utilities` decimal(12,2) NOT NULL DEFAULT '0',
	`otherExpenses` decimal(12,2) NOT NULL DEFAULT '0',
	`advertisingTotal` decimal(12,2) NOT NULL DEFAULT '0',
	`grossProfit` decimal(12,2) NOT NULL DEFAULT '0',
	`operatingIncome` decimal(12,2) NOT NULL DEFAULT '0',
	`notes` varchar(1000),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `monthlyExpenses_id` PRIMARY KEY(`id`),
	CONSTRAINT `monthlyExpenses_expenseId_unique` UNIQUE(`expenseId`)
);

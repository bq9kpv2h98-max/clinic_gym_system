CREATE TABLE `customers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`customerId` varchar(64) NOT NULL,
	`fullName` varchar(100) NOT NULL,
	`dateOfBirth` date NOT NULL,
	`gender` enum('male','female','other','prefer_not_to_say') NOT NULL,
	`phone` varchar(20) NOT NULL,
	`email` varchar(320),
	`postalCode` varchar(10) NOT NULL,
	`prefecture` varchar(50) NOT NULL,
	`city` varchar(100) NOT NULL,
	`addressLine1` varchar(200) NOT NULL,
	`addressLine2` varchar(200),
	`qrCodeData` varchar(512) NOT NULL,
	`qrCodeImageUrl` varchar(512),
	`totalPoints` int NOT NULL DEFAULT 0,
	`lifetimePoints` int NOT NULL DEFAULT 0,
	`lastPointActivityDate` timestamp,
	`pointExpirationDate` date,
	`visitCount` int NOT NULL DEFAULT 0,
	`lastVisitDate` timestamp,
	`totalSpent` decimal(12,2) DEFAULT '0',
	`customFields` varchar(1000),
	`isActive` int NOT NULL DEFAULT 1,
	`registrationDate` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `customers_id` PRIMARY KEY(`id`),
	CONSTRAINT `customers_customerId_unique` UNIQUE(`customerId`),
	CONSTRAINT `customers_qrCodeData_unique` UNIQUE(`qrCodeData`)
);
--> statement-breakpoint
CREATE TABLE `pointTransactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`transactionId` varchar(64) NOT NULL,
	`customerId` varchar(64) NOT NULL,
	`transactionType` enum('earn','redeem','expire','adjust','bonus','rollback') NOT NULL,
	`points` int NOT NULL,
	`balanceAfter` int NOT NULL,
	`description` varchar(500),
	`staffId` varchar(64),
	`staffName` varchar(100),
	`adjustmentReason` varchar(500),
	`extendedExpirationTo` date,
	`transactionDate` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pointTransactions_id` PRIMARY KEY(`id`),
	CONSTRAINT `pointTransactions_transactionId_unique` UNIQUE(`transactionId`)
);
--> statement-breakpoint
CREATE TABLE `staff` (
	`id` int AUTO_INCREMENT NOT NULL,
	`staffId` varchar(64) NOT NULL,
	`staffCode` varchar(50),
	`fullName` varchar(100) NOT NULL,
	`email` varchar(320),
	`role` enum('admin','manager','staff') NOT NULL DEFAULT 'staff',
	`permissions` varchar(1000),
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `staff_id` PRIMARY KEY(`id`),
	CONSTRAINT `staff_staffId_unique` UNIQUE(`staffId`)
);
--> statement-breakpoint
--> statement-breakpoint
CREATE TABLE `visits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`visitId` varchar(64) NOT NULL,
	`customerId` varchar(64) NOT NULL,
	`visitDate` timestamp NOT NULL DEFAULT (now()),
	`staffId` varchar(64),
	`visitType` varchar(50),
	`pointsEarned` int DEFAULT 0,
	`notes` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `visits_id` PRIMARY KEY(`id`),
	CONSTRAINT `visits_visitId_unique` UNIQUE(`visitId`)
);

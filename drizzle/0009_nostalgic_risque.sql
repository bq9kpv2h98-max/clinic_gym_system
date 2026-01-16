CREATE TABLE `notionSyncLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`syncId` varchar(64) NOT NULL,
	`syncType` enum('manual','scheduled') NOT NULL,
	`status` enum('success','partial','failed') NOT NULL,
	`totalCustomers` int NOT NULL DEFAULT 0,
	`successCount` int NOT NULL DEFAULT 0,
	`errorCount` int NOT NULL DEFAULT 0,
	`updatedFields` json,
	`errors` json,
	`executionTime` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notionSyncLogs_id` PRIMARY KEY(`id`),
	CONSTRAINT `notionSyncLogs_syncId_unique` UNIQUE(`syncId`)
);

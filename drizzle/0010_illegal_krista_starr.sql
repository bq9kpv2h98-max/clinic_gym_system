CREATE TABLE `reservationLinkLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`linkId` varchar(64) NOT NULL,
	`linkType` enum('manual','scheduled','batch') NOT NULL,
	`status` enum('success','partial','failed') NOT NULL,
	`totalReservations` int NOT NULL DEFAULT 0,
	`successCount` int NOT NULL DEFAULT 0,
	`failedCount` int NOT NULL DEFAULT 0,
	`details` json,
	`errors` json,
	`executionTime` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `reservationLinkLogs_id` PRIMARY KEY(`id`),
	CONSTRAINT `reservationLinkLogs_linkId_unique` UNIQUE(`linkId`)
);

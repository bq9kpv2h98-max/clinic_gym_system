CREATE TABLE `notionReservations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`notionPageId` varchar(100),
	`customerName` varchar(100) NOT NULL,
	`serviceType` varchar(100),
	`status` varchar(50),
	`memo` text,
	`startAt` timestamp NOT NULL,
	`endAt` timestamp,
	`staffName` varchar(100),
	`syncedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `notionReservations_id` PRIMARY KEY(`id`),
	CONSTRAINT `notionReservations_notionPageId_unique` UNIQUE(`notionPageId`)
);

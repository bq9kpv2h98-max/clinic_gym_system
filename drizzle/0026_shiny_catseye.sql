CREATE TABLE `notionSchedules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`notionPageId` varchar(100),
	`title` varchar(200) NOT NULL,
	`startAt` timestamp NOT NULL,
	`endAt` timestamp NOT NULL,
	`memo` text,
	`syncedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `notionSchedules_id` PRIMARY KEY(`id`),
	CONSTRAINT `notionSchedules_notionPageId_unique` UNIQUE(`notionPageId`)
);

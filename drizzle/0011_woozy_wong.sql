CREATE TABLE `cronJobLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`jobName` varchar(100) NOT NULL,
	`status` enum('success','failed') NOT NULL,
	`startedAt` timestamp NOT NULL,
	`completedAt` timestamp NOT NULL,
	`duration` int NOT NULL,
	`totalItems` int NOT NULL,
	`successCount` int NOT NULL,
	`failedCount` int NOT NULL,
	`errorMessage` varchar(1000),
	`details` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `cronJobLogs_id` PRIMARY KEY(`id`)
);

CREATE TABLE `medicalRecords` (
	`id` int AUTO_INCREMENT NOT NULL,
	`recordId` varchar(64) NOT NULL,
	`customerId` varchar(64) NOT NULL,
	`visitDate` timestamp NOT NULL,
	`staffId` varchar(64),
	`staffName` varchar(100),
	`transcription` text,
	`summary` text,
	`notes` text,
	`tags` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `medicalRecords_id` PRIMARY KEY(`id`),
	CONSTRAINT `medicalRecords_recordId_unique` UNIQUE(`recordId`)
);

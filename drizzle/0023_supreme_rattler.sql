CREATE TABLE `clinicSettings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`key` varchar(100) NOT NULL,
	`value` text NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `clinicSettings_id` PRIMARY KEY(`id`),
	CONSTRAINT `clinicSettings_key_unique` UNIQUE(`key`)
);

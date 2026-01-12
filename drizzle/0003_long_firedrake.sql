CREATE TABLE `registrationAttempts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`attemptId` varchar(64) NOT NULL,
	`qrCodeId` varchar(64) NOT NULL,
	`facilityId` varchar(64) NOT NULL,
	`customerId` varchar(64),
	`status` enum('initiated','in_progress','completed','abandoned') NOT NULL DEFAULT 'initiated',
	`sessionToken` varchar(256) NOT NULL,
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	`abandonedAt` timestamp,
	`ipAddress` varchar(45),
	`userAgent` varchar(512),
	CONSTRAINT `registrationAttempts_id` PRIMARY KEY(`id`),
	CONSTRAINT `registrationAttempts_attemptId_unique` UNIQUE(`attemptId`)
);
--> statement-breakpoint
CREATE TABLE `registrationQrCodes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`qrCodeId` varchar(64) NOT NULL,
	`facilityId` varchar(64) NOT NULL,
	`facilityName` varchar(100) NOT NULL,
	`qrCodeData` varchar(512) NOT NULL,
	`qrCodeImageUrl` varchar(512),
	`registrationUrl` varchar(512) NOT NULL,
	`isActive` tinyint NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`expiresAt` timestamp,
	CONSTRAINT `registrationQrCodes_id` PRIMARY KEY(`id`),
	CONSTRAINT `registrationQrCodes_qrCodeId_unique` UNIQUE(`qrCodeId`)
);

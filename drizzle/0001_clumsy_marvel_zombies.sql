CREATE TABLE `customerSegments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`segmentId` varchar(64) NOT NULL,
	`segmentName` varchar(100) NOT NULL,
	`description` varchar(500),
	`segmentType` enum('birthday','visit_frequency','points_balance','region','lifetime_value','custom') NOT NULL,
	`criteria` varchar(1000) NOT NULL,
	`isActive` int NOT NULL DEFAULT 1,
	`createdBy` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `customerSegments_id` PRIMARY KEY(`id`),
	CONSTRAINT `customerSegments_segmentId_unique` UNIQUE(`segmentId`)
);
--> statement-breakpoint
CREATE TABLE `messageCampaigns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`campaignId` varchar(64) NOT NULL,
	`campaignName` varchar(100) NOT NULL,
	`description` varchar(500),
	`segmentId` varchar(64) NOT NULL,
	`templateId` varchar(64) NOT NULL,
	`status` enum('draft','scheduled','sent','failed','cancelled') NOT NULL DEFAULT 'draft',
	`scheduledAt` timestamp,
	`sentAt` timestamp,
	`totalRecipients` int DEFAULT 0,
	`sentCount` int DEFAULT 0,
	`failedCount` int DEFAULT 0,
	`createdBy` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `messageCampaigns_id` PRIMARY KEY(`id`),
	CONSTRAINT `messageCampaigns_campaignId_unique` UNIQUE(`campaignId`)
);
--> statement-breakpoint
CREATE TABLE `messageLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`logId` varchar(64) NOT NULL,
	`campaignId` varchar(64) NOT NULL,
	`customerId` varchar(64) NOT NULL,
	`messageType` enum('push','sms','email') NOT NULL,
	`status` enum('sent','failed','bounced','opened','clicked') NOT NULL,
	`content` varchar(2000),
	`errorMessage` varchar(500),
	`sentAt` timestamp NOT NULL DEFAULT (now()),
	`openedAt` timestamp,
	`clickedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `messageLogs_id` PRIMARY KEY(`id`),
	CONSTRAINT `messageLogs_logId_unique` UNIQUE(`logId`)
);
--> statement-breakpoint
CREATE TABLE `messageTemplates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`templateId` varchar(64) NOT NULL,
	`templateName` varchar(100) NOT NULL,
	`description` varchar(500),
	`messageType` enum('push','sms','email') NOT NULL,
	`subject` varchar(200),
	`content` varchar(2000) NOT NULL,
	`variables` varchar(500),
	`isActive` int NOT NULL DEFAULT 1,
	`createdBy` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `messageTemplates_id` PRIMARY KEY(`id`),
	CONSTRAINT `messageTemplates_templateId_unique` UNIQUE(`templateId`)
);

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
CREATE TABLE `familyGroups` (
	`id` int AUTO_INCREMENT NOT NULL,
	`groupId` varchar(64) NOT NULL,
	`groupName` varchar(100) NOT NULL,
	`parentCustomerId` varchar(64) NOT NULL,
	`totalFamilyPoints` int NOT NULL DEFAULT 0,
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `familyGroups_id` PRIMARY KEY(`id`),
	CONSTRAINT `familyGroups_groupId_unique` UNIQUE(`groupId`)
);
--> statement-breakpoint
CREATE TABLE `familyMembers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`memberId` varchar(64) NOT NULL,
	`groupId` varchar(64) NOT NULL,
	`customerId` varchar(64) NOT NULL,
	`relationshipType` enum('parent','child','spouse','other') NOT NULL,
	`isPointShared` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `familyMembers_id` PRIMARY KEY(`id`),
	CONSTRAINT `familyMembers_memberId_unique` UNIQUE(`memberId`)
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

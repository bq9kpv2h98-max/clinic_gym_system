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

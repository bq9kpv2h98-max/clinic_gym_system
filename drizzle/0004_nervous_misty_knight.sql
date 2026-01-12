CREATE TABLE `churnPredictions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`predictionId` varchar(64) NOT NULL,
	`customerId` varchar(64) NOT NULL,
	`facilityId` varchar(64) NOT NULL,
	`churnRiskScore` float NOT NULL,
	`riskLevel` varchar(20) NOT NULL,
	`predictionReason` text NOT NULL,
	`recommendedActions` text NOT NULL,
	`lastVisitDaysAgo` int,
	`visitFrequency` float,
	`pointBalance` int,
	`totalSpent` int,
	`predictedAt` timestamp NOT NULL DEFAULT (now()),
	`expiresAt` timestamp,
	CONSTRAINT `churnPredictions_id` PRIMARY KEY(`id`),
	CONSTRAINT `churnPredictions_predictionId_unique` UNIQUE(`predictionId`)
);

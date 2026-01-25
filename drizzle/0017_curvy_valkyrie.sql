ALTER TABLE `customers` ADD `howDidYouKnow` varchar(100);--> statement-breakpoint
ALTER TABLE `customers` ADD `concerns` text;--> statement-breakpoint
ALTER TABLE `customers` ADD `medicalHistory` text;--> statement-breakpoint
ALTER TABLE `customers` ADD `isPregnant` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `customers` ADD `postpartumPeriod` varchar(50);
ALTER TABLE `monthlyExpenses` ADD `communicationCosts` decimal(12,2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE `monthlyExpenses` ADD `consumablesCosts` decimal(12,2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE `monthlyExpenses` ADD `bankRepayment` decimal(12,2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE `monthlyExpenses` ADD `insuranceCosts` decimal(12,2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE `monthlyExpenses` ADD `leaseCosts` decimal(12,2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE `monthlyExpenses` ADD `repairCosts` decimal(12,2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE `monthlyExpenses` ADD `welfareCosts` decimal(12,2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE `monthlyExpenses` ADD `depreciationCosts` decimal(12,2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE `monthlyExpenses` ADD `accountingCosts` decimal(12,2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE `monthlyExpenses` ADD `miscellaneousCosts` decimal(12,2) DEFAULT '0' NOT NULL;
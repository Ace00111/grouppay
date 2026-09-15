ALTER TABLE `group_transactions` ADD `amountBaseUnits` varchar(78) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE `group_wallets` ADD `balanceBaseUnits` varchar(78) DEFAULT '0' NOT NULL;
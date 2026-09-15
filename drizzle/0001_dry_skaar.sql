ALTER TABLE `group_transactions` ADD `lifecycleStatus` enum('draft','awaiting_signature','submitted','confirmed','failed') DEFAULT 'draft' NOT NULL;--> statement-breakpoint
ALTER TABLE `group_transactions` ADD `txHash` varchar(128);--> statement-breakpoint
ALTER TABLE `group_transactions` ADD `blockNumber` varchar(32);--> statement-breakpoint
ALTER TABLE `group_transactions` ADD `fromAddress` varchar(128);--> statement-breakpoint
ALTER TABLE `group_transactions` ADD `toAddress` varchar(128);--> statement-breakpoint
ALTER TABLE `group_transactions` ADD `tokenAddress` varchar(128);--> statement-breakpoint
ALTER TABLE `group_wallets` ADD `contractGroupId` int;--> statement-breakpoint
ALTER TABLE `group_wallets` ADD `contractAddress` varchar(128);--> statement-breakpoint
ALTER TABLE `group_wallets` ADD `chainId` varchar(32);--> statement-breakpoint
ALTER TABLE `group_wallets` ADD `creatorAddress` varchar(128);
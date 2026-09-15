CREATE TABLE `group_transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL DEFAULT 0,
	`groupId` int,
	`title` varchar(128) NOT NULL,
	`subtitle` varchar(255) NOT NULL,
	`amountCents` int NOT NULL DEFAULT 0,
	`status` enum('Active','Completed','Pending') NOT NULL DEFAULT 'Active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `group_transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `group_wallets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL DEFAULT 0,
	`name` varchar(128) NOT NULL,
	`category` enum('Trip','Friends','Couple','Team','Roommates','Custom') NOT NULL,
	`membersCount` int NOT NULL DEFAULT 1,
	`balanceCents` int NOT NULL DEFAULT 0,
	`totalContributedCents` int NOT NULL DEFAULT 0,
	`totalSpentCents` int NOT NULL DEFAULT 0,
	`status` enum('Active','Settled') NOT NULL DEFAULT 'Active',
	`currency` varchar(12) NOT NULL DEFAULT 'USD',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `group_wallets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
--> statement-breakpoint
CREATE TABLE `wallet_connections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL DEFAULT 0,
	`provider` varchar(32) NOT NULL,
	`address` varchar(128) NOT NULL,
	`chainId` varchar(32),
	`connectedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `wallet_connections_id` PRIMARY KEY(`id`)
);

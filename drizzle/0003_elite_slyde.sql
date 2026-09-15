CREATE TABLE `contract_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventKey` varchar(220) NOT NULL,
	`chainId` varchar(32) NOT NULL,
	`contractAddress` varchar(128) NOT NULL,
	`eventName` varchar(64) NOT NULL,
	`txHash` varchar(128) NOT NULL,
	`blockNumber` varchar(32) NOT NULL,
	`groupId` int,
	`actorAddress` varchar(128),
	`counterpartyAddress` varchar(128),
	`amountBaseUnits` varchar(78),
	`note` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `contract_events_id` PRIMARY KEY(`id`),
	CONSTRAINT `contract_events_eventKey_unique` UNIQUE(`eventKey`)
);

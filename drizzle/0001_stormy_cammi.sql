CREATE TABLE `ai_models` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`provider` varchar(50) NOT NULL,
	`modelId` varchar(200) NOT NULL,
	`apiEndpoint` text,
	`config` json,
	`enabled` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ai_models_id` PRIMARY KEY(`id`),
	CONSTRAINT `ai_models_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `game_actions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`gameId` varchar(64) NOT NULL,
	`roundNumber` int NOT NULL,
	`playerPosition` int NOT NULL,
	`actionType` enum('bid','pass_bid','play','pass_play') NOT NULL,
	`cards` json,
	`cardType` varchar(50),
	`bidAmount` int,
	`thinkingTime` int,
	`aiReasoning` text,
	`gameState` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `game_actions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `games` (
	`id` int AUTO_INCREMENT NOT NULL,
	`gameId` varchar(64) NOT NULL,
	`status` enum('waiting','playing','finished','error') NOT NULL DEFAULT 'waiting',
	`player0ModelId` int NOT NULL,
	`player1ModelId` int NOT NULL,
	`player2ModelId` int NOT NULL,
	`landlordPosition` int,
	`winnerPosition` int,
	`winnerType` enum('landlord','farmer'),
	`totalRounds` int DEFAULT 0,
	`duration` int,
	`initialCards` json,
	`startedAt` timestamp,
	`finishedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `games_id` PRIMARY KEY(`id`),
	CONSTRAINT `games_gameId_unique` UNIQUE(`gameId`)
);
--> statement-breakpoint
CREATE TABLE `model_stats` (
	`id` int AUTO_INCREMENT NOT NULL,
	`modelId` int NOT NULL,
	`totalGames` int NOT NULL DEFAULT 0,
	`winsAsLandlord` int NOT NULL DEFAULT 0,
	`winsAsFarmer` int NOT NULL DEFAULT 0,
	`lossesAsLandlord` int NOT NULL DEFAULT 0,
	`lossesAsFarmer` int NOT NULL DEFAULT 0,
	`totalBids` int NOT NULL DEFAULT 0,
	`successfulBids` int NOT NULL DEFAULT 0,
	`avgThinkingTime` float NOT NULL DEFAULT 0,
	`avgRoundsPerGame` float NOT NULL DEFAULT 0,
	`eloRating` float NOT NULL DEFAULT 1500,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `model_stats_id` PRIMARY KEY(`id`),
	CONSTRAINT `model_stats_modelId_unique` UNIQUE(`modelId`)
);

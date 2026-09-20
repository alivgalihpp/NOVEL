CREATE TABLE `user_ai_settings` (
	`id` char(36) NOT NULL,
	`user_id` char(36) NOT NULL,
	`provider` enum('mock','openai_compatible') NOT NULL DEFAULT 'mock',
	`api_key_encrypted` text,
	`base_url` text,
	`model` varchar(255),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_ai_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_ai_settings_user_id_unique` UNIQUE(`user_id`)
);

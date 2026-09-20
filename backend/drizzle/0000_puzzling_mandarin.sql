CREATE TABLE `ai_generation_logs` (
	`id` char(36) NOT NULL,
	`project_id` char(36) NOT NULL,
	`generation_type` enum('roadmap','chapter','character','place') NOT NULL,
	`reference_id` char(36),
	`tokens_used` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ai_generation_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `chapter_characters` (
	`chapter_id` char(36) NOT NULL,
	`character_id` char(36) NOT NULL,
	CONSTRAINT `chapter_characters_chapter_id_character_id_pk` PRIMARY KEY(`chapter_id`,`character_id`)
);
--> statement-breakpoint
CREATE TABLE `chapter_places` (
	`chapter_id` char(36) NOT NULL,
	`place_id` char(36) NOT NULL,
	CONSTRAINT `chapter_places_chapter_id_place_id_pk` PRIMARY KEY(`chapter_id`,`place_id`)
);
--> statement-breakpoint
CREATE TABLE `chapters` (
	`id` char(36) NOT NULL,
	`project_id` char(36) NOT NULL,
	`chapter_number` int NOT NULL,
	`title` text NOT NULL,
	`outline_summary` text NOT NULL DEFAULT (''),
	`content` text NOT NULL DEFAULT (''),
	`is_plot_twist` boolean NOT NULL DEFAULT false,
	`status` enum('outline','draft','final') NOT NULL DEFAULT 'outline',
	`word_count` int NOT NULL DEFAULT 0,
	`roadmap_pos_x` float,
	`roadmap_pos_y` float,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `chapters_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `character_relationships` (
	`id` char(36) NOT NULL,
	`project_id` char(36) NOT NULL,
	`character_id` char(36) NOT NULL,
	`related_character_id` char(36) NOT NULL,
	`relationship_type` enum('parent','child','sibling','spouse','other') NOT NULL,
	`note` text,
	CONSTRAINT `character_relationships_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `characters` (
	`id` char(36) NOT NULL,
	`project_id` char(36) NOT NULL,
	`name` text NOT NULL,
	`is_placeholder` boolean NOT NULL DEFAULT false,
	`role` enum('protagonist','antagonist','supporting','minor') NOT NULL DEFAULT 'supporting',
	`physical_description` text,
	`personality_traits` text,
	`backstory` text,
	`avatar_url` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `characters_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `places` (
	`id` char(36) NOT NULL,
	`project_id` char(36) NOT NULL,
	`name` text NOT NULL,
	`is_placeholder` boolean NOT NULL DEFAULT false,
	`type` text,
	`description` text,
	`image_url` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `places_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `project_ai_briefs` (
	`id` char(36) NOT NULL,
	`project_id` char(36) NOT NULL,
	`input_synopsis` text NOT NULL,
	`input_main_character` text NOT NULL,
	`input_plot_twist` text,
	`input_goals` text NOT NULL,
	`input_chapter_count` int NOT NULL,
	`ai_raw_response` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `project_ai_briefs_id` PRIMARY KEY(`id`),
	CONSTRAINT `project_ai_briefs_project_id_unique` UNIQUE(`project_id`)
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` char(36) NOT NULL,
	`user_id` char(36) NOT NULL,
	`title` text NOT NULL,
	`genre` text,
	`synopsis` text,
	`creation_mode` enum('manual','ai_assisted') NOT NULL DEFAULT 'manual',
	`status` enum('draft','in_progress','completed') NOT NULL DEFAULT 'draft',
	`target_chapter_count` int,
	`cover_image_url` text,
	`is_private` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `projects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `roadmap_edges` (
	`id` char(36) NOT NULL,
	`project_id` char(36) NOT NULL,
	`source_chapter_id` char(36) NOT NULL,
	`target_chapter_id` char(36) NOT NULL,
	`label` text,
	CONSTRAINT `roadmap_edges_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` char(36) NOT NULL,
	`email` varchar(255) NOT NULL,
	`password_hash` text NOT NULL,
	`display_name` text NOT NULL,
	`avatar_url` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`)
);

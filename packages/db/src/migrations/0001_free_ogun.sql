CREATE TABLE `ingestion_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`source` text NOT NULL,
	`status` text DEFAULT 'queued' NOT NULL,
	`scheduled_at` integer,
	`started_at` integer,
	`finished_at` integer,
	`error` text,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5) * 86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `ingestion_runs_source_created_at_idx` ON `ingestion_runs` (`source`,`created_at`);--> statement-breakpoint
CREATE INDEX `ingestion_runs_status_idx` ON `ingestion_runs` (`status`);--> statement-breakpoint
CREATE TABLE `job_tags` (
	`id` text PRIMARY KEY NOT NULL,
	`job_id` text NOT NULL,
	`value` text NOT NULL,
	`kind` text NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5) * 86400000 as integer)) NOT NULL,
	FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `job_tags_job_value_kind_unique` ON `job_tags` (`job_id`,`value`,`kind`);--> statement-breakpoint
CREATE INDEX `job_tags_job_idx` ON `job_tags` (`job_id`);--> statement-breakpoint
CREATE INDEX `job_tags_value_idx` ON `job_tags` (`value`);--> statement-breakpoint
CREATE TABLE `jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`origin_id` text NOT NULL,
	`origin_url` text NOT NULL,
	`origin_site` text NOT NULL,
	`origin_title` text NOT NULL,
	`origin_content` text,
	`origin_create_at` integer,
	`origin_username` text,
	`origin_user_avatar` text,
	`sync_at` integer DEFAULT (cast((julianday('now') - 2440587.5) * 86400000 as integer)) NOT NULL,
	`invalid` integer DEFAULT false NOT NULL,
	`title` text,
	`generated_content` text,
	`generated_at` integer,
	`show_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5) * 86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5) * 86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `jobs_origin_unique` ON `jobs` (`origin_id`,`origin_site`);--> statement-breakpoint
CREATE INDEX `jobs_origin_create_at_idx` ON `jobs` (`origin_create_at`);--> statement-breakpoint
CREATE INDEX `jobs_sync_at_idx` ON `jobs` (`sync_at`);--> statement-breakpoint
CREATE INDEX `jobs_invalid_idx` ON `jobs` (`invalid`);--> statement-breakpoint
CREATE INDEX `jobs_show_count_idx` ON `jobs` (`show_count`);
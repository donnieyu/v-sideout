CREATE TABLE `auth_members` (
	`id` text PRIMARY KEY NOT NULL,
	`login_id` text NOT NULL,
	`login_key` text NOT NULL,
	`display_name` text NOT NULL,
	`home_club_id` text,
	`kind` text NOT NULL,
	`is_master` integer DEFAULT 0 NOT NULL,
	`home_role` text,
	`grants_json` text DEFAULT '[]' NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`password_hash` text NOT NULL,
	`must_change_password` integer DEFAULT 1 NOT NULL,
	`temporary_expires_at` text,
	`auth_version` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `auth_members_login_key_unique` ON `auth_members` (`login_key`);--> statement-breakpoint
CREATE TABLE `auth_sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`member_id` text NOT NULL,
	`auth_version` integer NOT NULL,
	`restricted` integer DEFAULT 1 NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`member_id`) REFERENCES `auth_members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `join_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`requested_name` text NOT NULL,
	`email` text NOT NULL,
	`requested_club_id` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`approved_member_id` text,
	`created_at` text NOT NULL,
	`decided_at` text,
	FOREIGN KEY (`approved_member_id`) REFERENCES `auth_members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `join_requests_approved_member_unique` ON `join_requests` (`approved_member_id`);

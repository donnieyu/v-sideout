CREATE TABLE `auth_member_audit` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_member_id` text,
	`target_member_id` text NOT NULL,
	`action` text NOT NULL,
	`target_auth_version` integer NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`actor_member_id`) REFERENCES `auth_members`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`target_member_id`) REFERENCES `auth_members`(`id`) ON UPDATE no action ON DELETE no action
);

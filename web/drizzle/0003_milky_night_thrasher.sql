CREATE TABLE `member_position_profiles` (
	`member_id` text PRIMARY KEY NOT NULL,
	`main_position` text NOT NULL,
	`sub_position` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`member_id`) REFERENCES `auth_members`(`id`) ON UPDATE no action ON DELETE no action
);

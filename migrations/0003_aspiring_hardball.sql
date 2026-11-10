CREATE TABLE `vendor_applications` (
	`id` text PRIMARY KEY NOT NULL,
	`campus_id` text NOT NULL,
	`vendor_name` text NOT NULL,
	`shop_type` text NOT NULL,
	`phone` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`campus_id`) REFERENCES `campuses`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_vendor_applications_campus_created` ON `vendor_applications` (`campus_id`,`created_at`);
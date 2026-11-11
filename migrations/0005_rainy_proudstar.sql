CREATE TABLE `funnel_events` (
	`id` text PRIMARY KEY NOT NULL,
	`event_name` text NOT NULL,
	`route` text,
	`gate_id` text,
	`vendor_id` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_funnel_events_name_at` ON `funnel_events` (`event_name`,`created_at`);
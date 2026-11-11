ALTER TABLE `vendors` ADD `tagline` text;--> statement-breakpoint
ALTER TABLE `vendors` ADD `cuisines_json` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `vendors` ADD `badges_json` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `vendors` ADD `cover_image_url` text;--> statement-breakpoint
ALTER TABLE `vendors` ADD `night_safety_notice` text;--> statement-breakpoint
ALTER TABLE `vendors` ADD `dine_in_available` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `vendors` ADD `out_of_stock_count` integer DEFAULT 0 NOT NULL;
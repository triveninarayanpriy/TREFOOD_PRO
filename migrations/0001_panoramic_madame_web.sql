ALTER TABLE `gates` ADD `is_24x7` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `vendors` ADD `night_safe` integer DEFAULT true NOT NULL;
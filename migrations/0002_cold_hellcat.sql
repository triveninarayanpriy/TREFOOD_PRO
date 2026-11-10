CREATE TABLE `coupons` (
	`id` text PRIMARY KEY NOT NULL,
	`campus_id` text NOT NULL,
	`code` text NOT NULL,
	`description` text NOT NULL,
	`discount_type` text NOT NULL,
	`discount_value` integer NOT NULL,
	`min_order_paise` integer DEFAULT 0 NOT NULL,
	`max_discount_paise` integer,
	`new_users_only` integer DEFAULT false NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`expires_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`campus_id`) REFERENCES `campuses`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `coupons_code_unique` ON `coupons` (`code`);--> statement-breakpoint
CREATE INDEX `idx_coupons_campus_active` ON `coupons` (`campus_id`,`active`);--> statement-breakpoint
CREATE TABLE `push_subscriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`endpoint` text NOT NULL,
	`p256dh` text NOT NULL,
	`auth` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `push_subscriptions_endpoint_unique` ON `push_subscriptions` (`endpoint`);--> statement-breakpoint
CREATE INDEX `idx_push_user` ON `push_subscriptions` (`user_id`);--> statement-breakpoint
ALTER TABLE `issues` ADD `resolution_note` text;--> statement-breakpoint
ALTER TABLE `issues` ADD `refund_paise` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `menu_items` ADD `packing_charge_paise` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `menu_items` ADD `image_url` text;--> statement-breakpoint
ALTER TABLE `menu_items` ADD `variants_json` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `menu_items` ADD `addons_json` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `packing_total_paise` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `discount_paise` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `coupon_code` text;--> statement-breakpoint
ALTER TABLE `orders` ADD `payment_status` text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `code_attempts` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `scheduled_for` integer;--> statement-breakpoint
ALTER TABLE `orders` ADD `note` text;--> statement-breakpoint
ALTER TABLE `vendors` ADD `prep_max_minutes` integer DEFAULT 25 NOT NULL;--> statement-breakpoint
ALTER TABLE `vendors` ADD `min_order_paise` integer DEFAULT 0 NOT NULL;
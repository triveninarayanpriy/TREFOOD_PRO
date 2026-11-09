import { sqliteTable, text, integer, real, index, uniqueIndex } from 'drizzle-orm/sqlite-core';

// Campuses table
export const campuses = sqliteTable('campuses', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  createdAt: integer('created_at').notNull(),
});

// Gates table
export const gates = sqliteTable(
  'gates',
  {
    id: text('id').primaryKey(),
    campusId: text('campus_id')
      .notNull()
      .references(() => campuses.id),
    name: text('name').notNull(),
    curfewTime: text('curfew_time').notNull(), // HH:MM in Asia/Kolkata
    bufferMinutes: integer('buffer_minutes').notNull().default(15),
    travelMinutes: integer('travel_minutes').notNull().default(10),
    active: integer('active', { mode: 'boolean' }).notNull().default(true),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [index('idx_gates_campus').on(table.campusId)]
);

// Vendors table
export const vendors = sqliteTable(
  'vendors',
  {
    id: text('id').primaryKey(),
    campusId: text('campus_id')
      .notNull()
      .references(() => campuses.id),
    slug: text('slug').notNull().unique(),
    name: text('name').notNull(),
    nameHi: text('name_hi'),
    category: text('category').notNull(), // meals, snacks, fruits, groceries, vegetables, raw_chicken, late_night, beverages
    description: text('description').notNull(),
    fssaiNo: text('fssai_no').notNull(),
    phone: text('phone').notNull(),
    hoursJson: text('hours_json').notNull(), // JSON e.g. {"open":"09:00","close":"23:00"}
    prepMinutes: integer('prep_minutes').notNull().default(15),
    isOpen: integer('is_open', { mode: 'boolean' }).notNull().default(true),
    busyUntil: integer('busy_until'), // UTC seconds nullable
    status: text('status', { enum: ['pending', 'active', 'suspended'] })
      .notNull()
      .default('active'),
    ratingAvg: real('rating_avg').notNull().default(4.5),
    ratingCount: integer('rating_count').notNull().default(0),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [index('idx_vendors_campus_status').on(table.campusId, table.status)]
);

// Vendor-Gate delivery mapping
export const vendorGates = sqliteTable(
  'vendor_gates',
  {
    id: text('id').primaryKey(),
    vendorId: text('vendor_id')
      .notNull()
      .references(() => vendors.id, { onDelete: 'cascade' }),
    gateId: text('gate_id')
      .notNull()
      .references(() => gates.id, { onDelete: 'cascade' }),
    extraMinutes: integer('extra_minutes').notNull().default(0),
  },
  (table) => [index('idx_vendor_gates_gate').on(table.gateId)]
);

// Menu categories
export const menuCategories = sqliteTable(
  'menu_categories',
  {
    id: text('id').primaryKey(),
    vendorId: text('vendor_id')
      .notNull()
      .references(() => vendors.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    nameHi: text('name_hi'),
    sort: integer('sort').notNull().default(0),
  },
  (table) => [index('idx_menu_categories_vendor').on(table.vendorId)]
);

// Menu items
export const menuItems = sqliteTable(
  'menu_items',
  {
    id: text('id').primaryKey(),
    vendorId: text('vendor_id')
      .notNull()
      .references(() => vendors.id, { onDelete: 'cascade' }),
    categoryId: text('category_id')
      .notNull()
      .references(() => menuCategories.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    nameHi: text('name_hi'),
    description: text('description').notNull().default(''),
    pricePaise: integer('price_paise').notNull(), // Integer paise
    isVeg: integer('is_veg', { mode: 'boolean' }).notNull().default(true),
    tags: text('tags').notNull().default('[]'), // JSON string array
    inStock: integer('in_stock', { mode: 'boolean' }).notNull().default(true),
    sort: integer('sort').notNull().default(0),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [index('idx_menu_items_vendor').on(table.vendorId)]
);

// Users table
export const users = sqliteTable(
  'users',
  {
    id: text('id').primaryKey(),
    email: text('email').notNull().unique(),
    name: text('name').notNull(),
    role: text('role', { enum: ['student', 'vendor', 'admin'] }).notNull().default('student'),
    campusId: text('campus_id')
      .notNull()
      .references(() => campuses.id),
    vendorId: text('vendor_id').references(() => vendors.id),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [index('idx_users_email').on(table.email)]
);

// Sessions table
export const sessions = sqliteTable(
  'sessions',
  {
    id: text('id').primaryKey(),
    tokenHash: text('token_hash').notNull().unique(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expiresAt: integer('expires_at').notNull(),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [index('idx_sessions_token').on(table.tokenHash)]
);

// OTP Codes table
export const otpCodes = sqliteTable(
  'otp_codes',
  {
    id: text('id').primaryKey(),
    email: text('email').notNull(),
    codeHash: text('code_hash').notNull(),
    expiresAt: integer('expires_at').notNull(),
    attempts: integer('attempts').notNull().default(0),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [index('idx_otp_email').on(table.email)]
);

// Orders table
export const orders = sqliteTable(
  'orders',
  {
    id: text('id').primaryKey(),
    publicNo: text('public_no').notNull().unique(),
    campusId: text('campus_id')
      .notNull()
      .references(() => campuses.id),
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    vendorId: text('vendor_id')
      .notNull()
      .references(() => vendors.id),
    gateId: text('gate_id')
      .notNull()
      .references(() => gates.id),
    status: text('status', {
      enum: ['placed', 'accepted', 'out_for_delivery', 'at_gate', 'delivered', 'cancelled', 'expired'],
    })
      .notNull()
      .default('placed'),
    subtotalPaise: integer('subtotal_paise').notNull(),
    totalPaise: integer('total_paise').notNull(),
    paymentMethod: text('payment_method').notNull().default('pay_at_gate'),
    handoverCode: text('handover_code').notNull(), // 4 digits
    idempotencyKey: text('idempotency_key').notNull().unique(),
    etaAt: integer('eta_at'),
    placedAt: integer('placed_at').notNull(),
    acceptedAt: integer('accepted_at'),
    outForDeliveryAt: integer('out_for_delivery_at'),
    atGateAt: integer('at_gate_at'),
    deliveredAt: integer('delivered_at'),
    cancelledAt: integer('cancelled_at'),
    expiredAt: integer('expired_at'),
    cancelReason: text('cancel_reason'),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [
    index('idx_orders_user_created').on(table.userId, table.createdAt),
    index('idx_orders_vendor_status').on(table.vendorId, table.status),
    index('idx_orders_gate_status').on(table.gateId, table.status),
    uniqueIndex('idx_orders_idempotency').on(table.idempotencyKey),
  ]
);

// Order items snapshot
export const orderItems = sqliteTable(
  'order_items',
  {
    id: text('id').primaryKey(),
    orderId: text('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    itemId: text('item_id').notNull(),
    name: text('name').notNull(),
    pricePaise: integer('price_paise').notNull(),
    quantity: integer('quantity').notNull(),
    notes: text('notes'),
  },
  (table) => [index('idx_order_items_order').on(table.orderId)]
);

// Order status change events
export const orderEvents = sqliteTable(
  'order_events',
  {
    id: text('id').primaryKey(),
    orderId: text('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    status: text('status').notNull(),
    actorId: text('actor_id'),
    at: integer('at').notNull(),
    note: text('note'),
  },
  (table) => [index('idx_order_events_order').on(table.orderId)]
);

// Reviews table
export const reviews = sqliteTable(
  'reviews',
  {
    id: text('id').primaryKey(),
    orderId: text('order_id')
      .notNull()
      .unique()
      .references(() => orders.id, { onDelete: 'cascade' }),
    vendorId: text('vendor_id')
      .notNull()
      .references(() => vendors.id),
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    rating: integer('rating').notNull(), // 1 to 5
    comment: text('comment'),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [index('idx_reviews_vendor').on(table.vendorId)]
);

// Issues table
export const issues = sqliteTable(
  'issues',
  {
    id: text('id').primaryKey(),
    orderId: text('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    vendorId: text('vendor_id')
      .notNull()
      .references(() => vendors.id),
    reason: text('reason', {
      enum: ['wrong_item', 'missing_item', 'quality', 'late', 'other'],
    }).notNull(),
    description: text('description').notNull(),
    status: text('status', { enum: ['open', 'resolved', 'rejected'] })
      .notNull()
      .default('open'),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [index('idx_issues_order').on(table.orderId)]
);

// Announcements table
export const announcements = sqliteTable(
  'announcements',
  {
    id: text('id').primaryKey(),
    campusId: text('campus_id')
      .notNull()
      .references(() => campuses.id),
    message: text('message').notNull(),
    active: integer('active', { mode: 'boolean' }).notNull().default(true),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [index('idx_announcements_campus').on(table.campusId)]
);

// Favorites table
export const favorites = sqliteTable(
  'favorites',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    vendorId: text('vendor_id')
      .notNull()
      .references(() => vendors.id, { onDelete: 'cascade' }),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [index('idx_favorites_user').on(table.userId)]
);

// Rate limits table (for D1-based rate limiting)
export const rateLimits = sqliteTable(
  'rate_limits',
  {
    id: text('id').primaryKey(),
    key: text('key').notNull().unique(),
    count: integer('count').notNull().default(1),
    resetAt: integer('reset_at').notNull(),
  },
  (table) => [index('idx_rate_limits_key').on(table.key)]
);

// Audit log table
export const auditLog = sqliteTable(
  'audit_log',
  {
    id: text('id').primaryKey(),
    actorId: text('actor_id'),
    action: text('action').notNull(),
    targetType: text('target_type').notNull(),
    targetId: text('target_id').notNull(),
    detailsJson: text('details_json').notNull().default('{}'),
    at: integer('at').notNull(),
  },
  (table) => [index('idx_audit_log_at').on(table.at)]
);

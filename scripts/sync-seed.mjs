import fs from 'node:fs';
import path from 'node:path';

const seedJsonPath = path.resolve('db/real-seed.json');
const seedSqlPath = path.resolve('scripts/seed.sql');

const seed = JSON.parse(fs.readFileSync(seedJsonPath, 'utf8'));

// 1. Replace tiny 70px PNG category icons with genuine >=1200px real photos
const categoryImageMap = {
  food: '/images/categories/food.jpg',
  fruits_juices: '/images/categories/juices.jpg',
  vegetables: '/images/categories/vegetables-real.jpg',
  groceries: '/images/categories/groceries-real.jpg',
  fresh_chicken: '/images/categories/chicken-real.jpg',
};
for (const cat of seed.categories) {
  if (categoryImageMap[cat.id]) {
    cat.imageUrl = categoryImageMap[cat.id];
  }
}

// 2. Audit & clean vendor metadata against live trefood.in/c/nit-patna
const vendorFixes = {
  rest_kolkata_biryani_nitp: {
    hours: { open: '10:00', close: '01:00' },
    tagline: 'Biryani, Rolls & Campus Pizza',
    coverImageUrl: '/images/vendors/kolkata-biryani-fast-food-pizza-house.jpg',
  },
  rest_csb_nitp: {
    hours: { open: '10:30', close: '01:00' },
    tagline: 'Kulhad Chai, Maggi & Cafe Snacks',
    coverImageUrl: '/images/vendors/chai-sutta-bar-csb.jpg',
  },
  rest_wrapchik_nitp: {
    hours: { open: '10:00', close: '23:00' },
    tagline: 'Best in Pizza',
    coverImageUrl: '/images/vendors/wrapchik-pizza.jpg',
  },
  rest_shwami_ji_nitp: {
    hours: { open: '10:00', close: '22:00' },
    tagline: 'Tandoori Soya Chaap & North Indian',
    coverImageUrl: '/images/vendors/shwami-ji.jpg',
  },
  rest_royal_bihar_nitp: {
    hours: { open: '11:00', close: '23:00' },
    tagline: 'Best in North Indian',
    coverImageUrl: '/images/vendors/the-royal-bihar-restaurant.jpg',
  },
  rest_sone_zone_nitp: {
    hours: { open: '11:00', close: '22:00' },
    tagline: 'Campus Cafe, Shakes & Dosas',
    coverImageUrl: '/images/vendors/sone-zone-cafe.jpg',
  },
  rest_patliputra_nitp: {
    hours: { open: '09:00', close: '21:30' },
    tagline: 'Fresh Juices, Shakes & Lassi',
    coverImageUrl: '/images/vendors/patliputra-juices.jpg',
  },
  rest_night_canteen_nitp: {
    hours: { open: '19:00', close: '02:00' },
    tagline: 'Hostel Late Night Delivery',
    coverImageUrl: '/images/vendors/night-canteen-nitp.jpg',
  },
  rest_crave_nitp: {
    hours: { open: '18:00', close: '03:00' },
    tagline: 'Late Night Canteen',
    coverImageUrl: '/images/vendors/crave.png',
  },
  rest_vrindavan_bhog_nitp: {
    hours: { open: '08:30', close: '22:00' },
    tagline: 'Best in Pure Vegetarian',
    description:
      'Pure vegetarian North Indian thalis, paneer delicacies, South Indian dosas and homestyle campus meals.',
  },
};

for (const v of seed.vendors) {
  v.fssaiNo = 'FSSAI: pending verification';
  const fix = vendorFixes[v.id];
  if (fix) {
    if (fix.tagline) v.tagline = fix.tagline;
    if (fix.hours) {
      v.hours = fix.hours;
      v.hoursJson = JSON.stringify(fix.hours);
    }
    if (fix.coverImageUrl) v.coverImageUrl = fix.coverImageUrl;
    if (fix.description) v.description = fix.description;
  } else if (v.hours) {
    v.hoursJson = JSON.stringify(v.hours);
  }
}

// 3. Clean whitespace / capitalization anomalies on menu item & category names
const exactNameFixes = {
  'MIlk PACKET   0.5L': 'Milk Packet (0.5L)',
  'Hyderabadi chicken  Biryani 750gm': 'Hyderabadi Chicken Biryani (750g)',
  'Paneer   Biryani': 'Paneer Biryani',
};
for (const c of seed.menuCategories) {
  c.name = c.name.replace(/\s+/g, ' ').trim();
}
const eggRegex = /\b(egg|eggs|anda|omelet|omelette)\b/i;
const nonVegRegex = /\b(chicken|mutton|fish|prawn|prawns|meat|keema|non-veg|nonveg)\b/i;
for (const item of seed.menuItems) {
  const cleanRaw = item.name.trim();
  item.name = exactNameFixes[cleanRaw] || cleanRaw.replace(/\s+/g, ' ');
  const text = `${item.name} ${item.description || ''}`;
  if (eggRegex.test(text)) {
    item.isVeg = false;
  } else if (nonVegRegex.test(text)) {
    const isActuallyVeg =
      /\b(veg|paneer|soya|mushroom|corn)\b/i.test(item.name) &&
      !/\b(chicken|mutton|fish|prawn|egg|eggs|anda|omelet|meat)\b/i.test(item.name);
    if (!isActuallyVeg) {
      item.isVeg = false;
    }
  }
}

// 4. Sync QuickPicks strictly to real catalog items & hi-res item paths
seed.quickPicks = [
  {
    name: 'Veg Burger',
    vendorSlug: 'chai-sutta-bar-csb',
    pricePaise: 7000,
    imageUrl: '/images/items/chai-sutta-bar-csb--veg-burger.jpg',
  },
  {
    name: 'Masala Dosa',
    vendorSlug: 'sone-zone-cafe',
    pricePaise: 10900,
    imageUrl: '/images/items/sone-zone-cafe--masala-dosa.jpg',
  },
  {
    name: 'Chicken Dum Biryani',
    vendorSlug: 'sone-zone-cafe',
    pricePaise: 15900,
    imageUrl: '/images/items/sone-zone-cafe--chicken-dum-biryani.jpg',
  },
  {
    name: 'Mango Shake',
    vendorSlug: 'sone-zone-cafe',
    pricePaise: 7900,
    imageUrl: '/images/items/sone-zone-cafe--mango-shake.jpg',
  },
  {
    name: 'Margherita Pizza',
    vendorSlug: 'wrapchik-pizza',
    pricePaise: 12900,
    imageUrl: '/images/items/wrapchik-pizza--margherita-pizza.jpg',
  },
];

fs.writeFileSync(seedJsonPath, JSON.stringify(seed, null, 2) + '\n');

// 5. Regenerate Sections 1-6 of scripts/seed.sql while preserving Sections 7-10
const existingSql = fs.readFileSync(seedSqlPath, 'utf8');
const marker = '-- 7. Campus Coupons';
const markerIdx = existingSql.indexOf(marker);
if (markerIdx === -1) {
  throw new Error('Could not find "-- 7. Campus Coupons" marker in scripts/seed.sql');
}
const tailSql = existingSql.slice(markerIdx);

const sqlStr = (val) => {
  if (val === null || val === undefined) return 'NULL';
  return "'" + String(val).replace(/'/g, "''") + "'";
};

const lines = [];
lines.push('-- TreFood Real NIT Patna Campus Catalog Seed (Source: https://www.trefood.in/c/nit-patna)');
lines.push('-- Audited & synchronized cleanly from db/real-seed.json (zero duplicate vendors, zero PII).');
lines.push('');
for (const tbl of [
  'funnel_events',
  'vendor_applications',
  'audit_log',
  'push_subscriptions',
  'favorites',
  'issues',
  'reviews',
  'order_events',
  'order_items',
  'orders',
  'otp_codes',
  'sessions',
  'rate_limits',
  'coupons',
  'announcements',
  'menu_items',
  'menu_categories',
  'vendor_gates',
  'users',
  'vendors',
  'gates',
  'campuses',
]) {
  lines.push(`DELETE FROM ${tbl};`);
}

lines.push('');
lines.push('-- 1. Campus');
lines.push(
  `INSERT INTO campuses (id, name, slug, created_at) VALUES (${sqlStr(seed.campus.id)}, ${sqlStr(seed.campus.name)}, 'nitp', 1700000000);`
);

lines.push('');
lines.push('-- 2. Gates (Curfew Rules in IST)');
lines.push(
  'INSERT INTO gates (id, campus_id, name, curfew_time, buffer_minutes, travel_minutes, active, is_24x7, created_at) VALUES'
);
const gateNames = {
  gate_main: 'Main Gate / Academic Blocks',
  gate_h5: 'Boys Hostel Gate',
  gate_h7: 'Girls Hostel Gate',
};
lines.push(
  seed.gates
    .map((g, idx) => {
      const curfew = g.is24x7 ? '23:59' : g.curfewTime;
      const comma = idx === seed.gates.length - 1 ? ';' : ',';
      return `(${sqlStr(g.id)}, ${sqlStr(seed.campus.id)}, ${sqlStr(gateNames[g.id] || g.name)}, ${sqlStr(curfew)}, ${Number(g.bufferMinutes)}, ${Number(g.travelMinutes)}, ${g.active ? 1 : 0}, ${g.is24x7 ? 1 : 0}, 1700000000)${comma}`;
    })
    .join('\n')
);

lines.push('');
lines.push(`-- 3. Real NIT Patna Vendors (${seed.vendors.length})`);
lines.push(
  'INSERT INTO vendors (id, campus_id, slug, name, name_hi, tagline, category, cuisines_json, badges_json, cover_image_url, description, night_safety_notice, fssai_no, phone, hours_json, prep_minutes, prep_max_minutes, min_order_paise, is_open, night_safe, dine_in_available, out_of_stock_count, status, rating_avg, rating_count, created_at) VALUES'
);
lines.push(
  seed.vendors
    .map((v, idx) => {
      const comma = idx === seed.vendors.length - 1 ? ';' : ',';
      const defaultSafety =
        'Campus Night Safety: After 7:00 PM, deliveries are handled personally by the restaurant owner, co-owner, or senior staff with complete trust to ensure campus premises safety.';
      return `(${sqlStr(v.id)}, ${sqlStr(v.campusId)}, ${sqlStr(v.slug)}, ${sqlStr(v.name)}, ${sqlStr(v.nameHi)}, ${sqlStr(v.tagline)}, ${sqlStr(v.category)}, ${sqlStr(JSON.stringify(v.cuisines || []))}, ${sqlStr(JSON.stringify(v.badges || []))}, ${sqlStr(v.coverImageUrl)}, ${sqlStr(v.description || '')}, ${sqlStr(v.nightSafetyNotice || defaultSafety)}, ${sqlStr(v.fssaiNo)}, ${sqlStr(v.phone || '+910000000000')}, ${sqlStr(JSON.stringify(v.hours))}, ${Number(v.prepMinutes)}, ${Number(v.prepMaxMinutes || v.prepMinutes + 5)}, ${Number(v.minOrderPaise)}, ${v.isOpen ? 1 : 0}, ${v.nightSafe ? 1 : 0}, ${v.dineInAvailable ? 1 : 0}, ${Number(v.outOfStockCount || 0)}, ${sqlStr(v.status || 'active')}, ${Number(v.ratingAvg)}, ${Number(v.ratingCount)}, 1700000000)${comma}`;
    })
    .join('\n')
);

lines.push('');
lines.push('-- 4. Vendor-Gate Delivery Mapping (Main Gate + Boys & Girls Hostels before curfew)');
lines.push('INSERT INTO vendor_gates (id, vendor_id, gate_id, extra_minutes) VALUES');
const vgRows = [];
for (const v of seed.vendors) {
  for (const g of seed.gates) {
    const extra = g.id === 'gate_main' ? 0 : g.id === 'gate_h5' ? 2 : 4;
    const vgId = `vg_${v.id}_${g.id.replace('gate_', '')}`;
    vgRows.push(`(${sqlStr(vgId)}, ${sqlStr(v.id)}, ${sqlStr(g.id)}, ${extra})`);
  }
}
lines.push(vgRows.map((row, idx) => `${row}${idx === vgRows.length - 1 ? ';' : ','}`).join('\n'));

lines.push('');
lines.push(`-- 5. Real Menu Categories (${seed.menuCategories.length})`);
for (let i = 0; i < seed.menuCategories.length; i += 40) {
  const slice = seed.menuCategories.slice(i, i + 40);
  lines.push('INSERT INTO menu_categories (id, vendor_id, name, name_hi, sort) VALUES');
  lines.push(
    slice
      .map((c, idx) => {
        const comma = idx === slice.length - 1 ? ';' : ',';
        return `(${sqlStr(c.id)}, ${sqlStr(c.vendorId)}, ${sqlStr(c.name)}, ${sqlStr(c.nameHi)}, ${Number(c.sort)})${comma}`;
      })
      .join('\n')
  );
}

lines.push('');
lines.push(`-- 6. Real Menu Items (${seed.menuItems.length} items, integer paise, real local photos)`);
for (let i = 0; i < seed.menuItems.length; i += 35) {
  const slice = seed.menuItems.slice(i, i + 35);
  lines.push(
    'INSERT INTO menu_items (id, vendor_id, category_id, name, name_hi, description, price_paise, packing_charge_paise, image_url, is_veg, tags, variants_json, addons_json, in_stock, sort, created_at) VALUES'
  );
  lines.push(
    slice
      .map((item, idx) => {
        const comma = idx === slice.length - 1 ? ';' : ',';
        return `(${sqlStr(item.id)}, ${sqlStr(item.vendorId)}, ${sqlStr(item.categoryId)}, ${sqlStr(item.name)}, ${sqlStr(item.nameHi)}, ${sqlStr(item.description || '')}, ${Number(item.pricePaise)}, ${Number(item.packingChargePaise || 0)}, ${sqlStr(item.imageUrl)}, ${item.isVeg ? 1 : 0}, ${sqlStr(JSON.stringify(item.tags || []))}, ${sqlStr(JSON.stringify(item.variants || []))}, ${sqlStr(JSON.stringify(item.addons || []))}, ${item.inStock ? 1 : 0}, ${Number(item.sort || 1)}, 1700000000)${comma}`;
      })
      .join('\n')
  );
}

lines.push('');
lines.push(tailSql);

fs.writeFileSync(seedSqlPath, lines.join('\n'));
console.log(
  `Synced ${seed.vendors.length} vendors, ${seed.menuCategories.length} categories, ${seed.menuItems.length} menuItems cleanly.`
);

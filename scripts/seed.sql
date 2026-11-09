-- TreFood Seed Script for NIT Patna Campus
-- All data contained in this script is SAMPLE DATA strictly for prototype, demonstration, and automated testing purposes.

-- Clean existing data
DELETE FROM audit_log;
DELETE FROM favorites;
DELETE FROM issues;
DELETE FROM reviews;
DELETE FROM order_events;
DELETE FROM order_items;
DELETE FROM orders;
DELETE FROM otp_codes;
DELETE FROM sessions;
DELETE FROM rate_limits;
DELETE FROM announcements;
DELETE FROM menu_items;
DELETE FROM menu_categories;
DELETE FROM vendor_gates;
DELETE FROM vendors;
DELETE FROM gates;
DELETE FROM users;
DELETE FROM campuses;

-- 1. Campuses
INSERT INTO campuses (id, name, slug, created_at) VALUES 
('campus_nitp', 'National Institute of Technology Patna', 'nitp', 1700000000);

-- 2. Gates with Curfew times (Asia/Kolkata)
INSERT INTO gates (id, campus_id, name, curfew_time, buffer_minutes, travel_minutes, active, created_at) VALUES
('gate_main', 'campus_nitp', 'Main Gate (Ashok Rajpath)', '23:30', 15, 10, 1, 1700000000),
('gate_h5', 'campus_nitp', 'Hostel 5 Gate', '22:30', 15, 12, 1, 1700000000),
('gate_h7', 'campus_nitp', 'Hostel 7 Gate (Ganga View)', '23:00', 15, 14, 1, 1700000000);

-- 3. Vendors across 8 campus categories
INSERT INTO vendors (id, campus_id, slug, name, name_hi, category, description, fssai_no, phone, hours_json, prep_minutes, is_open, status, rating_avg, rating_count, created_at) VALUES
('v_ganga', 'campus_nitp', 'ganga-dhaba', 'Ganga Dhaba & Kitchen', 'गंगा ढाबा', 'meals', 'North Indian thalis, fresh rotis, paneer curries and aromatic biryani.', '10421000001234', '+919876543210', '{"open":"10:00","close":"23:00"}', 20, 1, 'active', 4.6, 184, 1700000000),
('v_chai', 'campus_nitp', 'campus-chai-point', 'Campus Chai & Maggi Point', 'कैंपस चाय पॉइंट', 'snacks', 'Hot adrak chai, bun maska, cheesy Maggi, and crispy evening snacks.', '10421000001235', '+919876543211', '{"open":"08:00","close":"23:30"}', 12, 1, 'active', 4.8, 320, 1700000000),
('v_fruits', 'campus_nitp', 'kisan-fresh-fruits', 'Kisan Fresh Fruit Stall', 'किसान फ्रेश फ्रूट्स', 'fruits', 'Seasonal whole fresh fruits, daily fruit bowls, apples, and bananas.', '10421000001236', '+919876543212', '{"open":"09:00","close":"21:30"}', 10, 1, 'active', 4.5, 95, 1700000000),
('v_mart', 'campus_nitp', 'hostel-essentials-mart', 'Hostel Essentials Mart', 'हॉस्टल एसेंशियल मार्ट', 'groceries', 'Biscuits, chips, toiletries, milk, noodles and daily student groceries.', '10421000001237', '+919876543213', '{"open":"08:00","close":"22:30"}', 10, 1, 'active', 4.7, 210, 1700000000),
('v_veggies', 'campus_nitp', 'green-valley-veggies', 'Green Valley Fresh Veggies', 'ग्रीन वैली सब्जियां', 'vegetables', 'Cleaned seasonal vegetables, potatoes, onions, tomatoes and greens.', '10421000001238', '+919876543214', '{"open":"07:30","close":"20:30"}', 10, 1, 'active', 4.4, 68, 1700000000),
('v_meat', 'campus_nitp', 'patna-fresh-meat', 'Patna Fresh Poultry & Raw Meat', 'पटना फ्रेश पोल्ट्री', 'raw_chicken', 'Hygienic curry cut chicken, boneless breast, and fresh farm eggs.', '10421000001239', '+919876543215', '{"open":"08:00","close":"20:00"}', 15, 1, 'active', 4.3, 82, 1700000000),
('v_late', 'campus_nitp', 'midnight-bites', 'Midnight Bites NITP', 'मिडनाइट बाइट्स', 'late_night', 'Late night rolls, burgers, fried rice, and loaded peri-peri fries.', '10421000001240', '+919876543216', '{"open":"21:00","close":"03:00"}', 20, 1, 'active', 4.7, 412, 1700000000),
('v_juice', 'campus_nitp', 'royal-juice-corner', 'Royal Juice & Shake Corner', 'रॉयल जूस कॉर्नर', 'beverages', 'Freshly squeezed juices, thick fruit shakes, chilled badam milk and lassi.', '10421000001241', '+919876543217', '{"open":"10:00","close":"22:30"}', 10, 1, 'active', 4.6, 140, 1700000000);

-- 4. Vendor Gates (Reachability & extra travel time)
INSERT INTO vendor_gates (id, vendor_id, gate_id, extra_minutes) VALUES
('vg_ganga_main', 'v_ganga', 'gate_main', 0),
('vg_ganga_h5', 'v_ganga', 'gate_h5', 3),
('vg_ganga_h7', 'v_ganga', 'gate_h7', 5),

('vg_chai_main', 'v_chai', 'gate_main', 0),
('vg_chai_h5', 'v_chai', 'gate_h5', 2),
('vg_chai_h7', 'v_chai', 'gate_h7', 4),

('vg_fruits_main', 'v_fruits', 'gate_main', 0),
('vg_fruits_h5', 'v_fruits', 'gate_h5', 3),
('vg_fruits_h7', 'v_fruits', 'gate_h7', 5),

('vg_mart_main', 'v_mart', 'gate_main', 0),
('vg_mart_h5', 'v_mart', 'gate_h5', 2),
('vg_mart_h7', 'v_mart', 'gate_h7', 3),

('vg_veggies_main', 'v_veggies', 'gate_main', 0),
('vg_veggies_h5', 'v_veggies', 'gate_h5', 3),

('vg_meat_main', 'v_meat', 'gate_main', 0),
('vg_meat_h5', 'v_meat', 'gate_h5', 4),
('vg_meat_h7', 'v_meat', 'gate_h7', 5),

('vg_late_main', 'v_late', 'gate_main', 0),
('vg_late_h5', 'v_late', 'gate_h5', 3),
('vg_late_h7', 'v_late', 'gate_h7', 4),

('vg_juice_main', 'v_juice', 'gate_main', 0),
('vg_juice_h5', 'v_juice', 'gate_h5', 2),
('vg_juice_h7', 'v_juice', 'gate_h7', 4);

-- 5. Menu Categories
INSERT INTO menu_categories (id, vendor_id, name, name_hi, sort) VALUES
('cat_g_curries', 'v_ganga', 'Curries & Dal', 'सब्जी और दाल', 1),
('cat_g_breads', 'v_ganga', 'Breads & Rice', 'रोटी और चावल', 2),
('cat_c_tea', 'v_chai', 'Chai & Hot Drinks', 'चाय और गर्म पेय', 1),
('cat_c_maggi', 'v_chai', 'Maggi & Quick Bites', 'मैगी और नाश्ता', 2),
('cat_f_whole', 'v_fruits', 'Fresh Whole Fruits', 'ताजे फल', 1),
('cat_f_bowls', 'v_fruits', 'Fruit Bowls & Cuts', 'कटे हुए फल', 2),
('cat_m_snacks', 'v_mart', 'Biscuits & Munchies', 'बिस्कुट और चिप्स', 1),
('cat_m_daily', 'v_mart', 'Daily Dairy & Staples', 'दूध और रोजमर्रा', 2),
('cat_v_daily', 'v_veggies', 'Daily Veggies', 'रोज की सब्जियां', 1),
('cat_p_chicken', 'v_meat', 'Raw Chicken Cuts', 'कच्चा चिकन', 1),
('cat_p_eggs', 'v_meat', 'Farm Eggs', 'अंडे', 2),
('cat_l_rolls', 'v_late', 'Rolls & Wraps', 'रोल और रैप', 1),
('cat_l_burgers', 'v_late', 'Burgers & Fries', 'बर्गर और फ्राइज', 2),
('cat_j_shakes', 'v_juice', 'Fresh Shakes', 'फ्रूट शेक', 1),
('cat_j_juices', 'v_juice', 'Fresh Juices', 'ताजा जूस', 2);

-- 6. Menu Items (All prices in Integer Paise)
INSERT INTO menu_items (id, vendor_id, category_id, name, name_hi, description, price_paise, is_veg, tags, in_stock, sort, created_at) VALUES
-- Ganga Dhaba (Meals)
('it_g1', 'v_ganga', 'cat_g_curries', 'Paneer Butter Masala', 'पनीर बटर मसाला', 'Cottage cheese cubes simmered in rich creamy tomato gravy.', 16000, 1, '["bestseller"]', 1, 1, 1700000000),
('it_g2', 'v_ganga', 'cat_g_curries', 'Dal Makhani', 'दाल मखनी', 'Slow-cooked black lentils with cream and desi makhan.', 13000, 1, '["popular"]', 1, 2, 1700000000),
('it_g3', 'v_ganga', 'cat_g_curries', 'Kadai Chicken', 'कड़ाही चिकन', 'Tender chicken braised with capsicum, onions, and crushed kadai spices.', 20000, 0, '["nonveg"]', 1, 3, 1700000000),
('it_g4', 'v_ganga', 'cat_g_curries', 'Egg Curry (2 Eggs)', 'अंडा करी', 'Two farm eggs simmered in spiced onion-tomato gravy.', 11000, 0, '["nonveg"]', 1, 4, 1700000000),
('it_g5', 'v_ganga', 'cat_g_breads', 'Butter Naan', 'बटर नान', 'Tandoor baked refined flour flatbread brushed with butter.', 3500, 1, '[]', 1, 5, 1700000000),
('it_g6', 'v_ganga', 'cat_g_breads', 'Tandoori Roti', 'तंदूरी रोटी', 'Whole wheat tandoori roti with light butter.', 1200, 1, '[]', 1, 6, 1700000000),
('it_g7', 'v_ganga', 'cat_g_breads', 'Jeera Rice', 'जीरा राइस', 'Basmati rice tempered with roasted cumin seeds.', 8000, 1, '[]', 1, 7, 1700000000),
('it_g8', 'v_ganga', 'cat_g_breads', 'Chicken Biryani Bowl', 'चिकन बिरयानी', 'Dum cooked aromatic rice with spiced chicken and raita.', 18000, 0, '["bestseller"]', 1, 8, 1700000000),
('it_g9', 'v_ganga', 'cat_g_curries', 'Gulab Jamun (2 Pcs)', 'गुलाब जामुन', 'Soft khoya dumplings in cardamom rose sugar syrup.', 4000, 1, '["dessert"]', 1, 9, 1700000000),

-- Campus Chai Point (Snacks)
('it_c1', 'v_chai', 'cat_c_tea', 'Masala Kadak Chai', 'मसाला कड़क चाय', 'Strong Assam tea brewed with crushed ginger, cardamom, and clove.', 1500, 1, '["bestseller"]', 1, 1, 1700000000),
('it_c2', 'v_chai', 'cat_c_tea', 'Ginger Elaichi Chai (Kulhad)', 'अदरक इलायची कुल्हड़ चाय', 'Clay kulhad tea infused with fresh ginger and green cardamom.', 2000, 1, '["popular"]', 1, 2, 1700000000),
('it_c3', 'v_chai', 'cat_c_maggi', 'Classic Butter Maggi', 'क्लासिक बटर मैगी', 'Original Maggi noodles cooked with Amul butter and secret tastemaker.', 4000, 1, '["classic"]', 1, 3, 1700000000),
('it_c4', 'v_chai', 'cat_c_maggi', 'Cheese Vegetable Maggi', 'चीज वेज मैगी', 'Maggi loaded with peas, carrots, onions, and melted cheese.', 6500, 1, '["bestseller"]', 1, 4, 1700000000),
('it_c5', 'v_chai', 'cat_c_maggi', 'Egg Bhurji Maggi', 'अंडा भुर्जी मैगी', 'Maggi tossed with spicy double egg scramble.', 7000, 0, '["nonveg"]', 1, 5, 1700000000),
('it_c6', 'v_chai', 'cat_c_maggi', 'Bun Maska', 'बन मस्का', 'Soft bakery bun generously spread with sweet-salty butter.', 3000, 1, '[]', 1, 6, 1700000000),
('it_c7', 'v_chai', 'cat_c_maggi', 'Crispy Samosa (2 Pcs)', 'समोसा (2 पीस)', 'Golden fried pastry stuffed with spiced potato and green peas.', 2000, 1, '[]', 1, 7, 1700000000),
('it_c8', 'v_chai', 'cat_c_maggi', 'Paneer Bread Pakoda', 'पनीर ब्रेड पकोड़ा', 'Spiced potato and paneer stuffed bread fritters.', 2500, 1, '[]', 1, 8, 1700000000),
('it_c9', 'v_chai', 'cat_c_tea', 'Chilled Cold Coffee', 'कोल्ड कॉफी', 'Creamy blended iced coffee with chocolate drizzle.', 5000, 1, '["popular"]', 1, 9, 1700000000),

-- Kisan Fruits
('it_f1', 'v_fruits', 'cat_f_whole', 'Himachal Royal Delicious Apples (1 kg)', 'हिमाचल सेब (1 किलो)', 'Crisp, sweet, handpicked red apples.', 14000, 1, '[]', 1, 1, 1700000000),
('it_f2', 'v_fruits', 'cat_f_whole', 'Robusta Bananas (1 Dozen)', 'केला (1 दर्जन)', 'Fresh ripe yellow bananas packed with energy.', 6000, 1, '["bestseller"]', 1, 2, 1700000000),
('it_f3', 'v_fruits', 'cat_f_whole', 'Nagpur Sweet Oranges (1 kg)', 'संतरा (1 किलो)', 'Juicy sweet and tangy Nagpur oranges.', 8000, 1, '[]', 1, 3, 1700000000),
('it_f4', 'v_fruits', 'cat_f_whole', 'Fresh Pomegranate (Anar) (1 kg)', 'अनार (1 किलो)', 'Ruby red sweet pomegranate with thin peel.', 16000, 1, '[]', 1, 4, 1700000000),
('it_f5', 'v_fruits', 'cat_f_bowls', 'Fresh Mixed Fruit Bowl', 'मिक्स फ्रूट बाउल', 'Hygienically diced apple, banana, papaya, and pomegranate with chaat masala.', 6000, 1, '["healthy"]', 1, 5, 1700000000),
('it_f6', 'v_fruits', 'cat_f_bowls', 'Sweet Papaya Cut Bowl', 'पपीता बाउल', 'Chilled diced sweet ripe papaya bowl.', 4500, 1, '["healthy"]', 1, 6, 1700000000),
('it_f7', 'v_fruits', 'cat_f_whole', 'Green Seedless Grapes (500g)', 'हरे अंगूर (500 ग्राम)', 'Sweet and crisp seedless table grapes.', 7000, 1, '[]', 1, 7, 1700000000),
('it_f8', 'v_fruits', 'cat_f_whole', 'Seasonal Sweet Guava (1 kg)', 'अमरूद (1 किलो)', 'Fresh pink and white guavas from local orchards.', 5000, 1, '[]', 1, 8, 1700000000),

-- Hostel Mart (Groceries)
('it_m1', 'v_mart', 'cat_m_daily', 'Amul Taaza Homogenised Milk (500ml)', 'अमूल ताजा दूध', 'Fresh toned pasteurized milk pouch.', 2800, 1, '["essential"]', 1, 1, 1700000000),
('it_m2', 'v_mart', 'cat_m_snacks', 'Britannia Milk Bikis (300g)', 'मिल्क बिकिस', 'Classic milk biscuits for tea dipping.', 4000, 1, '[]', 1, 2, 1700000000),
('it_m3', 'v_mart', 'cat_m_snacks', 'Lays India Magic Masala (50g)', 'लेज मैजिक मसाला', 'Crispy spiced potato ridges.', 2000, 1, '[]', 1, 3, 1700000000),
('it_m4', 'v_mart', 'cat_m_daily', 'Dettol Original Bathing Soap 75g', 'डेटॉल साबुन', 'Germ protection bathing bar.', 3500, 1, '["toiletries"]', 1, 4, 1700000000),
('it_m5', 'v_mart', 'cat_m_daily', 'Colgate MaxFresh Blue Gel 150g', 'कोलगेट मैक्सफ्रेश', 'Cooling crystal breath toothpaste.', 9500, 1, '["toiletries"]', 1, 5, 1700000000),
('it_m6', 'v_mart', 'cat_m_snacks', 'Maggi 2-Minute Noodles 4-Pack (280g)', 'मैगी 4-पैक', 'Multipack instant noodles.', 5600, 1, '["essential"]', 1, 6, 1700000000),
('it_m7', 'v_mart', 'cat_m_snacks', 'Haldirams Nagpur Aloo Bhujia (200g)', 'हल्दीराम भुजिया', 'Spicy potato and tepary bean flour sev.', 5500, 1, '[]', 1, 7, 1700000000),
('it_m8', 'v_mart', 'cat_m_daily', 'Nescafe Classic Instant Coffee (50g)', 'नेस्कैफे कॉफी', '100% pure soluble coffee granules.', 11000, 1, '[]', 1, 8, 1700000000),

-- Green Valley Veggies
('it_v1', 'v_veggies', 'cat_v_daily', 'Desi Tomatoes (1 kg)', 'टमाटर (1 किलो)', 'Juicy firm red cooking tomatoes.', 3000, 1, '[]', 1, 1, 1700000000),
('it_v2', 'v_veggies', 'cat_v_daily', 'Jyoti White Potatoes (1 kg)', 'आलू (1 किलो)', 'Selected firm cooking potatoes.', 2500, 1, '[]', 1, 2, 1700000000),
('it_v3', 'v_veggies', 'cat_v_daily', 'Red Nasik Onions (1 kg)', 'प्याज (1 किलो)', 'Pungent red onions for daily cooking.', 4000, 1, '[]', 1, 3, 1700000000),
('it_v4', 'v_veggies', 'cat_v_daily', 'Fresh Green Chillies & Coriander', 'मिर्च और धनिया', 'Spicy green chillies (100g) and fragrant coriander bunch.', 2000, 1, '[]', 1, 4, 1700000000),
('it_v5', 'v_veggies', 'cat_v_daily', 'Fresh Cauliflower (Gobhi) (1 pc)', 'फूलगोभी (1 पीस)', 'Clean white cauliflower head.', 3500, 1, '[]', 1, 5, 1700000000),
('it_v6', 'v_veggies', 'cat_v_daily', 'Green Peas (Matar) (500g)', 'हरी मटर (500 ग्राम)', 'Sweet seasonal shelled green peas.', 4000, 1, '[]', 1, 6, 1700000000),
('it_v7', 'v_veggies', 'cat_v_daily', 'Lady Finger (Bhindi) (500g)', 'भिंडी (500 ग्राम)', 'Tender green ladyfingers.', 3000, 1, '[]', 1, 7, 1700000000),
('it_v8', 'v_veggies', 'cat_v_daily', 'Fresh Palak Spinach (500g)', 'पालक (500 ग्राम)', 'Washed fresh leafy green spinach bundle.', 2500, 1, '[]', 1, 8, 1700000000),

-- Patna Fresh Meat
('it_p1', 'v_meat', 'cat_p_chicken', 'Fresh Broiler Chicken Curry Cut (1 kg)', 'चिकन करी कट (1 किलो)', 'Hygienically dressed and skinless bone-in chicken pieces.', 22000, 0, '["nonveg","popular"]', 1, 1, 1700000000),
('it_p2', 'v_meat', 'cat_p_chicken', 'Boneless Chicken Breast (500g)', 'चिकन ब्रेस्ट बोनलेस', 'Lean prime boneless chicken breast fillet.', 16000, 0, '["nonveg","healthy"]', 1, 2, 1700000000),
('it_p3', 'v_meat', 'cat_p_chicken', 'Chicken Drumsticks (500g)', 'चिकन लेग पीस', 'Succulent fresh chicken leg drumsticks (4-5 pcs).', 14000, 0, '["nonveg"]', 1, 3, 1700000000),
('it_p4', 'v_meat', 'cat_p_chicken', 'Minced Chicken Keema (500g)', 'चिकन कीमा', 'Freshly ground lean chicken mince.', 15000, 0, '["nonveg"]', 1, 4, 1700000000),
('it_p5', 'v_meat', 'cat_p_eggs', 'Farm Fresh White Eggs (Pack of 12)', 'सफेद अंडे (12 का पैक)', 'Grade-A farm eggs rich in protein.', 8500, 0, '["nonveg","bestseller"]', 1, 5, 1700000000),
('it_p6', 'v_meat', 'cat_p_eggs', 'Desi Brown Country Eggs (Pack of 6)', 'देसी अंडे (6 का पैक)', 'Free-range organic brown eggs with deep yellow yolk.', 5500, 0, '["nonveg"]', 1, 6, 1700000000),
('it_p7', 'v_meat', 'cat_p_chicken', 'Fresh Chicken Liver & Gizzard (500g)', 'चिकन कलेजी (500 ग्राम)', 'Freshly cleaned chicken organ cuts.', 11000, 0, '["nonveg"]', 1, 7, 1700000000),
('it_p8', 'v_meat', 'cat_p_chicken', 'Whole Desi Murga (approx 1.2kg)', 'देसी मुर्गा', 'Free range country chicken, firm texture and robust flavor.', 38000, 0, '["nonveg"]', 1, 8, 1700000000),

-- Midnight Bites (Late Night)
('it_l1', 'v_late', 'cat_l_rolls', 'Double Egg Mughlai Roll', 'डबल अंडा रोल', 'Flaky paratha rolled with two spiced eggs, onions, and spicy green chutney.', 6000, 0, '["bestseller","nonveg"]', 1, 1, 1700000000),
('it_l2', 'v_late', 'cat_l_rolls', 'Spicy Chicken Kathi Roll', 'चिकन काठी रोल', 'Marinated tandoori chicken chunks rolled in golden egg paratha.', 11000, 0, '["bestseller","nonveg"]', 1, 2, 1700000000),
('it_l3', 'v_late', 'cat_l_rolls', 'Paneer Tikka Roll', 'पनीर टिक्का रोल', 'Chargrilled paneer cubes with mint mayo and bell peppers.', 9000, 1, '["popular"]', 1, 3, 1700000000),
('it_l4', 'v_late', 'cat_l_burgers', 'Crispy Veggie Crunch Burger', 'क्रिस्पी वेज बर्गर', 'Potato & pea spiced patty with crunchy lettuce and chipotle mayo.', 5000, 1, '[]', 1, 4, 1700000000),
('it_l5', 'v_late', 'cat_l_burgers', 'Peri-Peri French Fries', 'पेरी पेरी फ्राइज', 'Hot and crispy golden fries dusted with fiery peri-peri seasoning.', 7000, 1, '[]', 1, 5, 1700000000),
('it_l6', 'v_late', 'cat_l_burgers', 'Chicken Loaded Cheesy Fries', 'लोडेड चिकन फ्राइज', 'Fries smothered in warm cheese sauce and shredded chicken tikka.', 12000, 0, '["nonveg"]', 1, 6, 1700000000),
('it_l7', 'v_late', 'cat_l_burgers', 'Spicy Fried Chicken Wings (6 Pcs)', 'चिकन विंग्स (6 पीस)', 'Crispy battered chicken wings tossed in hot garlic glaze.', 15000, 0, '["nonveg"]', 1, 7, 1700000000),
('it_l8', 'v_late', 'cat_l_rolls', 'Schezwan Egg Fried Rice Box', 'शेजवान फ्राइड राइस', 'Wok-tossed spicy rice with double egg scramble and spring onions.', 12000, 0, '["nonveg"]', 1, 8, 1700000000),

-- Royal Juice Corner
('it_j1', 'v_juice', 'cat_j_juices', 'Fresh Mosambi (Sweet Lime) Juice', 'मौसंबी जूस', 'Freshly cold-pressed sweet lime juice with black salt.', 4000, 1, '["bestseller"]', 1, 1, 1700000000),
('it_j2', 'v_juice', 'cat_j_juices', 'Pure Pomegranate (Anar) Juice', 'अनार जूस', '100% pure fresh pomegranate juice without added sugar.', 7000, 1, '["healthy"]', 1, 2, 1700000000),
('it_j3', 'v_juice', 'cat_j_juices', 'Chilled Fresh Watermelon Juice', 'तरबूज जूस', 'Hydrating sweet watermelon juice served chilled.', 3500, 1, '[]', 1, 3, 1700000000),
('it_j4', 'v_juice', 'cat_j_shakes', 'Alphonso Mango Thick Shake', 'मैंगो शेक', 'Rich mango pulp blended with whole milk and vanilla ice cream scoop.', 6000, 1, '["popular"]', 1, 4, 1700000000),
('it_j5', 'v_juice', 'cat_j_shakes', 'Banana Caramel Shake', 'बनाना शेक', 'Fresh banana blended with creamy milk and caramel drizzle.', 5000, 1, '[]', 1, 5, 1700000000),
('it_j6', 'v_juice', 'cat_j_shakes', 'Oreo Chocolate Overload Shake', 'ओरियो शेक', 'Crushed Oreo cookies blended with chocolate milk and fudge.', 7000, 1, '["popular"]', 1, 6, 1700000000),
('it_j7', 'v_juice', 'cat_j_shakes', 'Kesar Badam Milk (Cold)', 'केसर बादाम दूध', 'Thick almond milk flavored with real saffron and cardamom.', 4500, 1, '[]', 1, 7, 1700000000),
('it_j8', 'v_juice', 'cat_j_juices', 'Patliputra Sweet Cream Lassi', 'मीठी लस्सी', 'Thick churned sweet curd topped with malai and pistachios.', 4000, 1, '["bestseller"]', 1, 8, 1700000000);

-- 7. Demo Users
INSERT INTO users (id, email, name, role, campus_id, vendor_id, created_at) VALUES
('usr_student', 'student@demo.trefood.test', 'Aarav Sharma', 'student', 'campus_nitp', NULL, 1700000000),
('usr_vendor', 'vendor@demo.trefood.test', 'Ramesh Kumar (Ganga Dhaba)', 'vendor', 'campus_nitp', 'v_ganga', 1700000000),
('usr_admin', 'admin@demo.trefood.test', 'NITP Campus Delivery Admin', 'admin', 'campus_nitp', NULL, 1700000000);

-- 8. Announcements
INSERT INTO announcements (id, campus_id, message, active, created_at) VALUES
('ann_1', 'campus_nitp', 'Welcome to TreFood NIT Patna! Zero delivery fee at all campus gates. Pay at the gate upon matching the 4-digit handover code.', 1, 1700000000);

-- 9. 20 Historical Delivered Orders (For Admin Metrics)
INSERT INTO orders (id, public_no, campus_id, user_id, vendor_id, gate_id, status, subtotal_paise, total_paise, payment_method, handover_code, idempotency_key, eta_at, placed_at, accepted_at, out_for_delivery_at, at_gate_at, delivered_at, created_at) VALUES
('ord_01', 'TF-2601', 'campus_nitp', 'usr_student', 'v_ganga', 'gate_main', 'delivered', 19500, 19500, 'pay_at_gate', '1234', 'idemp-hist-01', 1700101800, 1700100000, 1700100300, 1700101200, 1700101600, 1700101800, 1700100000),
('ord_02', 'TF-2602', 'campus_nitp', 'usr_student', 'v_chai', 'gate_h5', 'delivered', 8500, 8500, 'pay_at_gate', '5678', 'idemp-hist-02', 1700111200, 1700110000, 1700110200, 1700110800, 1700111100, 1700111200, 1700110000),
('ord_03', 'TF-2603', 'campus_nitp', 'usr_student', 'v_fruits', 'gate_h7', 'delivered', 20000, 20000, 'pay_at_gate', '9012', 'idemp-hist-03', 1700121500, 1700120000, 1700120400, 1700121000, 1700121400, 1700121500, 1700120000),
('ord_04', 'TF-2604', 'campus_nitp', 'usr_student', 'v_late', 'gate_main', 'delivered', 17000, 17000, 'pay_at_gate', '3456', 'idemp-hist-04', 1700132000, 1700130000, 1700130500, 1700131400, 1700131800, 1700132000, 1700130000),
('ord_05', 'TF-2605', 'campus_nitp', 'usr_student', 'v_juice', 'gate_h5', 'delivered', 10000, 10000, 'pay_at_gate', '7890', 'idemp-hist-05', 1700141000, 1700140000, 1700140200, 1700140600, 1700140900, 1700141000, 1700140000),
('ord_06', 'TF-2606', 'campus_nitp', 'usr_student', 'v_ganga', 'gate_h7', 'delivered', 23500, 23500, 'pay_at_gate', '2345', 'idemp-hist-06', 1700152200, 1700150000, 1700150400, 1700151500, 1700152000, 1700152200, 1700150000),
('ord_07', 'TF-2607', 'campus_nitp', 'usr_student', 'v_chai', 'gate_main', 'delivered', 9000, 9000, 'pay_at_gate', '6789', 'idemp-hist-07', 1700161400, 1700160000, 1700160200, 1700160800, 1700161200, 1700161400, 1700160000),
('ord_08', 'TF-2608', 'campus_nitp', 'usr_student', 'v_mart', 'gate_h5', 'delivered', 16000, 16000, 'pay_at_gate', '0123', 'idemp-hist-08', 1700171200, 1700170000, 1700170200, 1700170800, 1700171100, 1700171200, 1700170000),
('ord_09', 'TF-2609', 'campus_nitp', 'usr_student', 'v_veggies', 'gate_main', 'delivered', 9500, 9500, 'pay_at_gate', '4567', 'idemp-hist-09', 1700181500, 1700180000, 1700180300, 1700181000, 1700181300, 1700181500, 1700180000),
('ord_10', 'TF-2610', 'campus_nitp', 'usr_student', 'v_meat', 'gate_h7', 'delivered', 22000, 22000, 'pay_at_gate', '8901', 'idemp-hist-10', 1700192000, 1700190000, 1700190400, 1700191200, 1700191800, 1700192000, 1700190000),
('ord_11', 'TF-2611', 'campus_nitp', 'usr_student', 'v_late', 'gate_main', 'delivered', 18000, 18000, 'pay_at_gate', '3210', 'idemp-hist-11', 1700202200, 1700200000, 1700200500, 1700201500, 1700202000, 1700202200, 1700200000),
('ord_12', 'TF-2612', 'campus_nitp', 'usr_student', 'v_juice', 'gate_h5', 'delivered', 8000, 8000, 'pay_at_gate', '7654', 'idemp-hist-12', 1700211100, 1700210000, 1700210200, 1700210700, 1700211000, 1700211100, 1700210000),
('ord_13', 'TF-2613', 'campus_nitp', 'usr_student', 'v_ganga', 'gate_main', 'delivered', 17200, 17200, 'pay_at_gate', '1987', 'idemp-hist-13', 1700222000, 1700220000, 1700220400, 1700221400, 1700221800, 1700222000, 1700220000),
('ord_14', 'TF-2614', 'campus_nitp', 'usr_student', 'v_chai', 'gate_h7', 'delivered', 6500, 6500, 'pay_at_gate', '5432', 'idemp-hist-14', 1700231200, 1700230000, 1700230200, 1700230700, 1700231000, 1700231200, 1700230000),
('ord_15', 'TF-2615', 'campus_nitp', 'usr_student', 'v_fruits', 'gate_main', 'delivered', 12000, 12000, 'pay_at_gate', '9876', 'idemp-hist-15', 1700241400, 1700240000, 1700240300, 1700240900, 1700241300, 1700241400, 1700240000),
('ord_16', 'TF-2616', 'campus_nitp', 'usr_student', 'v_late', 'gate_h5', 'delivered', 14000, 14000, 'pay_at_gate', '4321', 'idemp-hist-16', 1700252100, 1700250000, 1700250400, 1700251400, 1700251900, 1700252100, 1700250000),
('ord_17', 'TF-2617', 'campus_nitp', 'usr_student', 'v_ganga', 'gate_h7', 'delivered', 22000, 22000, 'pay_at_gate', '8765', 'idemp-hist-17', 1700262000, 1700260000, 1700260300, 1700261300, 1700261800, 1700262000, 1700260000),
('ord_18', 'TF-2618', 'campus_nitp', 'usr_student', 'v_mart', 'gate_main', 'delivered', 18000, 18000, 'pay_at_gate', '2109', 'idemp-hist-18', 1700271500, 1700270000, 1700270300, 1700271000, 1700271400, 1700271500, 1700270000),
('ord_19', 'TF-2619', 'campus_nitp', 'usr_student', 'v_juice', 'gate_h7', 'delivered', 11000, 11000, 'pay_at_gate', '6543', 'idemp-hist-19', 1700281200, 1700280000, 1700280200, 1700280800, 1700281100, 1700281200, 1700280000),
('ord_20', 'TF-2620', 'campus_nitp', 'usr_student', 'v_late', 'gate_main', 'delivered', 19000, 19000, 'pay_at_gate', '0987', 'idemp-hist-20', 1700292200, 1700290000, 1700290500, 1700291500, 1700292000, 1700292200, 1700290000);

-- 10. Sample Order Items for Historical Orders
INSERT INTO order_items (id, order_id, item_id, name, price_paise, quantity, notes) VALUES
('oi_01', 'ord_01', 'it_g1', 'Paneer Butter Masala', 16000, 1, 'Medium spicy'),
('oi_02', 'ord_01', 'it_g5', 'Butter Naan', 3500, 1, NULL),
('oi_03', 'ord_02', 'it_c4', 'Cheese Vegetable Maggi', 6500, 1, 'Extra cheese'),
('oi_04', 'ord_02', 'it_c2', 'Ginger Elaichi Chai', 2000, 1, NULL),
('oi_05', 'ord_04', 'it_l2', 'Spicy Chicken Kathi Roll', 11000, 1, 'Extra onions'),
('oi_06', 'ord_04', 'it_l1', 'Double Egg Mughlai Roll', 6000, 1, NULL);

-- 11. Sample Order Events for Historical Orders
INSERT INTO order_events (id, order_id, status, actor_id, at, note) VALUES
('ev_01_1', 'ord_01', 'placed', 'usr_student', 1700100000, 'Order placed via student app'),
('ev_01_2', 'ord_01', 'accepted', 'usr_vendor', 1700100300, 'Vendor accepted order'),
('ev_01_3', 'ord_01', 'out_for_delivery', 'usr_vendor', 1700101200, 'Rider departed for gate'),
('ev_01_4', 'ord_01', 'at_gate', 'usr_vendor', 1700101600, 'Packet arrived at Main Gate'),
('ev_01_5', 'ord_01', 'delivered', 'usr_student', 1700101800, 'Student matched 4-digit code and confirmed delivery');

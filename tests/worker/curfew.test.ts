import { describe, it, expect } from 'vitest';
import { canDeliver, type GateRecord, type VendorRecord, type VendorGateRecord } from '@worker/services/delivery';
import { parseTimeToMinutes } from '@worker/utils/time';
import {
  isNightSafetyActive,
  getGateCurfewStatus,
  getAvailableScheduleSlots,
  evaluateCanDeliver,
} from '@shared/curfew';

describe('Curfew and Delivery Service', () => {
  const gateMain: GateRecord = {
    id: 'gate_main',
    name: 'Main Gate',
    curfewTime: '23:30',
    bufferMinutes: 15,
    travelMinutes: 10,
    active: true,
  };

  const gateH5: GateRecord = {
    id: 'gate_h5',
    name: 'Hostel 5 Gate',
    curfewTime: '22:30',
    bufferMinutes: 15,
    travelMinutes: 12,
    active: true,
  };

  const vendorKitchen: VendorRecord = {
    id: 'rest_royal_bihar_nitp',
    name: 'The Royal Bihar Restaurant',
    hoursJson: JSON.stringify({ open: '10:00', close: '23:00' }),
    prepMinutes: 20,
    isOpen: true,
    status: 'active',
  };

  const vendorLate: VendorRecord = {
    id: 'rest_crave_nitp',
    name: 'Crave',
    hoursJson: JSON.stringify({ open: '21:00', close: '03:00' }),
    prepMinutes: 15,
    isOpen: true,
    status: 'active',
  };

  const vgMain: VendorGateRecord = {
    vendorId: 'rest_royal_bihar_nitp',
    gateId: 'gate_main',
    extraMinutes: 0,
  };

  it('allows delivery when well before curfew', () => {
    // 20:00 IST (14:30 UTC) -> 1200 minutes of day
    // Current: 20:00, Prep: 20, Travel: 10, Buffer: 15 -> Arrival: 20:45 < Curfew: 23:30
    const nowUtc = 1700058600; // corresponds to 20:00 IST
    const result = canDeliver(gateMain, vendorKitchen, nowUtc, vgMain, [gateMain, gateH5]);
    expect(result.ok).toBe(true);
    expect(result.etaMinutes).toBe(30);
  });

  it('rejects delivery when too close to curfew and offers alternative gates', () => {
    // At 22:50 IST: Prep 20 + Travel 10 + Buffer 15 = 45 min -> Arrival at 23:35 > Curfew 23:30
    // UTC for 22:50 IST
    // 22:50 IST = 17:20 UTC = 1700068800
    const nowUtc = 1700068800;
    const result = canDeliver(gateH5, vendorKitchen, nowUtc, vgMain, [gateMain, gateH5]);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('too_late');
  });

  it('handles post-midnight curfew and operating hours wrap-around correctly', () => {
    // Crave late-night operating window test: 21:00 to 03:00 IST
    // At 00:30 IST (post-midnight):
    // 00:30 IST = 19:00 UTC previous day = 1700074800
    const nowUtc = 1700074800;

    const gateLate: GateRecord = {
      id: 'gate_late',
      name: 'Late Gate',
      curfewTime: '02:00', // 2:00 AM curfew
      bufferMinutes: 10,
      travelMinutes: 10,
      active: true,
    };

    const vgLate: VendorGateRecord = {
      vendorId: 'rest_crave_nitp',
      gateId: 'gate_late',
      extraMinutes: 0,
    };

    const result = canDeliver(gateLate, vendorLate, nowUtc, vgLate, [gateLate]);
    expect(result.ok).toBe(true);
    expect(result.etaMinutes).toBe(25);
  });

  it('correctly evaluates Kolkata Biryani overnight operating hours (10:00 to 01:00 IST)', () => {
    // Base midnight 2026-11-10 IST = 2026-11-09 18:30 UTC
    const baseIstMidnightUtc = Math.floor(Date.UTC(2026, 10, 9, 18, 30, 0) / 1000);
    const vendorKolkata: VendorRecord = {
      id: 'rest_kolkata_biryani_nitp',
      name: 'Kolkata Biryani Fast-Food Pizza House',
      hoursJson: JSON.stringify({ open: '10:00', close: '01:00' }),
      prepMinutes: 15,
      isOpen: true,
      status: 'active',
    };
    const gate24x7: GateRecord = {
      id: 'gate_main',
      name: 'Main Gate',
      curfewTime: '23:59',
      bufferMinutes: 15,
      travelMinutes: 8,
      active: true,
      is24x7: true,
    };
    const vg: VendorGateRecord = {
      vendorId: 'rest_kolkata_biryani_nitp',
      gateId: 'gate_main',
      extraMinutes: 0,
    };

    // 14:00 IST (afternoon): Open
    const t1400 = baseIstMidnightUtc + 14 * 3600;
    expect(canDeliver(gate24x7, vendorKolkata, t1400, vg, [gate24x7]).ok).toBe(true);

    // 23:30 IST (night before midnight): Open
    const t2330 = baseIstMidnightUtc + 23 * 3600 + 30 * 60;
    expect(canDeliver(gate24x7, vendorKolkata, t2330, vg, [gate24x7]).ok).toBe(true);

    // 00:30 IST (post-midnight): Open
    const t0030 = baseIstMidnightUtc + 30 * 60;
    expect(canDeliver(gate24x7, vendorKolkata, t0030, vg, [gate24x7]).ok).toBe(true);

    // 01:15 IST (past overnight closing 01:00): Closed
    const t0115 = baseIstMidnightUtc + 1 * 3600 + 15 * 60;
    const r0115 = canDeliver(gate24x7, vendorKolkata, t0115, vg, [gate24x7]);
    expect(r0115.ok).toBe(false);
    expect(r0115.reason).toBe('vendor_closed');

    // 09:30 IST (morning before 10:00 opening): Closed
    const t0930 = baseIstMidnightUtc + 9 * 3600 + 30 * 60;
    const r0930 = canDeliver(gate24x7, vendorKolkata, t0930, vg, [gate24x7]);
    expect(r0930.ok).toBe(false);
    expect(r0930.reason).toBe('vendor_closed');
  });

  it('correctly parses time strings to minutes of day', () => {
    expect(parseTimeToMinutes('00:00')).toBe(0);
    expect(parseTimeToMinutes('10:30')).toBe(630);
    expect(parseTimeToMinutes('23:30')).toBe(1410);
  });

  it('supports 24x7 Main Gate / Academic Blocks and enforces 19:30 hostel curfew at 18:45, 19:15, and 19:45 IST', () => {
    const gateMain24x7: GateRecord = {
      id: 'gate_main',
      name: 'Main Gate / Academic Blocks',
      curfewTime: '23:59',
      bufferMinutes: 15,
      travelMinutes: 10,
      active: true,
      is24x7: true,
    };

    const gateBoysHostel: GateRecord = {
      id: 'gate_h5',
      name: 'Boys Hostel Gate',
      curfewTime: '19:30',
      bufferMinutes: 15,
      travelMinutes: 10,
      active: true,
      is24x7: false,
    };

    const vendorFast: VendorRecord = {
      id: 'v_fast',
      name: 'Campus Express',
      hoursJson: JSON.stringify({ open: '08:00', close: '23:00' }),
      prepMinutes: 15,
      isOpen: true,
      status: 'active',
    };

    const vgBoys: VendorGateRecord = {
      vendorId: 'v_fast',
      gateId: 'gate_h5',
      extraMinutes: 0,
    };

    const vgMain: VendorGateRecord = {
      vendorId: 'v_fast',
      gateId: 'gate_main',
      extraMinutes: 0,
    };

    // Base midnight 2026-11-10 IST = 2026-11-09 18:30 UTC
    const baseIstMidnightUtc = Math.floor(Date.UTC(2026, 10, 9, 18, 30, 0) / 1000);
    const t1845 = baseIstMidnightUtc + 18 * 3600 + 45 * 60;
    const t1915 = baseIstMidnightUtc + 19 * 3600 + 15 * 60;
    const t1945 = baseIstMidnightUtc + 19 * 3600 + 45 * 60;

    // 18:45 IST -> arrives 19:10 + 15m window = 19:25 <= 19:30 -> allowed; closes in 45 min
    const s1845 = getGateCurfewStatus(gateBoysHostel, t1845);
    expect(s1845.isOpen).toBe(true);
    expect(s1845.statusText).toBe('Open until 19:30');
    expect(s1845.countdownText).toBe('closes in 45 min');
    const r1845 = canDeliver(gateBoysHostel, vendorFast, t1845, vgBoys, [gateMain24x7, gateBoysHostel]);
    expect(r1845.ok).toBe(true);
    expect(r1845.latestOrderTime).toBe('18:50');

    // 19:15 IST -> closes in 15 min physically, misses 19:30 with 15m window -> rejected with Main Gate 24x7 alternative
    const s1915 = getGateCurfewStatus(gateBoysHostel, t1915);
    expect(s1915.isOpen).toBe(true);
    expect(s1915.statusText).toBe('Open until 19:30');
    expect(s1915.countdownText).toBe('closes in 15 min');
    const r1915 = canDeliver(gateBoysHostel, vendorFast, t1915, vgBoys, [gateMain24x7, gateBoysHostel]);
    expect(r1915.ok).toBe(false);
    expect(r1915.reason).toBe('too_late');
    expect(r1915.alternativeGates?.some((g) => g.gateId === 'gate_main' && g.is24x7)).toBe(true);

    // 19:45 IST -> Boys Hostel status is Closed -> Main Gate 24x7 still accepts!
    const s1945Boys = getGateCurfewStatus(gateBoysHostel, t1945);
    expect(s1945Boys.isOpen).toBe(false);
    expect(s1945Boys.statusText).toBe('Closed');
    const r1945Boys = canDeliver(gateBoysHostel, vendorFast, t1945, vgBoys, [gateMain24x7, gateBoysHostel]);
    expect(r1945Boys.ok).toBe(false);
    expect(r1945Boys.reason).toBe('too_late');

    const r1945Main = canDeliver(gateMain24x7, vendorFast, t1945, vgMain, [gateMain24x7, gateBoysHostel]);
    expect(r1945Main.ok).toBe(true);
    expect(getGateCurfewStatus(gateMain24x7, t1945).statusText).toBe('Open 24x7');
  });

  it('activates Campus Night Safety automatically at and after 19:00 IST', () => {
    const baseIstMidnightUtc = Math.floor(Date.UTC(2026, 10, 9, 18, 30, 0) / 1000);
    expect(isNightSafetyActive(baseIstMidnightUtc + 18 * 3600 + 59 * 60)).toBe(false);
    expect(isNightSafetyActive(baseIstMidnightUtc + 19 * 3600)).toBe(true);
    expect(isNightSafetyActive(baseIstMidnightUtc + 22 * 3600 + 30 * 60)).toBe(true);
  });

  it('constrains scheduled delivery slots strictly to both vendor hours and gate curfew', () => {
    const baseIstMidnightUtc = Math.floor(Date.UTC(2026, 10, 9, 18, 30, 0) / 1000);
    const t1800 = baseIstMidnightUtc + 18 * 3600; // 18:00 IST

    const closedMorningVendor: VendorRecord = {
      id: 'rest_vrindavan_bhog_nitp',
      name: 'Vrindavan Bhog',
      hoursJson: JSON.stringify({ open: '09:00', close: '21:00' }),
      prepMinutes: 15,
      isOpen: false, // currently closed, but accepts scheduled slots inside hours
      busyUntil: null,
      status: 'active',
    };

    const hostelGate: GateRecord = {
      id: 'gate_h5',
      name: 'Boys Hostel Gate',
      curfewTime: '19:30',
      bufferMinutes: 15,
      travelMinutes: 10,
      active: true,
      is24x7: false,
    };

    const vg: VendorGateRecord = {
      vendorId: 'rest_vrindavan_bhog_nitp',
      gateId: 'gate_h5',
      extraMinutes: 0,
    };

    // Scheduled check bypasses instant isOpen=false when slot falls inside open hours & curfew
    const scheduled1845 = t1800 + 45 * 60; // 18:45 IST -> arrival 19:10 + 15m = 19:25 <= 19:30
    const res1845 = evaluateCanDeliver(closedMorningVendor, hostelGate, scheduled1845, vg, [], {
      isScheduled: true,
    });
    expect(res1845.ok).toBe(true);

    // Slots at 18:00 IST -> today slots capped before 19:30 curfew, tomorrow slots start at 09:00 IST
    const slots = getAvailableScheduleSlots(closedMorningVendor, hostelGate, t1800, vg, 10);
    expect(slots.length).toBeGreaterThan(0);
    // Today 18:15 (arr 18:40), 18:30 (arr 18:55), 18:45 (arr 19:10), 19:00 (arr 19:25 -> 19:40 > 19:30 rejected!)
    const todaySlots = slots.filter((s) => s.dayLabel === 'Today');
    expect(todaySlots.every((s) => s.orderTimeIst <= '18:50')).toBe(true);
    const tomorrowFirst = slots.find((s) => s.dayLabel === 'Tomorrow');
    expect(tomorrowFirst?.orderTimeIst).toBe('09:00');
  });
});

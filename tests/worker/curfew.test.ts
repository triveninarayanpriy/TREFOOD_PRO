import { describe, it, expect } from 'vitest';
import { canDeliver, type GateRecord, type VendorRecord, type VendorGateRecord } from '@worker/services/delivery';
import { parseTimeToMinutes } from '@worker/utils/time';
import { isNightSafetyActive, getGateCurfewStatus } from '@shared/curfew';

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

  const vendorGanga: VendorRecord = {
    id: 'v_ganga',
    name: 'Ganga Dhaba',
    hoursJson: JSON.stringify({ open: '10:00', close: '23:00' }),
    prepMinutes: 20,
    isOpen: true,
    status: 'active',
  };

  const vendorLate: VendorRecord = {
    id: 'v_late',
    name: 'Midnight Bites',
    hoursJson: JSON.stringify({ open: '21:00', close: '03:00' }),
    prepMinutes: 15,
    isOpen: true,
    status: 'active',
  };

  const vgMain: VendorGateRecord = {
    vendorId: 'v_ganga',
    gateId: 'gate_main',
    extraMinutes: 0,
  };

  it('allows delivery when well before curfew', () => {
    // 20:00 IST (14:30 UTC) -> 1200 minutes of day
    // Current: 20:00, Prep: 20, Travel: 10, Buffer: 15 -> Arrival: 20:45 < Curfew: 23:30
    const nowUtc = 1700058600; // corresponds to 20:00 IST
    const result = canDeliver(gateMain, vendorGanga, nowUtc, vgMain, [gateMain, gateH5]);
    expect(result.ok).toBe(true);
    expect(result.etaMinutes).toBe(30);
  });

  it('rejects delivery when too close to curfew and offers alternative gates', () => {
    // At 22:50 IST: Prep 20 + Travel 10 + Buffer 15 = 45 min -> Arrival at 23:35 > Curfew 23:30
    // UTC for 22:50 IST
    // 22:50 IST = 17:20 UTC = 1700068800
    const nowUtc = 1700068800;
    const result = canDeliver(gateH5, vendorGanga, nowUtc, vgMain, [gateMain, gateH5]);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('too_late');
  });

  it('handles post-midnight curfew and operating hours wrap-around correctly', () => {
    // Midnight Bites operates 21:00 to 03:00 IST
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
      vendorId: 'v_late',
      gateId: 'gate_late',
      extraMinutes: 0,
    };

    const result = canDeliver(gateLate, vendorLate, nowUtc, vgLate, [gateLate]);
    expect(result.ok).toBe(true);
    expect(result.etaMinutes).toBe(25);
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
});

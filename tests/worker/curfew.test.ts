import { describe, it, expect } from 'vitest';
import { canDeliver, type GateRecord, type VendorRecord, type VendorGateRecord } from '@worker/services/delivery';
import { parseTimeToMinutes } from '@worker/utils/time';

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
});

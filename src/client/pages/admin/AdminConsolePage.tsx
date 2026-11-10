import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Dialog } from '../../components/ui/Dialog';
import { useToast } from '../../components/ui/Toast';
import { useSeoHead } from '../../components/seo/SeoHead';
import {
  AdminCouponsTab,
  AdminReportsTab,
  AdminSettlementsTab,
  AdminAnnouncementsTab,
  AdminAuditTab,
} from '../../components/admin/AdminOpsTabs';
import type {
  AdminMetrics,
  AdminVendor,
  AdminVendorApplication,
  AdminGate,
  AdminOrder,
  AdminOrderEvent,
  AdminCoupon,
  AdminReport,
  AdminSettlementRow,
  AdminAnnouncement,
  AdminAuditEntry,
} from '../../components/admin/AdminTypes';
import {
  ShieldAlert,
  BarChart3,
  Store,
  MapPin,
  FileText,
  Megaphone,
  History,
  AlertTriangle,
  RefreshCw,
  Plus,
  Sparkles,
  Lock,
  Tag,
  Wallet,
  Settings2,
} from 'lucide-react';

type AdminTabId =
  | 'overview'
  | 'orders'
  | 'vendors'
  | 'gates'
  | 'coupons'
  | 'reports'
  | 'settlements'
  | 'announcements'
  | 'audit';

// Hand-written SVG Orders-per-Hour Chart (Zero Chart Libraries!)
function OrdersPerHourSvgChart({ data }: { data: number[] }) {
  const max = Math.max(...data, 1);
  const height = 120;
  const width = 480;
  const barWidth = 24;
  const gap = 16;
  const labels = ['00h', '02h', '04h', '06h', '08h', '10h', '12h', '14h', '16h', '18h', '20h', '22h'];

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height + 30}`}
        className="w-full h-36 min-w-[400px]"
        aria-label="Hourly orders histogram"
        role="img"
      >
        {data.map((val, idx) => {
          const barHeight = Math.max(4, (val / max) * (height - 20));
          const x = idx * (barWidth + gap) + 10;
          const y = height - barHeight;

          return (
            <g key={idx}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                rx={4}
                className="fill-[#830020] dark:fill-[#FFB400] transition-all"
              />
              {val > 0 && (
                <text
                  x={x + barWidth / 2}
                  y={y - 4}
                  textAnchor="middle"
                  className="text-[10px] font-mono font-bold fill-stone-600 dark:fill-stone-300"
                >
                  {val}
                </text>
              )}
              <text
                x={x + barWidth / 2}
                y={height + 16}
                textAnchor="middle"
                className="text-[9px] font-mono fill-stone-500 dark:fill-stone-400"
              >
                {labels[idx]}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function parseVendorHours(hoursJson: string): { open: string; close: string } {
  try {
    const parsed = JSON.parse(hoursJson) as { open?: string; close?: string };
    return { open: parsed.open || '09:00', close: parsed.close || '22:00' };
  } catch {
    return { open: '09:00', close: '22:00' };
  }
}

export function AdminConsolePage() {
  useSeoHead({
    title: 'Campus Admin Console (/admin) | TreFood NIT Patna',
    description:
      'Campus operations dashboard for gate curfews, vendor onboarding, coupons, reports, settlements, and audit logs.',
    path: '/admin',
    noIndex: true,
  });
  const { user, loginAsDemo, loading: authLoading } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<AdminTabId>('overview');

  // Core state slices
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [vendorsList, setVendorsList] = useState<AdminVendor[]>([]);
  const [applicationsList, setApplicationsList] = useState<AdminVendorApplication[]>([]);
  const [gatesList, setGatesList] = useState<AdminGate[]>([]);

  // Live Orders + filters
  const [adminOrders, setAdminOrders] = useState<AdminOrder[]>([]);
  const [orderStatusFilter, setOrderStatusFilter] = useState('');
  const [orderGateFilter, setOrderGateFilter] = useState('');
  const [orderVendorFilter, setOrderVendorFilter] = useState('');
  const [orderSearchQ, setOrderSearchQ] = useState('');
  const [selectedOrderTimeline, setSelectedOrderTimeline] = useState<AdminOrderEvent[] | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [forceCancelId, setForceCancelId] = useState<string | null>(null);
  const [forceCancelReason, setForceCancelReason] = useState('Campus administrative shutdown');

  // Vendor Edit Hours & Gate Reach Modal
  const [editingVendor, setEditingVendor] = useState<AdminVendor | null>(null);
  const [vendorOpenHour, setVendorOpenHour] = useState('09:00');
  const [vendorCloseHour, setVendorCloseHour] = useState('22:00');
  const [vendorPrepDraft, setVendorPrepDraft] = useState('15');
  const [vendorPhoneDraft, setVendorPhoneDraft] = useState('');
  const [vendorGateSelection, setVendorGateSelection] = useState<
    Record<string, { enabled: boolean; extraMinutes: number }>
  >({});

  // Gate Temp Closure + Banner Broadcast Modal
  const [gateClosureTarget, setGateClosureTarget] = useState<AdminGate | null>(null);
  const [gateBannerText, setGateBannerText] = useState('');
  const [gateSettingDrafts, setGateSettingDrafts] = useState<
    Record<string, { curfewTime: string; bufferMinutes: number; travelMinutes: number }>
  >({});

  // Festival Override, Invite, Announcement modals
  const [festivalModalOpen, setFestivalModalOpen] = useState(false);
  const [festivalName, setFestivalName] = useState('Chhath Puja');
  const [festivalCloseAll, setFestivalCloseAll] = useState(true);

  const [announcementModalOpen, setAnnouncementModalOpen] = useState(false);
  const [announcementText, setAnnouncementText] = useState('');
  const [announcementsList, setAnnouncementsList] = useState<AdminAnnouncement[]>([]);

  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [lastInviteLink, setLastInviteLink] = useState<string | null>(null);

  // Coupons, Reports, Settlements & Audit Log
  const [couponsList, setCouponsList] = useState<AdminCoupon[]>([]);
  const [adminReports, setAdminReports] = useState<AdminReport[]>([]);
  const [settlementsList, setSettlementsList] = useState<AdminSettlementRow[]>([]);
  const [settlementVendorFilter, setSettlementVendorFilter] = useState('');
  const [settlementDateFilter, setSettlementDateFilter] = useState('');
  const [auditLogs, setAuditLogs] = useState<AdminAuditEntry[]>([]);
  const [auditActionFilter, setAuditActionFilter] = useState('');

  // Data loaders
  const loadMetrics = useCallback(async () => {
    const res = await fetch('/api/admin/metrics');
    if (res.ok) {
      const data = (await res.json()) as { metrics?: AdminMetrics };
      if (data.metrics) setMetrics(data.metrics);
    }
  }, []);

  const loadVendorsAndApps = useCallback(async () => {
    const [vRes, aRes] = await Promise.all([
      fetch('/api/admin/vendors'),
      fetch('/api/admin/vendor-applications'),
    ]);
    if (vRes.ok) {
      const data = (await vRes.json()) as { vendors?: AdminVendor[] };
      setVendorsList(data.vendors || []);
    }
    if (aRes.ok) {
      const data = (await aRes.json()) as { applications?: AdminVendorApplication[] };
      setApplicationsList(data.applications || []);
    }
  }, []);

  const loadGates = useCallback(async () => {
    const res = await fetch('/api/admin/gates');
    if (res.ok) {
      const data = (await res.json()) as { gates?: AdminGate[] };
      const list = data.gates || [];
      setGatesList(list);
      const nextDrafts: Record<string, { curfewTime: string; bufferMinutes: number; travelMinutes: number }> = {};
      list.forEach((g) => {
        nextDrafts[g.id] = {
          curfewTime: g.curfewTime,
          bufferMinutes: g.bufferMinutes,
          travelMinutes: g.travelMinutes,
        };
      });
      setGateSettingDrafts(nextDrafts);
    }
  }, []);

  const loadOrders = useCallback(
    async (
      status = orderStatusFilter,
      gateId = orderGateFilter,
      vendorId = orderVendorFilter,
      q = orderSearchQ
    ) => {
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      if (gateId) params.set('gateId', gateId);
      if (vendorId) params.set('vendorId', vendorId);
      if (q.trim()) params.set('q', q.trim());

      const res = await fetch(`/api/admin/orders?${params.toString()}`);
      if (res.ok) {
        const data = (await res.json()) as { orders?: AdminOrder[] };
        setAdminOrders(data.orders || []);
      }
    },
    [orderStatusFilter, orderGateFilter, orderVendorFilter, orderSearchQ]
  );

  const loadCoupons = useCallback(async () => {
    const res = await fetch('/api/admin/coupons');
    if (res.ok) {
      const data = (await res.json()) as { coupons?: AdminCoupon[] };
      setCouponsList(data.coupons || []);
    }
  }, []);

  const loadReports = useCallback(async () => {
    const res = await fetch('/api/admin/reports');
    if (res.ok) {
      const data = (await res.json()) as { reports?: AdminReport[] };
      setAdminReports(data.reports || []);
    }
  }, []);

  const loadSettlements = useCallback(
    async (vendorId = settlementVendorFilter, date = settlementDateFilter) => {
      const params = new URLSearchParams();
      if (vendorId) params.set('vendorId', vendorId);
      if (date) params.set('date', date);
      const res = await fetch(`/api/admin/settlements?${params.toString()}`);
      if (res.ok) {
        const data = (await res.json()) as { settlements?: AdminSettlementRow[] };
        setSettlementsList(data.settlements || []);
      }
    },
    [settlementVendorFilter, settlementDateFilter]
  );

  const loadAnnouncements = useCallback(async () => {
    const res = await fetch('/api/admin/announcements');
    if (res.ok) {
      const data = (await res.json()) as { announcements?: AdminAnnouncement[] };
      setAnnouncementsList(data.announcements || []);
    }
  }, []);

  const loadAudit = useCallback(async (action = auditActionFilter) => {
    const q = action ? `?action=${encodeURIComponent(action)}` : '';
    const res = await fetch(`/api/admin/audit-log${q}`);
    if (res.ok) {
      const data = (await res.json()) as { logs?: AdminAuditEntry[] };
      setAuditLogs(data.logs || []);
    }
  }, [auditActionFilter]);

  useEffect(() => {
    if (user?.role === 'admin') {
      void loadMetrics();
      void loadVendorsAndApps();
      void loadGates();
      void loadOrders();
      void loadReports();
    }
  }, [user, loadMetrics, loadVendorsAndApps, loadGates, loadOrders, loadReports]);

  // Handlers
  const handleVendorStatus = async (vendorId: string, status: 'active' | 'suspended') => {
    const res = await fetch(`/api/admin/vendors/${vendorId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      showToast(`Vendor marked ${status}`, 'success');
      void loadVendorsAndApps();
      void loadMetrics();
    }
  };

  const openEditVendorModal = (v: AdminVendor) => {
    const hrs = parseVendorHours(v.hoursJson);
    setEditingVendor(v);
    setVendorOpenHour(hrs.open);
    setVendorCloseHour(hrs.close);
    setVendorPrepDraft(String(v.prepMinutes));
    setVendorPhoneDraft(v.phone);

    const reachMap: Record<string, { enabled: boolean; extraMinutes: number }> = {};
    gatesList.forEach((g) => {
      const found = v.gateReach.find((r) => r.gateId === g.id);
      reachMap[g.id] = {
        enabled: Boolean(found),
        extraMinutes: found ? found.extraMinutes : 0,
      };
    });
    setVendorGateSelection(reachMap);
  };

  const handleSaveVendorDetails = async () => {
    if (!editingVendor) return;
    const hoursJson = JSON.stringify({ open: vendorOpenHour, close: vendorCloseHour });
    const prepMinutes = Math.max(5, Math.min(90, Number.parseInt(vendorPrepDraft, 10) || 15));

    const [detailsRes, gatesRes] = await Promise.all([
      fetch(`/api/admin/vendors/${editingVendor.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hoursJson,
          prepMinutes,
          phone: vendorPhoneDraft.trim() || undefined,
        }),
      }),
      fetch(`/api/admin/vendors/${editingVendor.id}/gates`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gates: Object.entries(vendorGateSelection)
            .filter(([, cfg]) => cfg.enabled)
            .map(([gateId, cfg]) => ({ gateId, extraMinutes: cfg.extraMinutes })),
        }),
      }),
    ]);

    if (detailsRes.ok && gatesRes.ok) {
      showToast(`Updated ${editingVendor.name} hours & gate reach`, 'success');
      setEditingVendor(null);
      void loadVendorsAndApps();
    } else {
      showToast('Could not save vendor configuration', 'error');
    }
  };

  const handleApplicationAction = async (
    appId: string,
    status: 'approved' | 'reviewed'
  ) => {
    const res = await fetch(`/api/admin/vendor-applications/${appId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      showToast(
        status === 'approved' ? 'Vendor approved and onboarded to campus marketplace!' : 'Marked reviewed',
        'success'
      );
      void loadVendorsAndApps();
      void loadMetrics();
    }
  };

  const handleSaveGateSettings = async (gate: AdminGate) => {
    const draft = gateSettingDrafts[gate.id];
    if (!draft) return;
    const res = await fetch(`/api/admin/gates/${gate.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(draft),
    });
    if (res.ok) {
      showToast(`Saved settings for ${gate.name}`, 'success');
      void loadGates();
    } else {
      showToast('Invalid gate schedule or numbers', 'error');
    }
  };

  const handleConfirmGateClosure = async () => {
    if (!gateClosureTarget) return;
    const nextActive = !gateClosureTarget.active;
    const res = await fetch(`/api/admin/gates/${gateClosureTarget.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        active: nextActive,
        broadcastBanner: true,
        bannerMessage: gateBannerText.trim() || undefined,
      }),
    });
    if (res.ok) {
      showToast(
        nextActive
          ? `${gateClosureTarget.name} reopened & student banner updated`
          : `${gateClosureTarget.name} closed temporarily with student broadcast`,
        'success'
      );
      setGateClosureTarget(null);
      setGateBannerText('');
      void loadGates();
      void loadAnnouncements();
    }
  };

  const handleFestivalOverride = async () => {
    const res = await fetch('/api/admin/gates/festival-override', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        festivalName,
        active: !festivalCloseAll,
      }),
    });
    if (res.ok) {
      showToast(`Festival override applied for ${festivalName}`, 'success');
      setFestivalModalOpen(false);
      void loadGates();
    }
  };

  const handleForceCancel = async () => {
    if (!forceCancelId) return;
    const res = await fetch(`/api/admin/orders/${forceCancelId}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: forceCancelReason }),
    });
    if (res.ok) {
      showToast('Order force-cancelled', 'info');
      setForceCancelId(null);
      void loadOrders();
      void loadMetrics();
    }
  };

  const handleViewTimeline = async (orderId: string) => {
    setSelectedOrderId(orderId);
    const res = await fetch(`/api/admin/orders/${orderId}/timeline`);
    if (res.ok) {
      const data = (await res.json()) as { events?: AdminOrderEvent[] };
      setSelectedOrderTimeline(data.events || []);
    }
  };

  const handleCreateAnnouncement = async () => {
    if (!announcementText.trim()) return;
    const res = await fetch('/api/admin/announcements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: announcementText.trim() }),
    });
    if (res.ok) {
      showToast('Campus announcement banner published', 'success');
      setAnnouncementModalOpen(false);
      setAnnouncementText('');
      void loadAnnouncements();
    }
  };

  const handleInviteVendor = async () => {
    if (!inviteEmail.trim() || !inviteName.trim()) return;
    const res = await fetch('/api/admin/vendors/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inviteEmail.trim(), name: inviteName.trim() }),
    });
    if (res.ok) {
      const data = (await res.json()) as { inviteLink: string };
      setLastInviteLink(data.inviteLink);
      showToast('Vendor invite created cleanly', 'success');
    }
  };

  const handleToggleCoupon = async (id: string, active: boolean) => {
    const res = await fetch(`/api/admin/coupons/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active }),
    });
    if (res.ok) {
      showToast(`Coupon ${active ? 'activated' : 'paused'}`, 'success');
      void loadCoupons();
    }
  };

  const handleCreateCoupon = async (payload: {
    code: string;
    description: string;
    discountType: 'percent' | 'flat';
    discountValue: number;
    minOrderPaise: number;
    newUsersOnly: boolean;
  }) => {
    const res = await fetch('/api/admin/coupons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, active: true }),
    });
    if (res.ok) {
      showToast(`Coupon ${payload.code} created`, 'success');
      void loadCoupons();
      return true;
    }
    const err = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    showToast(err.error?.message || 'Could not create coupon', 'error');
    return false;
  };

  const handleResolveReport = async (
    id: string,
    payload: {
      status: 'resolved' | 'refunded' | 'credited' | 'rejected';
      refundPaise: number;
      resolutionNote: string;
    }
  ) => {
    const res = await fetch(`/api/admin/reports/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      showToast(`Report marked ${payload.status}`, 'success');
      void loadReports();
      void loadMetrics();
    }
  };

  const exportSettlementCsv = () => {
    const header = 'IST Date,Vendor ID,Vendor Name,Orders,Pay at Gate (INR),UPI (INR),Discounts (INR),Gross (INR)\n';
    const rows = settlementsList
      .map(
        (r) =>
          `${r.date},${r.vendorId},"${r.vendorName}",${r.ordersCount},${(r.payAtGatePaise / 100).toFixed(2)},${(r.upiPaise / 100).toFixed(2)},${(r.discountPaise / 100).toFixed(2)},${(r.grossPaise / 100).toFixed(2)}`
      )
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trefood-admin-settlement-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (authLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#830020] border-t-transparent dark:border-[#FFB400]" />
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return (
      <div className="mx-auto max-w-md px-4 py-16 space-y-4 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 text-[#830020] dark:bg-red-950/60 dark:text-[#FFB400]">
          <Lock className="h-7 w-7" aria-hidden="true" />
        </div>
        <h1 className="text-xl font-bold text-stone-900 dark:text-stone-100">
          TreFood Admin Access Only
        </h1>
        <p className="text-xs text-stone-600 dark:text-stone-400">
          {user
            ? `Signed in as "${user.role}". Only NIT Patna operations administrators can access /admin.`
            : 'Please authenticate as a TreFood administrator.'}
        </p>
        <div className="pt-4">
          <Button
            onClick={async () => {
              const res = await loginAsDemo('admin');
              if (res.ok) {
                showToast('Signed in as Campus Admin', 'success');
              }
            }}
            variant="primary"
            className="w-full min-h-[48px] font-bold"
          >
            <Sparkles className="mr-2 h-4 w-4" aria-hidden="true" />
            1-Tap Login as Admin (admin@demo.trefood.test)
          </Button>
        </div>
      </div>
    );
  }

  const openReportsCount = adminReports.filter((r) => r.status === 'open').length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 space-y-6">
      {/* Desktop-First Header */}
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-200 pb-4 dark:border-stone-800">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#830020] text-[#FFB400] font-bold shrink-0">
            <ShieldAlert className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-stone-900 dark:text-stone-100">
              TreFood Campus Administration
            </h1>
            <p className="text-xs text-stone-600 dark:text-stone-400">
              NIT Patna Operations • Orders, Onboarding, Curfews, Coupons, Disputes &amp; Settlements
            </p>
          </div>
        </div>

        <nav
          aria-label="Admin sections"
          className="flex flex-wrap items-center gap-1 rounded-xl bg-stone-100 p-1 dark:bg-stone-850"
        >
          {(
            [
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'orders', label: 'Orders Monitor', icon: FileText },
              { id: 'vendors', label: 'Vendors', icon: Store },
              { id: 'gates', label: 'Gates & Curfews', icon: MapPin },
              { id: 'coupons', label: 'Coupons', icon: Tag },
              { id: 'reports', label: `Reports (${openReportsCount})`, icon: AlertTriangle },
              { id: 'settlements', label: 'Settlements', icon: Wallet },
              { id: 'announcements', label: 'Announcements', icon: Megaphone },
              { id: 'audit', label: 'Audit Log', icon: History },
            ] as const
          ).map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id);
                  if (tab.id === 'orders') void loadOrders();
                  if (tab.id === 'vendors') void loadVendorsAndApps();
                  if (tab.id === 'gates') void loadGates();
                  if (tab.id === 'coupons') void loadCoupons();
                  if (tab.id === 'reports') void loadReports();
                  if (tab.id === 'settlements') void loadSettlements();
                  if (tab.id === 'announcements') void loadAnnouncements();
                  if (tab.id === 'audit') void loadAudit();
                }}
                className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-lg px-3 text-xs font-bold transition-all ${
                  activeTab === tab.id
                    ? 'bg-white text-stone-900 shadow-xs dark:bg-stone-700 dark:text-stone-100'
                    : 'text-stone-600 hover:text-stone-900 dark:text-stone-400'
                }`}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </header>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {[
              { label: 'Live Orders', val: metrics?.liveOrders ?? 0 },
              { label: 'Delivered Today', val: metrics?.deliveredToday ?? 0 },
              { label: 'Avg Gate ETA', val: `${metrics?.avgGateEtaMinutes ?? 23}m` },
              { label: 'Complaints Open', val: metrics?.openComplaintsCount ?? openReportsCount },
              { label: 'Vendors Open', val: metrics?.vendorsOpenCount ?? 0 },
              { label: 'Total Orders', val: metrics?.totalOrders ?? 0 },
              { label: 'GMV (₹)', val: `₹${(metrics?.totalRevenueRupees ?? 0).toFixed(0)}` },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-stone-200 bg-white p-4 text-center dark:border-stone-800 dark:bg-stone-900"
              >
                <div className="text-[11px] font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400">
                  {stat.label}
                </div>
                <div className="mt-1 font-mono text-2xl font-black text-[#830020] dark:text-[#FFB400]">
                  {stat.val}
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                  Hourly Orders Volume
                </h2>
                <p className="text-xs text-stone-600 dark:text-stone-400">
                  Acceptance: {metrics?.acceptanceRate ?? 100}% • Cancellation: {metrics?.cancellationRate ?? 0}%
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-300">
                IST Distribution
              </span>
            </div>
            <OrdersPerHourSvgChart data={metrics?.hourlyDistribution || [2, 0, 0, 1, 3, 5, 8, 4, 3, 6, 9, 4]} />
          </div>

          <div className="flex flex-wrap gap-3">
            <Button onClick={() => setFestivalModalOpen(true)} variant="secondary" size="sm" className="min-h-[44px]">
              <AlertTriangle className="mr-1.5 h-4 w-4 text-amber-600" aria-hidden="true" />
              Festival Override (Chhath Puja / Holiday)
            </Button>
            <Button onClick={() => setAnnouncementModalOpen(true)} variant="secondary" size="sm" className="min-h-[44px]">
              <Megaphone className="mr-1.5 h-4 w-4 text-blue-700" aria-hidden="true" />
              Post Student Banner
            </Button>
            <Button onClick={() => setInviteModalOpen(true)} variant="secondary" size="sm" className="min-h-[44px]">
              <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
              Invite New Vendor
            </Button>
          </div>
        </div>
      )}

      {/* TAB 2: LIVE ORDERS WITH FILTERS */}
      {activeTab === 'orders' && (
        <div className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-bold">Live Orders Monitor ({adminOrders.length})</h2>
            <Button onClick={() => void loadOrders()} variant="secondary" size="sm" className="min-h-[44px]">
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
              Refresh
            </Button>
          </div>

          {/* Filter Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 rounded-xl bg-stone-50 p-3 dark:bg-stone-850">
            <div>
              <label htmlFor="admin-order-search" className="text-[11px] font-bold block mb-1 text-stone-600">
                Search Order / Code
              </label>
              <input
                id="admin-order-search"
                type="search"
                placeholder="TF-..., code, or canteen..."
                value={orderSearchQ}
                onChange={(e) => {
                  const val = e.target.value;
                  setOrderSearchQ(val);
                  void loadOrders(orderStatusFilter, orderGateFilter, orderVendorFilter, val);
                }}
                className="min-h-[44px] w-full rounded-xl border border-stone-300 bg-white px-3 text-xs dark:border-stone-700 dark:bg-stone-900"
              />
            </div>

            <div>
              <label htmlFor="admin-order-status-filter" className="text-[11px] font-bold block mb-1 text-stone-600">
                Status
              </label>
              <select
                id="admin-order-status-filter"
                value={orderStatusFilter}
                onChange={(e) => {
                  const val = e.target.value;
                  setOrderStatusFilter(val);
                  void loadOrders(val, orderGateFilter, orderVendorFilter, orderSearchQ);
                }}
                className="min-h-[44px] w-full rounded-xl border border-stone-300 bg-white px-3 text-xs dark:border-stone-700 dark:bg-stone-900"
              >
                <option value="">All Statuses</option>
                <option value="live">Live Active Only</option>
                <option value="placed">Placed</option>
                <option value="accepted">Preparing (Accepted)</option>
                <option value="out_for_delivery">Out for Delivery</option>
                <option value="at_gate">At Gate</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div>
              <label htmlFor="admin-order-gate-filter" className="text-[11px] font-bold block mb-1 text-stone-600">
                Gate
              </label>
              <select
                id="admin-order-gate-filter"
                value={orderGateFilter}
                onChange={(e) => {
                  const val = e.target.value;
                  setOrderGateFilter(val);
                  void loadOrders(orderStatusFilter, val, orderVendorFilter, orderSearchQ);
                }}
                className="min-h-[44px] w-full rounded-xl border border-stone-300 bg-white px-3 text-xs dark:border-stone-700 dark:bg-stone-900"
              >
                <option value="">All Gates</option>
                {gatesList.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="admin-order-vendor-filter" className="text-[11px] font-bold block mb-1 text-stone-600">
                Vendor
              </label>
              <select
                id="admin-order-vendor-filter"
                value={orderVendorFilter}
                onChange={(e) => {
                  const val = e.target.value;
                  setOrderVendorFilter(val);
                  void loadOrders(orderStatusFilter, orderGateFilter, val, orderSearchQ);
                }}
                className="min-h-[44px] w-full rounded-xl border border-stone-300 bg-white px-3 text-xs dark:border-stone-700 dark:bg-stone-900"
              >
                <option value="">All Vendors</option>
                {vendorsList.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-stone-100 text-stone-600 dark:text-stone-400 uppercase tracking-wider dark:border-stone-800">
                <tr>
                  <th className="py-2.5">Order</th>
                  <th>Vendor</th>
                  <th>Gate</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Code</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                {adminOrders.map((o) => (
                  <tr key={o.id}>
                    <td className="py-3 font-mono font-bold">#{o.publicNo}</td>
                    <td className="font-medium">{o.vendorName}</td>
                    <td>{o.gateName}</td>
                    <td className="font-mono">₹{(o.totalPaise / 100).toFixed(2)}</td>
                    <td>
                      <Badge variant={o.status === 'delivered' ? 'default' : o.status === 'cancelled' ? 'danger' : 'success'}>
                        {o.status}
                      </Badge>
                    </td>
                    <td className="font-mono font-bold">{o.handoverCode}</td>
                    <td className="text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => void handleViewTimeline(o.id)}
                        className="text-xs font-bold text-blue-700 dark:text-blue-300 hover:underline min-h-[44px] px-2"
                      >
                        Timeline
                      </button>
                      {o.status !== 'delivered' && o.status !== 'cancelled' && (
                        <button
                          type="button"
                          onClick={() => setForceCancelId(o.id)}
                          className="text-xs font-bold text-red-700 dark:text-red-300 hover:underline min-h-[44px] px-2"
                        >
                          Force Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: VENDORS (ONBOARDING APPLICATIONS + HOURS & GATE REACH) */}
      {activeTab === 'vendors' && (
        <div className="space-y-6">
          {/* Onboarding Applications Queue */}
          <section
            aria-label="Vendor onboarding applications"
            className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900 space-y-3"
          >
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-stone-600 dark:text-stone-400">
              Vendor Onboarding Applications ({applicationsList.filter((a) => a.status === 'pending').length} pending)
            </h2>
            {applicationsList.length === 0 ? (
              <p className="text-xs text-stone-600 dark:text-stone-400">No onboarding inquiries submitted yet.</p>
            ) : (
              <div className="space-y-2">
                {applicationsList.map((app) => (
                  <div
                    key={app.id}
                    data-application-name={app.vendorName}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-stone-200 bg-stone-50 p-3 text-xs dark:border-stone-800 dark:bg-stone-850"
                  >
                    <div>
                      <span className="font-bold text-stone-900 dark:text-stone-100">{app.vendorName}</span>
                      <span className="ml-2 text-stone-600 dark:text-stone-400">• {app.shopType}</span>
                      <span className="ml-2 font-mono text-stone-600 dark:text-stone-400">• {app.phone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={app.status === 'approved' ? 'success' : 'warning'}>{app.status}</Badge>
                      {app.status !== 'approved' && (
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => void handleApplicationAction(app.id, 'approved')}
                          className="min-h-[44px]"
                        >
                          Approve &amp; Onboard
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Active / Existing Vendors */}
          <div className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold">Campus Canteens &amp; Vendors</h3>
              <Button onClick={() => setInviteModalOpen(true)} size="sm" className="min-h-[44px]">
                + Invite Vendor
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-stone-100 text-stone-600 dark:text-stone-400 uppercase tracking-wider dark:border-stone-800">
                  <tr>
                    <th className="py-2.5">Name</th>
                    <th>Hours</th>
                    <th>Gate Reach</th>
                    <th>Prep</th>
                    <th>Status</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                  {vendorsList.map((v) => {
                    const hrs = parseVendorHours(v.hoursJson);
                    return (
                      <tr key={v.id}>
                        <td className="py-3">
                          <div className="font-bold text-stone-900 dark:text-stone-100">{v.name}</div>
                          <div className="text-[10px] font-mono text-stone-600 dark:text-stone-400">FSSAI {v.fssaiNo}</div>
                        </td>
                        <td className="font-mono">
                          {hrs.open}–{hrs.close}
                        </td>
                        <td>
                          <span className="font-mono font-semibold text-stone-700 dark:text-stone-300">
                            {v.gateReach.length} gates
                          </span>
                        </td>
                        <td>~{v.prepMinutes}m</td>
                        <td>
                          <Badge variant={v.status === 'active' ? 'success' : 'danger'}>{v.status}</Badge>
                        </td>
                        <td className="text-right space-x-2">
                          <button
                            type="button"
                            onClick={() => openEditVendorModal(v)}
                            className="inline-flex items-center gap-1 min-h-[44px] px-2 text-xs font-bold text-[#830020] dark:text-[#FFB400] hover:underline"
                          >
                            <Settings2 className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>Edit Hours &amp; Gates</span>
                          </button>
                          {v.status === 'active' ? (
                            <button
                              type="button"
                              onClick={() => void handleVendorStatus(v.id, 'suspended')}
                              className="min-h-[44px] px-2 text-xs font-bold text-red-700 dark:text-red-300 hover:underline"
                            >
                              Suspend
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => void handleVendorStatus(v.id, 'active')}
                              className="min-h-[44px] px-2 text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:underline"
                            >
                              Approve
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: GATES & CURFEWS (EDIT HOURS + TEMPORARY CLOSURE WITH BROADCAST) */}
      {activeTab === 'gates' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-base font-bold">Hostel Gates &amp; Curfew Settings</h3>
            <Button onClick={() => setFestivalModalOpen(true)} variant="secondary" size="sm" className="min-h-[44px]">
              Festival / Holiday Override
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {gatesList.map((gate) => {
              const draft = gateSettingDrafts[gate.id] || {
                curfewTime: gate.curfewTime,
                bufferMinutes: gate.bufferMinutes,
                travelMinutes: gate.travelMinutes,
              };
              return (
                <div
                  key={gate.id}
                  data-admin-gate={gate.name}
                  className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900 space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-bold text-sm text-stone-900 dark:text-stone-100">{gate.name}</h4>
                    <Badge variant={gate.active ? 'success' : 'danger'}>
                      {gate.active ? 'Active' : 'Closed'}
                    </Badge>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <label htmlFor={`gate-curfew-${gate.id}`} className="text-stone-600 dark:text-stone-400 font-semibold">
                        Curfew Time:
                      </label>
                      <input
                        id={`gate-curfew-${gate.id}`}
                        type="text"
                        value={draft.curfewTime}
                        onChange={(e) =>
                          setGateSettingDrafts((prev) => ({
                            ...prev,
                            [gate.id]: { ...draft, curfewTime: e.target.value },
                          }))
                        }
                        className="min-h-[44px] w-20 rounded-xl border border-stone-300 px-2 text-center font-mono font-bold dark:border-stone-700 dark:bg-stone-800"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <label htmlFor={`gate-buffer-${gate.id}`} className="text-stone-600 dark:text-stone-400 font-semibold">
                        Buffer (mins):
                      </label>
                      <input
                        id={`gate-buffer-${gate.id}`}
                        type="number"
                        min={0}
                        max={60}
                        value={draft.bufferMinutes}
                        onChange={(e) =>
                          setGateSettingDrafts((prev) => ({
                            ...prev,
                            [gate.id]: { ...draft, bufferMinutes: Number(e.target.value) || 0 },
                          }))
                        }
                        className="min-h-[44px] w-20 rounded-xl border border-stone-300 px-2 text-center font-mono font-bold dark:border-stone-700 dark:bg-stone-800"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <label htmlFor={`gate-travel-${gate.id}`} className="text-stone-600 dark:text-stone-400 font-semibold">
                        Travel (mins):
                      </label>
                      <input
                        id={`gate-travel-${gate.id}`}
                        type="number"
                        min={0}
                        max={60}
                        value={draft.travelMinutes}
                        onChange={(e) =>
                          setGateSettingDrafts((prev) => ({
                            ...prev,
                            [gate.id]: { ...draft, travelMinutes: Number(e.target.value) || 0 },
                          }))
                        }
                        className="min-h-[44px] w-20 rounded-xl border border-stone-300 px-2 text-center font-mono font-bold dark:border-stone-700 dark:bg-stone-800"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => void handleSaveGateSettings(gate)}
                      className="flex-1 min-h-[44px]"
                    >
                      Save Hours
                    </Button>
                    <Button
                      size="sm"
                      variant={gate.active ? 'danger' : 'primary'}
                      onClick={() => {
                        setGateClosureTarget(gate);
                        setGateBannerText(
                          gate.active
                            ? `Temporary Gate Closure: ${gate.name} closed temporarily due to maintenance.`
                            : `Gate Reopened: ${gate.name} is open again for NIT Patna deliveries.`
                        );
                      }}
                      className="min-h-[44px]"
                    >
                      {gate.active ? 'Temp Close + Banner' : 'Reopen Gate'}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 5: COUPONS MANAGER */}
      {activeTab === 'coupons' && (
        <AdminCouponsTab
          coupons={couponsList}
          onToggleCoupon={handleToggleCoupon}
          onCreateCoupon={handleCreateCoupon}
        />
      )}

      {/* TAB 6: REPORTS QUEUE */}
      {activeTab === 'reports' && (
        <AdminReportsTab
          reports={adminReports}
          onRefresh={() => void loadReports()}
          onResolve={handleResolveReport}
        />
      )}

      {/* TAB 7: SETTLEMENT BY VENDOR & DAY */}
      {activeTab === 'settlements' && (
        <AdminSettlementsTab
          settlements={settlementsList}
          vendors={vendorsList}
          vendorFilter={settlementVendorFilter}
          dateFilter={settlementDateFilter}
          onChangeFilters={(v, d) => {
            setSettlementVendorFilter(v);
            setSettlementDateFilter(d);
            void loadSettlements(v, d);
          }}
          onExportCsv={exportSettlementCsv}
        />
      )}

      {/* TAB 8: ANNOUNCEMENTS */}
      {activeTab === 'announcements' && (
        <AdminAnnouncementsTab
          announcements={announcementsList}
          onNewBanner={() => setAnnouncementModalOpen(true)}
          onToggleBanner={async (id, active) => {
            const res = await fetch(`/api/admin/announcements/${id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ active }),
            });
            if (res.ok) {
              showToast(active ? 'Banner visible to students' : 'Banner hidden', 'info');
              void loadAnnouncements();
            }
          }}
        />
      )}

      {/* TAB 9: AUDIT LOG */}
      {activeTab === 'audit' && (
        <AdminAuditTab
          logs={auditLogs}
          actionFilter={auditActionFilter}
          onChangeFilter={(act) => {
            setAuditActionFilter(act);
            void loadAudit(act);
          }}
          onRefresh={() => void loadAudit()}
        />
      )}

      {/* Vendor Hours & Gate Reach Dialog */}
      <Dialog
        open={Boolean(editingVendor)}
        onClose={() => setEditingVendor(null)}
        title={`Edit Hours & Gates • ${editingVendor?.name || ''}`}
        description="Configure opening/closing IST hours, promised prep time, and reachable hostel gates."
      >
        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label htmlFor="vendor-edit-open" className="text-xs font-bold block mb-1">
                Opens (IST)
              </label>
              <input
                id="vendor-edit-open"
                type="text"
                value={vendorOpenHour}
                onChange={(e) => setVendorOpenHour(e.target.value)}
                className="min-h-[44px] w-full rounded-xl border border-stone-300 px-3 font-mono text-xs dark:border-stone-700 dark:bg-stone-850"
              />
            </div>
            <div>
              <label htmlFor="vendor-edit-close" className="text-xs font-bold block mb-1">
                Closes (IST)
              </label>
              <input
                id="vendor-edit-close"
                type="text"
                value={vendorCloseHour}
                onChange={(e) => setVendorCloseHour(e.target.value)}
                className="min-h-[44px] w-full rounded-xl border border-stone-300 px-3 font-mono text-xs dark:border-stone-700 dark:bg-stone-850"
              />
            </div>
            <div>
              <label htmlFor="vendor-edit-prep" className="text-xs font-bold block mb-1">
                Prep (mins)
              </label>
              <input
                id="vendor-edit-prep"
                type="number"
                min={5}
                max={90}
                value={vendorPrepDraft}
                onChange={(e) => setVendorPrepDraft(e.target.value)}
                className="min-h-[44px] w-full rounded-xl border border-stone-300 px-3 font-mono text-xs dark:border-stone-700 dark:bg-stone-850"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-bold">Reachable Campus Gates &amp; Extra Travel Time</div>
            {gatesList.map((g) => {
              const cfg = vendorGateSelection[g.id] || { enabled: false, extraMinutes: 0 };
              return (
                <div
                  key={g.id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-stone-200 px-3 py-2 text-xs dark:border-stone-800"
                >
                  <label className="flex items-center gap-2 font-semibold">
                    <input
                      type="checkbox"
                      checked={cfg.enabled}
                      onChange={(e) =>
                        setVendorGateSelection((prev) => ({
                          ...prev,
                          [g.id]: { ...cfg, enabled: e.target.checked },
                        }))
                      }
                      className="h-4 w-4 rounded"
                    />
                    <span>{g.name}</span>
                  </label>
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] text-stone-600 dark:text-stone-400">+mins:</span>
                    <input
                      type="number"
                      min={0}
                      max={60}
                      disabled={!cfg.enabled}
                      value={cfg.extraMinutes}
                      onChange={(e) =>
                        setVendorGateSelection((prev) => ({
                          ...prev,
                          [g.id]: { ...cfg, extraMinutes: Number(e.target.value) || 0 },
                        }))
                      }
                      aria-label={`Extra travel minutes for ${g.name}`}
                      className="min-h-[44px] w-16 rounded-lg border border-stone-300 px-2 text-center font-mono text-xs dark:border-stone-700 dark:bg-stone-850"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setEditingVendor(null)} className="min-h-[44px]">
              Cancel
            </Button>
            <Button variant="primary" onClick={() => void handleSaveVendorDetails()} className="min-h-[44px]">
              Save Vendor Config
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Gate Temp Closure + Broadcast Banner Dialog */}
      <Dialog
        open={Boolean(gateClosureTarget)}
        onClose={() => setGateClosureTarget(null)}
        title={
          gateClosureTarget?.active
            ? `Temporarily Close ${gateClosureTarget.name}?`
            : `Reopen ${gateClosureTarget?.name || ''}?`
        }
        description="Updates gate availability immediately and broadcasts an announcement banner to students."
      >
        <div className="space-y-4 pt-2">
          <div>
            <label htmlFor="gate-closure-banner-input" className="text-xs font-bold block mb-1">
              Student Broadcast Message
            </label>
            <textarea
              id="gate-closure-banner-input"
              rows={3}
              value={gateBannerText}
              onChange={(e) => setGateBannerText(e.target.value)}
              className="w-full rounded-xl border border-stone-300 p-3 text-xs dark:border-stone-700 dark:bg-stone-850"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setGateClosureTarget(null)} className="min-h-[44px]">
              Cancel
            </Button>
            <Button
              variant={gateClosureTarget?.active ? 'danger' : 'primary'}
              onClick={() => void handleConfirmGateClosure()}
              className="min-h-[44px]"
            >
              {gateClosureTarget?.active ? 'Close Gate & Broadcast' : 'Reopen & Broadcast'}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Festival Override Modal */}
      <Dialog
        open={festivalModalOpen}
        onClose={() => setFestivalModalOpen(false)}
        title="Campus Festival / Holiday Override"
        description="Close campus gates for festival dates (e.g., Chhath Puja). Changes take effect immediately across all student screens."
      >
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label htmlFor="festival-name-input" className="text-xs font-semibold">
              Festival Name
            </label>
            <input
              id="festival-name-input"
              type="text"
              value={festivalName}
              onChange={(e) => setFestivalName(e.target.value)}
              className="min-h-[44px] w-full rounded-xl border border-stone-300 px-3 text-xs dark:border-stone-700 dark:bg-stone-850"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="festival-action-select" className="text-xs font-semibold">
              Action
            </label>
            <select
              id="festival-action-select"
              value={festivalCloseAll ? 'close' : 'reopen'}
              onChange={(e) => setFestivalCloseAll(e.target.value === 'close')}
              className="min-h-[44px] w-full rounded-xl border border-stone-300 px-3 text-xs dark:border-stone-700 dark:bg-stone-850"
            >
              <option value="close">Close All Campus Gates</option>
              <option value="reopen">Reopen Campus Gates</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setFestivalModalOpen(false)} className="min-h-[44px]">
              Cancel
            </Button>
            <Button variant="danger" onClick={() => void handleFestivalOverride()} className="min-h-[44px]">
              Apply Override
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Announcement Banner Modal */}
      <Dialog
        open={announcementModalOpen}
        onClose={() => setAnnouncementModalOpen(false)}
        title="Post Campus Announcement"
        description="Shown as a sticky notice bar to all students browsing TreFood."
      >
        <div className="space-y-4 pt-2">
          <textarea
            rows={3}
            placeholder="e.g. Main Gate deliveries closing at 22:00 tonight for campus event..."
            value={announcementText}
            onChange={(e) => setAnnouncementText(e.target.value)}
            className="w-full rounded-xl border border-stone-300 p-2.5 text-xs dark:border-stone-700 dark:bg-stone-850"
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setAnnouncementModalOpen(false)} className="min-h-[44px]">
              Cancel
            </Button>
            <Button variant="primary" onClick={() => void handleCreateAnnouncement()} className="min-h-[44px]">
              Publish Announcement
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Order Timeline Modal */}
      <Dialog
        open={Boolean(selectedOrderId)}
        onClose={() => setSelectedOrderId(null)}
        title={`Order Timeline #${selectedOrderId?.slice(-6) || ''}`}
        description="Event log and audit transitions for this order."
      >
        <div className="space-y-3 pt-2">
          <div className="divide-y divide-stone-100 dark:divide-stone-800 text-xs">
            {selectedOrderTimeline?.map((ev) => (
              <div key={ev.id} className="py-2 flex justify-between items-center">
                <div>
                  <span className="font-bold capitalize">{ev.status}</span>
                  {ev.note && <div className="text-stone-600 dark:text-stone-400 text-[11px]">{ev.note}</div>}
                </div>
                <span className="font-mono text-stone-600 dark:text-stone-400">
                  {new Date(ev.at * 1000).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })}
                </span>
              </div>
            ))}
          </div>
          <div className="flex justify-end pt-2">
            <Button variant="secondary" size="sm" onClick={() => setSelectedOrderId(null)} className="min-h-[44px]">
              Close
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Force Cancel Dialog */}
      <Dialog
        open={Boolean(forceCancelId)}
        onClose={() => setForceCancelId(null)}
        title="Force Cancel Order?"
        description="This will cancel the order immediately and log an administrative audit event."
      >
        <div className="space-y-4 pt-2">
          <input
            type="text"
            placeholder="Reason for force cancellation"
            value={forceCancelReason}
            onChange={(e) => setForceCancelReason(e.target.value)}
            className="min-h-[44px] w-full rounded-xl border border-stone-300 p-2.5 text-xs dark:border-stone-700 dark:bg-stone-850"
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setForceCancelId(null)} className="min-h-[44px]">
              Cancel
            </Button>
            <Button variant="danger" onClick={() => void handleForceCancel()} className="min-h-[44px]">
              Confirm Force Cancel
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Invite Vendor Dialog */}
      <Dialog
        open={inviteModalOpen}
        onClose={() => {
          setInviteModalOpen(false);
          setLastInviteLink(null);
        }}
        title="Invite Campus Vendor"
        description="Create credentials and onboarding link for a new campus canteen."
      >
        <div className="space-y-4 pt-2">
          <input
            type="text"
            placeholder="Canteen Name (e.g. Kaveri Snacks)"
            value={inviteName}
            onChange={(e) => setInviteName(e.target.value)}
            className="min-h-[44px] w-full rounded-xl border border-stone-300 p-2.5 text-xs dark:border-stone-700 dark:bg-stone-850"
          />
          <input
            type="email"
            placeholder="Vendor Email (e.g. kaveri@vendor.nitp.ac.in)"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            className="min-h-[44px] w-full rounded-xl border border-stone-300 p-2.5 text-xs dark:border-stone-700 dark:bg-stone-850"
          />

          {lastInviteLink && (
            <div className="rounded-xl bg-emerald-50 p-3 text-xs text-emerald-900 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-200">
              <span className="font-bold">One-Time Onboarding Link (DEMO_MODE):</span>
              <div className="font-mono text-[11px] break-all pt-1 select-all">{lastInviteLink}</div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setInviteModalOpen(false);
                setLastInviteLink(null);
              }}
              className="min-h-[44px]"
            >
              Close
            </Button>
            <Button variant="primary" onClick={() => void handleInviteVendor()} className="min-h-[44px]">
              Send Invite
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

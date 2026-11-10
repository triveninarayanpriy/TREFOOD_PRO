import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Dialog } from '../../components/ui/Dialog';
import { useToast } from '../../components/ui/Toast';
import { useSeoHead } from '../../components/seo/SeoHead';
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
} from 'lucide-react';

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
        className="w-full h-36 select-none"
        aria-label="Orders per hour distribution chart"
      >
        <line x1="0" y1={height} x2={width} y2={height} stroke="#E7E5E4" strokeWidth="1" />
        {data.map((val, idx) => {
          const barHeight = Math.max((val / max) * (height - 20), 4);
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
                className="fill-[#830020] hover:fill-[#F2A900] transition-colors cursor-pointer"
              >
                <title>{`${labels[idx]}: ${val} orders`}</title>
              </rect>
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
                className="text-[9px] font-mono fill-stone-400"
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

export function AdminConsolePage() {
  useSeoHead({
    title: 'Campus Admin Console (/admin) | TreFood NIT Patna',
    description: 'Campus operations dashboard for gate curfews, vendor approvals, reports, and audit logs.',
    path: '/admin',
    noIndex: true,
  });
  const { user, loginAsDemo, loading: authLoading } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'overview' | 'vendors' | 'gates' | 'orders' | 'announcements' | 'audit'>('overview');

  // Overview metrics
  const [metrics, setMetrics] = useState<any>(null);

  // Vendors
  const [vendorsList, setVendorsList] = useState<any[]>([]);

  // Gates
  const [gatesList, setGatesList] = useState<any[]>([]);

  // Orders
  const [adminOrders, setAdminOrders] = useState<any[]>([]);
  const [selectedOrderTimeline, setSelectedOrderTimeline] = useState<any[] | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  // Force cancel
  const [forceCancelId, setForceCancelId] = useState<string | null>(null);
  const [forceCancelReason, setForceCancelReason] = useState('Campus administrative shutdown');

  // Festival override modal
  const [festivalModalOpen, setFestivalModalOpen] = useState(false);
  const [festivalName, setFestivalName] = useState('Chhath Puja');
  const [festivalCloseAll, setFestivalCloseAll] = useState(true);

  // Announcement modal
  const [announcementModalOpen, setAnnouncementModalOpen] = useState(false);
  const [announcementText, setAnnouncementText] = useState('');

  // Vendor Invite modal
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [lastInviteLink, setLastInviteLink] = useState<string | null>(null);

  // Audit logs
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Load metrics
  const loadMetrics = async () => {
    try {
      const res = await fetch('/api/admin/metrics');
      if (res.ok) {
        const data = (await res.json()) as any;
        setMetrics(data.metrics);
      }
    } catch {}
  };

  // Load vendors
  const loadVendors = async () => {
    try {
      const res = await fetch('/api/admin/vendors');
      if (res.ok) {
        const data = (await res.json()) as any;
        setVendorsList(data.vendors || []);
      }
    } catch {}
  };

  // Load gates
  const loadGates = async () => {
    try {
      const res = await fetch('/api/admin/gates');
      if (res.ok) {
        const data = (await res.json()) as any;
        setGatesList(data.gates || []);
      }
    } catch {}
  };

  // Load orders
  const loadOrders = async () => {
    try {
      const res = await fetch('/api/admin/orders');
      if (res.ok) {
        const data = (await res.json()) as any;
        setAdminOrders(data.orders || []);
      }
    } catch {}
  };

  // Load audit log
  const loadAudit = async () => {
    try {
      const res = await fetch('/api/admin/audit-log');
      if (res.ok) {
        const data = (await res.json()) as any;
        setAuditLogs(data.logs || []);
      }
    } catch {}
  };

  useEffect(() => {
    if (user?.role === 'admin') {
      loadMetrics();
      loadVendors();
      loadGates();
      loadOrders();
    }
  }, [user]);

  // Vendor status approve / suspend
  const handleVendorStatus = async (vendorId: string, status: 'active' | 'suspended') => {
    try {
      const res = await fetch(`/api/admin/vendors/${vendorId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        showToast(`Vendor marked ${status}`, 'success');
        loadVendors();
      }
    } catch {}
  };

  // Gate curfew / active update
  const handleGateCurfew = async (gateId: string, curfewTime: string) => {
    try {
      const res = await fetch(`/api/admin/gates/${gateId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ curfewTime }),
      });
      if (res.ok) {
        showToast('Curfew updated!', 'success');
        loadGates();
      }
    } catch {}
  };

  // Festival override
  const handleFestivalOverride = async () => {
    try {
      const res = await fetch('/api/admin/gates/festival-override', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          festivalName,
          active: !festivalCloseAll, // if festivalCloseAll is true, gates are marked active: false
        }),
      });
      if (res.ok) {
        showToast(`Festival override applied for ${festivalName}`, 'success');
        setFestivalModalOpen(false);
        loadGates();
      }
    } catch {}
  };

  // Force cancel order
  const handleForceCancel = async () => {
    if (!forceCancelId) return;
    try {
      const res = await fetch(`/api/admin/orders/${forceCancelId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: forceCancelReason }),
      });
      if (res.ok) {
        showToast('Order force-cancelled', 'info');
        setForceCancelId(null);
        loadOrders();
      }
    } catch {}
  };

  // View order timeline
  const handleViewTimeline = async (orderId: string) => {
    setSelectedOrderId(orderId);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/timeline`);
      if (res.ok) {
        const data = (await res.json()) as any;
        setSelectedOrderTimeline(data.events || []);
      }
    } catch {}
  };

  // Create announcement
  const handleCreateAnnouncement = async () => {
    if (!announcementText.trim()) return;
    try {
      const res = await fetch('/api/admin/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: announcementText }),
      });
      if (res.ok) {
        showToast('Campus announcement banner published', 'success');
        setAnnouncementModalOpen(false);
        setAnnouncementText('');
      }
    } catch {}
  };

  // Invite Vendor
  const handleInviteVendor = async () => {
    if (!inviteEmail.trim() || !inviteName.trim()) return;
    try {
      const res = await fetch('/api/admin/vendors/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, name: inviteName }),
      });
      if (res.ok) {
        const data = (await res.json()) as any;
        setLastInviteLink(data.inviteLink);
        showToast('Vendor invited successfully', 'success');
      }
    } catch {}
  };

  // Loading guard
  if (authLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#830020] border-t-transparent dark:border-amber-400" />
      </div>
    );
  }

  // Role guard
  if (!user || user.role !== 'admin') {
    return (
      <div className="mx-auto max-w-md px-4 py-16 space-y-4 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200">
          <Lock className="h-7 w-7 text-red-600 dark:text-red-400" />
        </div>
        <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100">
          Admin Portal (403 Forbidden)
        </h2>
        <p className="text-xs text-stone-600 dark:text-stone-400">
          Sign-in is required with an administrator account to view campus management controls.
        </p>
        <div className="pt-4">
          <Button
            onClick={async () => {
              const res = await loginAsDemo('admin');
              if (res.ok) {
                showToast('Signed in as Campus Administrator', 'success');
              }
            }}
            variant="primary"
            className="w-full min-h-[48px] text-sm font-bold"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            1-Tap Login as Admin (admin@demo.trefood.test)
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 space-y-6">
      {/* Admin Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-200 pb-4 dark:border-stone-800">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#830020] text-amber-400 font-bold">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
              TreFood Campus Administration
            </h1>
            <p className="text-xs text-stone-500">
              NIT Patna Operations • Gates, Vendors, Curfews & Festivals
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap items-center gap-1.5 rounded-xl bg-stone-100 p-1 dark:bg-stone-850">
          {[
            { id: 'overview', label: 'Overview', icon: <BarChart3 className="h-3.5 w-3.5" /> },
            { id: 'vendors', label: 'Vendors', icon: <Store className="h-3.5 w-3.5" /> },
            { id: 'gates', label: 'Gates & Curfews', icon: <MapPin className="h-3.5 w-3.5" /> },
            { id: 'orders', label: 'Orders Monitor', icon: <FileText className="h-3.5 w-3.5" /> },
            { id: 'announcements', label: 'Announcements', icon: <Megaphone className="h-3.5 w-3.5" /> },
            { id: 'audit', label: 'Audit Log', icon: <History className="h-3.5 w-3.5" /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                if (tab.id === 'audit') loadAudit();
                if (tab.id === 'orders') loadOrders();
              }}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                activeTab === tab.id
                  ? 'bg-white text-stone-900 shadow-xs dark:bg-stone-700 dark:text-stone-100'
                  : 'text-stone-500 hover:text-stone-900 dark:text-stone-400'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: 'Total Orders', val: metrics?.totalOrders || 0 },
              { label: 'Delivered', val: metrics?.deliveredOrders || 0 },
              { label: 'GMV (₹)', val: `₹${(metrics?.totalRevenueRupees || 0).toFixed(0)}` },
              { label: 'Active Vendors', val: metrics?.activeVendorsCount || 0 },
              { label: 'Acceptance Rate', val: `${metrics?.acceptanceRate || 100}%` },
              { label: 'Median Delivery', val: `${metrics?.medianDeliveryMinutes || 18}m` },
            ].map((stat, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-stone-200 bg-white p-4 text-center dark:border-stone-800 dark:bg-stone-900"
              >
                <div className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                  {stat.label}
                </div>
                <div className="mt-1 font-mono text-2xl font-black text-[#830020] dark:text-amber-400">
                  {stat.val}
                </div>
              </div>
            ))}
          </div>

          {/* Hand-written SVG Orders per hour chart */}
          <div className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                  Hourly Orders Volume
                </h3>
                <p className="text-xs text-stone-500">Distribution across campus daytime & evening slots</p>
              </div>
              <span className="text-xs font-mono font-semibold text-emerald-600">Peak: 12h & 20h</span>
            </div>
            <OrdersPerHourSvgChart data={metrics?.hourlyDistribution || [2, 0, 0, 1, 3, 5, 8, 4, 3, 6, 9, 4]} />
          </div>

          {/* Quick Action Bar */}
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => setFestivalModalOpen(true)} variant="secondary" size="sm">
              <AlertTriangle className="mr-1.5 h-4 w-4 text-amber-600" />
              Festival Override (Chhath Puja / Holiday)
            </Button>
            <Button onClick={() => setAnnouncementModalOpen(true)} variant="secondary" size="sm">
              <Megaphone className="mr-1.5 h-4 w-4 text-blue-600" />
              Post Student Banner
            </Button>
            <Button onClick={() => setInviteModalOpen(true)} variant="secondary" size="sm">
              <Plus className="mr-1.5 h-4 w-4" />
              Invite New Vendor
            </Button>
          </div>
        </div>
      )}

      {/* TAB 2: VENDORS */}
      {activeTab === 'vendors' && (
        <div className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold">Campus Canteens & Vendors</h3>
            <Button onClick={() => setInviteModalOpen(true)} size="sm">
              + Invite Vendor
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-stone-100 text-stone-400 uppercase tracking-wider dark:border-stone-800">
                <tr>
                  <th className="py-2.5">Name</th>
                  <th>Category</th>
                  <th>FSSAI</th>
                  <th>Prep Time</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                {vendorsList.map((v) => (
                  <tr key={v.id} className="py-2">
                    <td className="py-3 font-bold text-stone-900 dark:text-stone-100">{v.name}</td>
                    <td className="capitalize">{v.category}</td>
                    <td className="font-mono">{v.fssaiNo}</td>
                    <td>~{v.prepMinutes} mins</td>
                    <td>
                      <Badge variant={v.status === 'active' ? 'success' : 'danger'}>
                        {v.status}
                      </Badge>
                    </td>
                    <td className="text-right space-x-2">
                      {v.status === 'active' ? (
                        <button
                          onClick={() => handleVendorStatus(v.id, 'suspended')}
                          className="text-xs font-semibold text-red-600 hover:underline"
                        >
                          Suspend
                        </button>
                      ) : (
                        <button
                          onClick={() => handleVendorStatus(v.id, 'active')}
                          className="text-xs font-semibold text-emerald-600 hover:underline"
                        >
                          Approve
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

      {/* TAB 3: GATES & CURFEWS */}
      {activeTab === 'gates' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold">Hostel Gates & Curfew Settings</h3>
            <Button onClick={() => setFestivalModalOpen(true)} variant="secondary" size="sm">
              Festival / Holiday Override
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {gatesList.map((gate) => (
              <div
                key={gate.id}
                className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-stone-900 dark:text-stone-100">{gate.name}</h4>
                  <Badge variant={gate.active ? 'success' : 'danger'}>
                    {gate.active ? 'Active' : 'Closed'}
                  </Badge>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-stone-500">Curfew Time:</span>
                    <input
                      type="text"
                      defaultValue={gate.curfewTime}
                      onBlur={(e) => handleGateCurfew(gate.id, e.target.value)}
                      className="w-16 rounded border border-stone-300 px-1.5 py-0.5 text-center font-mono font-bold dark:border-stone-700 dark:bg-stone-800"
                    />
                  </div>
                  <div className="flex justify-between text-stone-500">
                    <span>Buffer Minutes:</span>
                    <span className="font-mono">{gate.bufferMinutes} mins</span>
                  </div>
                  <div className="flex justify-between text-stone-500">
                    <span>Travel Minutes:</span>
                    <span className="font-mono">{gate.travelMinutes} mins</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: ORDERS MONITOR */}
      {activeTab === 'orders' && (
        <div className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold">Live Orders Monitor</h3>
            <Button onClick={loadOrders} variant="secondary" size="sm">
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              Refresh
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-stone-100 text-stone-400 uppercase tracking-wider dark:border-stone-800">
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
                  <tr key={o.id} className="py-2">
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
                        onClick={() => handleViewTimeline(o.id)}
                        className="text-xs font-semibold text-blue-600 hover:underline"
                      >
                        Timeline
                      </button>
                      {o.status !== 'delivered' && o.status !== 'cancelled' && (
                        <button
                          onClick={() => setForceCancelId(o.id)}
                          className="text-xs font-semibold text-red-600 hover:underline"
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

      {/* TAB 5: ANNOUNCEMENTS */}
      {activeTab === 'announcements' && (
        <div className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold">Campus Announcements</h3>
              <p className="text-xs text-stone-500">
                Broadcast alerts or curfew notices directly to students across the app
              </p>
            </div>
            <Button onClick={() => setAnnouncementModalOpen(true)} size="sm">
              + New Banner
            </Button>
          </div>

          <div className="space-y-2">
            <div className="rounded-xl bg-amber-50 p-3.5 border border-amber-200 text-xs text-amber-900 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-200 flex items-start gap-2">
              <Megaphone className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
              <div>
                <span className="font-bold">Active Broadcast:</span> TreFood campus deliveries open till hostel curfews. Zero delivery fees across all gates!
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: AUDIT LOG */}
      {activeTab === 'audit' && (
        <div className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold">Security & Mutation Audit Log</h3>
            <Button onClick={loadAudit} variant="secondary" size="sm">
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              Refresh
            </Button>
          </div>

          <div className="space-y-2 font-mono text-xs">
            {auditLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-start justify-between rounded-xl bg-stone-50 p-3 dark:bg-stone-850 border border-stone-100 dark:border-stone-800"
              >
                <div>
                  <span className="font-bold text-[#830020] dark:text-amber-400">
                    {log.action}
                  </span>
                  <span className="ml-2 text-stone-500">Target: {log.targetType} ({log.targetId})</span>
                  {log.detailsJson && (
                    <div className="mt-1 text-[11px] text-stone-600 dark:text-stone-400 font-sans">
                      {log.detailsJson}
                    </div>
                  )}
                </div>
                <span className="text-stone-400 text-[10px] shrink-0">
                  {new Date(log.at * 1000).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Festival Override Modal */}
      <Dialog
        open={festivalModalOpen}
        onClose={() => setFestivalModalOpen(false)}
        title="Campus Festival / Holiday Override"
        description="Close campus gates for festival dates (e.g., Chhath Puja). Changes take effect immediately across all student screens."
      >
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold">Festival Name</label>
            <input
              type="text"
              value={festivalName}
              onChange={(e) => setFestivalName(e.target.value)}
              className="h-10 w-full rounded-xl border border-stone-300 px-3 text-xs dark:border-stone-700 dark:bg-stone-850"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold">Action</label>
            <select
              value={festivalCloseAll ? 'close' : 'reopen'}
              onChange={(e) => setFestivalCloseAll(e.target.value === 'close')}
              className="h-10 w-full rounded-xl border border-stone-300 px-3 text-xs dark:border-stone-700 dark:bg-stone-850"
            >
              <option value="close">Close All Campus Gates</option>
              <option value="reopen">Reopen Campus Gates</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setFestivalModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleFestivalOverride}>
              Apply Override
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Post Announcement Modal */}
      <Dialog
        open={announcementModalOpen}
        onClose={() => setAnnouncementModalOpen(false)}
        title="Broadcast Announcement"
        description="Write a message to show on student apps."
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
            <Button variant="ghost" onClick={() => setAnnouncementModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreateAnnouncement}>
              Publish Announcement
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Order Timeline Modal */}
      <Dialog
        open={!!selectedOrderId}
        onClose={() => setSelectedOrderId(null)}
        title={`Order Timeline #${selectedOrderId?.slice(-6)}`}
        description="Event log and audit transitions for this order."
      >
        <div className="space-y-3 pt-2">
          <div className="divide-y divide-stone-100 dark:divide-stone-800 text-xs">
            {selectedOrderTimeline?.map((ev) => (
              <div key={ev.id} className="py-2 flex justify-between items-center">
                <div>
                  <span className="font-bold capitalize">{ev.status}</span>
                  {ev.note && <div className="text-stone-500 text-[11px]">{ev.note}</div>}
                </div>
                <span className="font-mono text-stone-400">
                  {new Date(ev.at * 1000).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
          <div className="flex justify-end pt-2">
            <Button variant="secondary" size="sm" onClick={() => setSelectedOrderId(null)}>
              Close
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Force Cancel Dialog */}
      <Dialog
        open={!!forceCancelId}
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
            className="w-full rounded-xl border border-stone-300 p-2.5 text-xs dark:border-stone-700 dark:bg-stone-850"
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setForceCancelId(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleForceCancel}>
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
            className="w-full rounded-xl border border-stone-300 p-2.5 text-xs dark:border-stone-700 dark:bg-stone-850"
          />
          <input
            type="email"
            placeholder="Vendor Email (e.g. kaveri@vendor.nitp.ac.in)"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            className="w-full rounded-xl border border-stone-300 p-2.5 text-xs dark:border-stone-700 dark:bg-stone-850"
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
            >
              Close
            </Button>
            <Button variant="primary" onClick={handleInviteVendor}>
              Send Invite
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

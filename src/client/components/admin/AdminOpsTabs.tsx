import { useState } from 'react';
import {
  Tag,
  Plus,
  RefreshCw,
  Download,
  Megaphone,
  CheckCircle2,
  XCircle,
  CreditCard,
  History,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Dialog } from '../ui/Dialog';
import type {
  AdminCoupon,
  AdminReport,
  AdminSettlementRow,
  AdminVendor,
  AdminAnnouncement,
  AdminAuditEntry,
} from './AdminTypes';

/* ---------------- COUPONS MANAGER TAB ---------------- */
export function AdminCouponsTab({
  coupons,
  onToggleCoupon,
  onCreateCoupon,
}: {
  coupons: AdminCoupon[];
  onToggleCoupon: (id: string, active: boolean) => Promise<void>;
  onCreateCoupon: (payload: {
    code: string;
    description: string;
    discountType: 'percent' | 'flat';
    discountValue: number;
    minOrderPaise: number;
    newUsersOnly: boolean;
  }) => Promise<boolean>;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [discountType, setDiscountType] = useState<'percent' | 'flat'>('flat');
  const [discountRupeesOrPct, setDiscountRupeesOrPct] = useState('20');
  const [minOrderRupees, setMinOrderRupees] = useState('99');
  const [newUsersOnly, setNewUsersOnly] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const val = Number.parseInt(discountRupeesOrPct, 10) || 10;
    const minPaise = (Number.parseInt(minOrderRupees, 10) || 0) * 100;
    const ok = await onCreateCoupon({
      code: code.trim().toUpperCase(),
      description: description.trim(),
      discountType,
      discountValue: discountType === 'flat' ? val * 100 : Math.min(100, val),
      minOrderPaise: minPaise,
      newUsersOnly,
    });
    setSubmitting(false);
    if (ok) {
      setCode('');
      setDescription('');
      setModalOpen(false);
    }
  };

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-extrabold text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <Tag className="h-4 w-4 text-[#830020] dark:text-[#FFB400]" aria-hidden="true" />
            <span>Campus Coupon Manager ({coupons.length})</span>
          </h2>
          <p className="text-xs text-stone-500">Create promo codes and toggle campaign availability immediately.</p>
        </div>
        <Button size="sm" onClick={() => setModalOpen(true)} className="min-h-[44px]">
          <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
          Create Coupon
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-stone-100 text-stone-500 uppercase tracking-wider dark:border-stone-800">
            <tr>
              <th className="py-2.5">Code</th>
              <th>Description</th>
              <th>Discount</th>
              <th>Min Order</th>
              <th>Audience</th>
              <th>Status</th>
              <th className="text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
            {coupons.map((cp) => (
              <tr key={cp.id}>
                <td className="py-3 font-mono font-extrabold text-[#830020] dark:text-[#FFB400]">{cp.code}</td>
                <td className="max-w-[240px] text-stone-700 dark:text-stone-300">{cp.description}</td>
                <td className="font-mono font-bold">
                  {cp.discountType === 'percent' ? `${cp.discountValue}%` : `₹${(cp.discountValue / 100).toFixed(0)} flat`}
                </td>
                <td className="font-mono">₹{(cp.minOrderPaise / 100).toFixed(0)}</td>
                <td>{cp.newUsersOnly ? 'First order' : 'All NITP students'}</td>
                <td>
                  <Badge variant={cp.active ? 'success' : 'default'}>
                    {cp.active ? 'Active' : 'Paused'}
                  </Badge>
                </td>
                <td className="text-right">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => onToggleCoupon(cp.id, !cp.active)}
                    className="min-h-[44px]"
                  >
                    {cp.active ? 'Pause' : 'Activate'}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Create Campus Coupon"
        description="Published coupons are verified server-side during cart quoting and checkout."
      >
        <div className="space-y-3 pt-2">
          <div>
            <label htmlFor="coupon-code-input" className="text-xs font-bold block mb-1">
              Coupon Code
            </label>
            <input
              id="coupon-code-input"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. HOSTEL25"
              className="min-h-[44px] w-full rounded-xl border border-stone-300 px-3 font-mono text-xs uppercase dark:border-stone-700 dark:bg-stone-850"
            />
          </div>
          <div>
            <label htmlFor="coupon-desc-input" className="text-xs font-bold block mb-1">
              Student-facing description
            </label>
            <input
              id="coupon-desc-input"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Flat ₹20 off on orders above ₹99"
              className="min-h-[44px] w-full rounded-xl border border-stone-300 px-3 text-xs dark:border-stone-700 dark:bg-stone-850"
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label htmlFor="coupon-type-select" className="text-xs font-bold block mb-1">
                Type
              </label>
              <select
                id="coupon-type-select"
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as 'percent' | 'flat')}
                className="min-h-[44px] w-full rounded-xl border border-stone-300 px-2 text-xs dark:border-stone-700 dark:bg-stone-850"
              >
                <option value="flat">Flat (₹)</option>
                <option value="percent">Percent (%)</option>
              </select>
            </div>
            <div>
              <label htmlFor="coupon-value-input" className="text-xs font-bold block mb-1">
                Value ({discountType === 'flat' ? '₹' : '%'})
              </label>
              <input
                id="coupon-value-input"
                type="number"
                min={1}
                value={discountRupeesOrPct}
                onChange={(e) => setDiscountRupeesOrPct(e.target.value)}
                className="min-h-[44px] w-full rounded-xl border border-stone-300 px-3 font-mono text-xs dark:border-stone-700 dark:bg-stone-850"
              />
            </div>
            <div>
              <label htmlFor="coupon-min-input" className="text-xs font-bold block mb-1">
                Min Order (₹)
              </label>
              <input
                id="coupon-min-input"
                type="number"
                min={0}
                value={minOrderRupees}
                onChange={(e) => setMinOrderRupees(e.target.value)}
                className="min-h-[44px] w-full rounded-xl border border-stone-300 px-3 font-mono text-xs dark:border-stone-700 dark:bg-stone-850"
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-xs font-semibold pt-1">
            <input
              type="checkbox"
              checked={newUsersOnly}
              onChange={(e) => setNewUsersOnly(e.target.checked)}
              className="h-4 w-4 rounded"
            />
            <span>First-time student orders only</span>
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setModalOpen(false)} className="min-h-[44px]">
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={submitting}
              onClick={() => {
                setSubmitting(true);
                void handleSubmit();
              }}
              className="min-h-[44px]"
            >
              Publish Coupon
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

/* ---------------- REPORTS QUEUE TAB ---------------- */
export function AdminReportsTab({
  reports,
  onRefresh,
  onResolve,
}: {
  reports: AdminReport[];
  onRefresh: () => void;
  onResolve: (
    id: string,
    payload: { status: 'resolved' | 'refunded' | 'credited' | 'rejected'; refundPaise: number; resolutionNote: string }
  ) => Promise<void>;
}) {
  const [activeReport, setActiveReport] = useState<AdminReport | null>(null);
  const [actionStatus, setActionStatus] = useState<'resolved' | 'refunded' | 'credited' | 'rejected'>('refunded');
  const [refundRupees, setRefundRupees] = useState('50');
  const [note, setNote] = useState('');

  const openResolutionModal = (
    rep: AdminReport,
    presetStatus: 'resolved' | 'refunded' | 'credited' | 'rejected'
  ) => {
    setActiveReport(rep);
    setActionStatus(presetStatus);
    const defaultRs =
      presetStatus === 'refunded'
        ? Math.round((rep.orderTotalPaise || 5000) / 100).toString()
        : presetStatus === 'credited'
        ? '25'
        : '0';
    setRefundRupees(defaultRs);
    setNote(`Processed as ${presetStatus} by NIT Patna operations`);
  };

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wider text-stone-500">
          Student Issue Reports Queue ({reports.length})
        </h2>
        <Button size="sm" variant="secondary" onClick={onRefresh} className="min-h-[44px]">
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
          Refresh Queue
        </Button>
      </div>

      {reports.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-200 p-8 text-center text-xs text-stone-500 dark:border-stone-800">
          No student order reports in queue.
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((rep) => (
            <div
              key={rep.id}
              data-report-order={rep.orderPublicNo}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-stone-200 bg-stone-50 p-4 text-xs dark:border-stone-800 dark:bg-stone-850"
            >
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono font-bold text-[#830020] dark:text-[#FFB400]">
                    #{rep.orderPublicNo}
                  </span>
                  <span className="font-bold text-stone-900 dark:text-stone-100">{rep.vendorName}</span>
                  <Badge variant={rep.status === 'open' ? 'warning' : rep.status === 'rejected' ? 'danger' : 'success'}>
                    {rep.reason} • {rep.status}
                  </Badge>
                  {(rep.refundPaise || 0) > 0 && (
                    <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300">
                      ₹{((rep.refundPaise || 0) / 100).toFixed(0)} {rep.status}
                    </span>
                  )}
                </div>
                <p className="text-stone-700 dark:text-stone-300">{rep.description}</p>
                {rep.resolutionNote && (
                  <div className="text-[11px] text-emerald-700 dark:text-emerald-300">
                    Resolution: {rep.resolutionNote}
                  </div>
                )}
              </div>

              {rep.status === 'open' && (
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => openResolutionModal(rep, 'credited')}
                    className="min-h-[44px]"
                  >
                    <CreditCard className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                    Credit
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => openResolutionModal(rep, 'refunded')}
                    className="min-h-[44px]"
                  >
                    Refund
                  </Button>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => openResolutionModal(rep, 'resolved')}
                    className="min-h-[44px]"
                  >
                    <CheckCircle2 className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                    Resolve
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openResolutionModal(rep, 'rejected')}
                    className="min-h-[44px] text-red-700 dark:text-red-300"
                  >
                    <XCircle className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                    Reject
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog
        open={Boolean(activeReport)}
        onClose={() => setActiveReport(null)}
        title={`Resolve Report #${activeReport?.orderPublicNo || ''}`}
        description="Choose resolution status, optional refund/credit amount, and audit note."
      >
        <div className="space-y-3 pt-2">
          <div>
            <label htmlFor="report-action-status" className="text-xs font-bold block mb-1">
              Outcome
            </label>
            <select
              id="report-action-status"
              value={actionStatus}
              onChange={(e) =>
                setActionStatus(e.target.value as 'resolved' | 'refunded' | 'credited' | 'rejected')
              }
              className="min-h-[44px] w-full rounded-xl border border-stone-300 px-3 text-xs dark:border-stone-700 dark:bg-stone-850"
            >
              <option value="resolved">Resolve without payout</option>
              <option value="credited">Issue TreFood wallet credit</option>
              <option value="refunded">Issue full/partial refund</option>
              <option value="rejected">Reject claim</option>
            </select>
          </div>
          {(actionStatus === 'refunded' || actionStatus === 'credited') && (
            <div>
              <label htmlFor="report-refund-input" className="text-xs font-bold block mb-1">
                Amount (₹)
              </label>
              <input
                id="report-refund-input"
                type="number"
                min={0}
                value={refundRupees}
                onChange={(e) => setRefundRupees(e.target.value)}
                className="min-h-[44px] w-full rounded-xl border border-stone-300 px-3 font-mono text-xs dark:border-stone-700 dark:bg-stone-850"
              />
            </div>
          )}
          <div>
            <label htmlFor="report-note-input" className="text-xs font-bold block mb-1">
              Resolution note
            </label>
            <input
              id="report-note-input"
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="min-h-[44px] w-full rounded-xl border border-stone-300 px-3 text-xs dark:border-stone-700 dark:bg-stone-850"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setActiveReport(null)} className="min-h-[44px]">
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={async () => {
                if (!activeReport) return;
                const amountPaise =
                  actionStatus === 'refunded' || actionStatus === 'credited'
                    ? Math.max(0, Math.round((Number.parseFloat(refundRupees) || 0) * 100))
                    : 0;
                await onResolve(activeReport.id, {
                  status: actionStatus,
                  refundPaise: amountPaise,
                  resolutionNote: note.trim(),
                });
                setActiveReport(null);
              }}
              className="min-h-[44px]"
            >
              Confirm Action
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

/* ---------------- SETTLEMENT BY VENDOR & DAY TAB ---------------- */
export function AdminSettlementsTab({
  settlements,
  vendors,
  vendorFilter,
  dateFilter,
  onChangeFilters,
  onExportCsv,
}: {
  settlements: AdminSettlementRow[];
  vendors: AdminVendor[];
  vendorFilter: string;
  dateFilter: string;
  onChangeFilters: (nextVendor: string, nextDate: string) => void;
  onExportCsv: () => void;
}) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-extrabold text-stone-900 dark:text-stone-100">
            Vendor &amp; Day Settlement Report
          </h2>
          <p className="text-xs text-stone-500">
            Delivered packets aggregated by canteen and IST calendar date
          </p>
        </div>
        <Button size="sm" variant="primary" onClick={onExportCsv} className="min-h-[44px]">
          <Download className="mr-1.5 h-4 w-4" aria-hidden="true" />
          Export Settlement CSV
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-xl bg-stone-50 p-3 dark:bg-stone-850">
        <div>
          <label htmlFor="settlement-vendor-filter" className="text-[11px] font-bold block mb-1 text-stone-600">
            Filter by Vendor
          </label>
          <select
            id="settlement-vendor-filter"
            value={vendorFilter}
            onChange={(e) => onChangeFilters(e.target.value, dateFilter)}
            className="min-h-[44px] rounded-xl border border-stone-300 bg-white px-3 text-xs dark:border-stone-700 dark:bg-stone-900"
          >
            <option value="">All Vendors</option>
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="settlement-date-filter" className="text-[11px] font-bold block mb-1 text-stone-600">
            Filter by IST Date
          </label>
          <input
            id="settlement-date-filter"
            type="date"
            value={dateFilter}
            onChange={(e) => onChangeFilters(vendorFilter, e.target.value)}
            className="min-h-[44px] rounded-xl border border-stone-300 bg-white px-3 text-xs font-mono dark:border-stone-700 dark:bg-stone-900"
          />
        </div>

        {(vendorFilter || dateFilter) && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onChangeFilters('', '')}
            className="min-h-[44px]"
          >
            Reset Filters
          </Button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-stone-100 text-stone-500 uppercase tracking-wider dark:border-stone-800">
            <tr>
              <th className="py-2.5">IST Date</th>
              <th>Vendor</th>
              <th>Delivered</th>
              <th>Pay at Gate</th>
              <th>UPI Collected</th>
              <th>Discounts</th>
              <th className="text-right">Gross Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
            {settlements.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-stone-500">
                  No settled deliveries match these filters.
                </td>
              </tr>
            ) : (
              settlements.map((row) => (
                <tr key={row.key}>
                  <td className="py-3 font-mono font-bold">{row.date}</td>
                  <td className="font-bold text-stone-900 dark:text-stone-100">{row.vendorName}</td>
                  <td className="font-mono">{row.ordersCount}</td>
                  <td className="font-mono">₹{(row.payAtGatePaise / 100).toFixed(2)}</td>
                  <td className="font-mono">₹{(row.upiPaise / 100).toFixed(2)}</td>
                  <td className="font-mono text-emerald-700 dark:text-emerald-400">
                    -₹{(row.discountPaise / 100).toFixed(2)}
                  </td>
                  <td className="text-right font-mono font-extrabold text-[#830020] dark:text-[#FFB400]">
                    ₹{(row.grossPaise / 100).toFixed(2)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------------- ANNOUNCEMENTS TAB ---------------- */
export function AdminAnnouncementsTab({
  announcements,
  onNewBanner,
  onToggleBanner,
}: {
  announcements: AdminAnnouncement[];
  onNewBanner: () => void;
  onToggleBanner: (id: string, active: boolean) => Promise<void>;
}) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold">Campus Announcements &amp; Gate Banners</h2>
          <p className="text-xs text-stone-500">
            Broadcast alerts or curfew closures directly to students across the app
          </p>
        </div>
        <Button onClick={onNewBanner} size="sm" className="min-h-[44px]">
          + New Banner
        </Button>
      </div>

      <div className="space-y-2.5">
        {announcements.length === 0 ? (
          <div className="rounded-xl border border-dashed border-stone-200 p-6 text-center text-xs text-stone-500">
            No announcements published yet.
          </div>
        ) : (
          announcements.map((ann) => (
            <div
              key={ann.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 text-xs text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100"
            >
              <div className="flex items-start gap-2 min-w-0 flex-1">
                <Megaphone className="h-4 w-4 shrink-0 text-amber-700 mt-0.5" aria-hidden="true" />
                <div>
                  <div className="font-semibold">{ann.message}</div>
                  <div className="text-[10px] font-mono text-stone-500 mt-0.5">
                    {new Date(ann.createdAt * 1000).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                  </div>
                </div>
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => onToggleBanner(ann.id, !ann.active)}
                className="min-h-[44px]"
              >
                {ann.active ? 'Hide Banner' : 'Re-activate'}
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* ---------------- AUDIT LOG TAB ---------------- */
export function AdminAuditTab({
  logs,
  actionFilter,
  onChangeFilter,
  onRefresh,
}: {
  logs: AdminAuditEntry[];
  actionFilter: string;
  onChangeFilter: (action: string) => void;
  onRefresh: () => void;
}) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-bold flex items-center gap-2">
          <History className="h-4 w-4 text-[#830020] dark:text-[#FFB400]" aria-hidden="true" />
          <span>Security &amp; Sensitive Mutation Audit Log ({logs.length})</span>
        </h2>
        <div className="flex items-center gap-2">
          <label htmlFor="audit-action-filter" className="sr-only">
            Filter audit actions
          </label>
          <select
            id="audit-action-filter"
            value={actionFilter}
            onChange={(e) => onChangeFilter(e.target.value)}
            className="min-h-[44px] rounded-xl border border-stone-300 bg-white px-3 text-xs dark:border-stone-700 dark:bg-stone-850"
          >
            <option value="">All Actions</option>
            <option value="VENDOR_">Vendor Actions</option>
            <option value="GATE_">Gate Curfew / Closure</option>
            <option value="FESTIVAL_">Festival Overrides</option>
            <option value="ORDER_">Order Force Cancels</option>
            <option value="COUPON_">Coupon Changes</option>
            <option value="REPORT_">Report Resolutions</option>
            <option value="ANNOUNCEMENT_">Banners</option>
          </select>
          <Button onClick={onRefresh} variant="secondary" size="sm" className="min-h-[44px]">
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="space-y-2 font-mono text-xs">
        {logs.map((log) => (
          <div
            key={log.id}
            className="flex items-start justify-between gap-3 rounded-xl bg-stone-50 p-3 dark:bg-stone-850 border border-stone-100 dark:border-stone-800"
          >
            <div className="min-w-0">
              <span className="font-bold text-[#830020] dark:text-[#FFB400]">{log.action}</span>
              <span className="ml-2 text-stone-500">
                Target: {log.targetType} ({log.targetId})
              </span>
              {log.detailsJson && (
                <div className="mt-1 text-[11px] text-stone-600 dark:text-stone-400 font-sans break-all">
                  {log.detailsJson}
                </div>
              )}
            </div>
            <span className="text-stone-500 text-[10px] shrink-0">
              {new Date(log.at * 1000).toLocaleString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
                day: 'numeric',
                month: 'short',
                timeZone: 'Asia/Kolkata',
              })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

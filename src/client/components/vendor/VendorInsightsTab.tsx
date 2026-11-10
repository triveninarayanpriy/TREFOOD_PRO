import { Download, TrendingUp, Clock, IndianRupee, Award, BarChart3 } from 'lucide-react';
import { Button } from '../ui/Button';

export interface VendorSettlementOrder {
  id: string;
  publicNo: string;
  totalPaise: number;
  paymentMethod?: string;
  deliveredAt?: number | null;
  handoverCode: string;
}

export interface VendorInsightsPayload {
  ok?: boolean;
  totalDeliveredCount: number;
  totalCollectedPaise: number;
  totalCollectedRupees: number;
  insights?: {
    todayOrdersCount: number;
    todayDeliveredCount: number;
    todayRevenuePaise: number;
    payAtGatePaise: number;
    upiPaise: number;
    avgPrepMinutes: number;
    promisedPrepMinutes: number;
    prepSamplesCount: number;
    topItems: Array<{
      itemId: string;
      name: string;
      quantity: number;
      revenuePaise: number;
    }>;
    hourlyBuckets: Array<{
      label: string;
      count: number;
    }>;
  };
  orders: VendorSettlementOrder[];
}

function PeakHoursSvgChart({ buckets }: { buckets: Array<{ label: string; count: number }> }) {
  const safeBuckets =
    buckets.length > 0
      ? buckets
      : ['08h', '10h', '12h', '14h', '16h', '18h', '20h', '22h'].map((label) => ({
          label,
          count: 0,
        }));
  const max = Math.max(...safeBuckets.map((b) => b.count), 1);
  const height = 110;
  const barWidth = 22;
  const gap = 14;
  const width = Math.max(360, safeBuckets.length * (barWidth + gap) + 16);

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height + 28}`}
        className="h-36 w-full min-w-[340px]"
        role="img"
        aria-label="Peak hours orders chart across the day in IST"
      >
        {safeBuckets.map((bucket, idx) => {
          const barHeight = Math.max(4, (bucket.count / max) * (height - 16));
          const x = idx * (barWidth + gap) + 12;
          const y = height - barHeight;
          return (
            <g key={bucket.label}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                rx={5}
                className={bucket.count > 0 ? 'fill-[#830020] dark:fill-[#FFB400]' : 'fill-stone-200 dark:fill-stone-800'}
              />
              {bucket.count > 0 && (
                <text
                  x={x + barWidth / 2}
                  y={y - 4}
                  textAnchor="middle"
                  className="font-mono text-[10px] font-bold fill-stone-700 dark:fill-stone-200"
                >
                  {bucket.count}
                </text>
              )}
              <text
                x={x + barWidth / 2}
                y={height + 16}
                textAnchor="middle"
                className="font-mono text-[9px] fill-stone-500 dark:fill-stone-400"
              >
                {bucket.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export interface VendorInsightsTabProps {
  data: VendorInsightsPayload | null;
  onExportCsv: () => void;
}

export function VendorInsightsTab({ data, onExportCsv }: VendorInsightsTabProps) {
  const insights = data?.insights;
  const avgPrep = insights?.avgPrepMinutes ?? 15;
  const promisedPrep = insights?.promisedPrepMinutes ?? 15;
  const prepDiff = avgPrep - promisedPrep;

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      {/* KPI Strip: Today's Orders, Today's Revenue, Avg Prep vs Promised, Delivered Total */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
          <div className="flex items-center justify-between text-xs font-semibold text-stone-600 dark:text-stone-400">
            <span>Today&apos;s Orders</span>
            <TrendingUp className="h-4 w-4 text-[#830020] dark:text-[#FFB400]" aria-hidden="true" />
          </div>
          <div className="mt-1.5 font-mono text-2xl font-extrabold text-stone-900 dark:text-stone-100">
            {insights?.todayOrdersCount ?? 0}
          </div>
          <div className="mt-0.5 text-[11px] text-stone-500">
            {insights?.todayDeliveredCount ?? 0} delivered today
          </div>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
          <div className="flex items-center justify-between text-xs font-semibold text-stone-600 dark:text-stone-400">
            <span>Today&apos;s Revenue</span>
            <IndianRupee className="h-4 w-4 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
          </div>
          <div className="mt-1.5 font-mono text-2xl font-extrabold text-emerald-800 dark:text-emerald-300">
            ₹{((insights?.todayRevenuePaise ?? 0) / 100).toFixed(2)}
          </div>
          <div className="mt-0.5 text-[11px] text-stone-500">
            Gate ₹{((insights?.payAtGatePaise ?? 0) / 100).toFixed(0)} • UPI ₹
            {((insights?.upiPaise ?? 0) / 100).toFixed(0)}
          </div>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
          <div className="flex items-center justify-between text-xs font-semibold text-stone-600 dark:text-stone-400">
            <span>Avg Prep vs Promised</span>
            <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />
          </div>
          <div className="mt-1.5 font-mono text-2xl font-extrabold text-stone-900 dark:text-stone-100">
            {avgPrep}m <span className="text-sm font-semibold text-stone-500">/ {promisedPrep}m</span>
          </div>
          <div
            className={`mt-0.5 text-[11px] font-semibold ${
              prepDiff <= 0
                ? 'text-emerald-700 dark:text-emerald-400'
                : 'text-amber-700 dark:text-amber-300'
            }`}
          >
            {prepDiff <= 0
              ? `${Math.abs(prepDiff)}m faster than promised`
              : `${prepDiff}m slower than promised`}
          </div>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
          <div className="text-xs font-semibold text-stone-600 dark:text-stone-400">
            Orders Delivered
          </div>
          <div className="mt-1.5 font-mono text-2xl font-extrabold text-[#830020] dark:text-[#FFB400]">
            {data?.totalDeliveredCount || 0}
          </div>
          <div className="mt-0.5 text-[11px] font-mono text-stone-600 dark:text-stone-400">
            Total Collected (₹): ₹{(data?.totalCollectedRupees || 0).toFixed(2)}
          </div>
        </div>
      </div>

      {/* Peak Hours Chart & Top Items */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <section
          aria-label="Peak hours chart"
          className="lg:col-span-7 rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900 space-y-3"
        >
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-extrabold text-stone-900 dark:text-stone-100">
              <BarChart3 className="h-4 w-4 text-[#830020] dark:text-[#FFB400]" aria-hidden="true" />
              <span>Peak Hours Orders (IST)</span>
            </h3>
            <span className="text-[11px] text-stone-500">2-hour slots</span>
          </div>
          <PeakHoursSvgChart buckets={insights?.hourlyBuckets || []} />
        </section>

        <section
          aria-label="Top selling items"
          className="lg:col-span-5 rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900 space-y-3"
        >
          <h3 className="flex items-center gap-2 text-sm font-extrabold text-stone-900 dark:text-stone-100">
            <Award className="h-4 w-4 text-[#FFB400]" aria-hidden="true" />
            <span>Top Items</span>
          </h3>
          {!insights?.topItems || insights.topItems.length === 0 ? (
            <p className="py-6 text-center text-xs text-stone-500">
              Item leaderboard populates as orders arrive.
            </p>
          ) : (
            <div className="divide-y divide-stone-100 dark:divide-stone-800">
              {insights.topItems.map((it, idx) => (
                <div key={it.itemId} className="py-2 flex items-center justify-between gap-2 text-xs">
                  <div className="min-w-0 truncate">
                    <span className="font-mono font-bold text-stone-500 mr-2">#{idx + 1}</span>
                    <span className="font-bold text-stone-900 dark:text-stone-100">{it.name}</span>
                  </div>
                  <div className="shrink-0 font-mono text-right">
                    <span className="font-bold text-[#830020] dark:text-[#FFB400]">
                      {it.quantity} sold
                    </span>
                    <span className="ml-2 text-stone-500">
                      ₹{(it.revenuePaise / 100).toFixed(0)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Daily Settlement & CSV Export */}
      <section
        aria-label="Daily settlement summary"
        className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900 space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-stone-100 dark:border-stone-800">
          <div>
            <h2 className="text-lg font-extrabold text-stone-900 dark:text-stone-100">
              Daily Settlement &amp; Sales
            </h2>
            <p className="text-xs text-stone-600 dark:text-stone-400">
              Summary of delivered packets verified with 4-digit handover codes
            </p>
          </div>
          <Button onClick={onExportCsv} variant="primary" size="sm" className="min-h-[56px] px-5 font-bold">
            <Download className="mr-1.5 h-4 w-4" aria-hidden="true" />
            Export CSV
          </Button>
        </div>

        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500">
            Delivered Packets Log
          </h4>
          {!data?.orders || data.orders.length === 0 ? (
            <div className="py-6 text-center text-xs text-stone-500">
              No handed-over packets settled yet.
            </div>
          ) : (
            <div className="divide-y divide-stone-100 dark:divide-stone-800 text-xs font-mono">
              {data.orders.slice(0, 20).map((o) => (
                <div key={o.id} className="py-2.5 flex flex-wrap justify-between items-center gap-2">
                  <div>
                    <span className="font-bold text-stone-900 dark:text-stone-100">#{o.publicNo}</span>
                    <span className="ml-2 text-stone-500">Code: {o.handoverCode}</span>
                    {o.deliveredAt && (
                      <span className="ml-2 text-stone-500">
                        {new Date(o.deliveredAt * 1000).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                          timeZone: 'Asia/Kolkata',
                        })}
                      </span>
                    )}
                  </div>
                  <span className="font-bold text-stone-900 dark:text-stone-100">
                    ₹{(o.totalPaise / 100).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

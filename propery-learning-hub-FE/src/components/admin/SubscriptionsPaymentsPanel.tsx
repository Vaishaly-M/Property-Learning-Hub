'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle,
  CreditCard,
  MonetizationOn,
  People,
  Payment,
  CardMembership,
  TrendingUp,
  Search,
  History,
  Cancel,
} from '@mui/icons-material';
import {
  subscriptionsService,
  type AcademyEnrollment,
  type AcademyPaymentRecord,
  type SubscriptionsOverview,
} from '@/services/subscriptionsService';

const SubscriptionsPaymentsPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'subscriptions' | 'payments'>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [rangeFilter, setRangeFilter] = useState('30days');
  const [data, setData] = useState<SubscriptionsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await subscriptionsService.getOverview({
        search: searchQuery || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        range: rangeFilter,
        tab: activeTab,
      });
      setData(result);
    } catch {
      setError('Failed to load subscription and payment data.');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter, rangeFilter, activeTab]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, searchQuery ? 300 : 0);
    return () => clearTimeout(timer);
  }, [loadData, searchQuery]);

  const tabs = [
    { key: 'overview', label: 'Overview', icon: <TrendingUp className="w-5 h-5" />, color: 'text-blue-600' },
    { key: 'subscriptions', label: 'Enrollments', icon: <CardMembership className="w-5 h-5" />, color: 'text-purple-600' },
    { key: 'payments', label: 'Payments', icon: <Payment className="w-5 h-5" />, color: 'text-green-600' },
  ];

  const formatDate = (value: string | null) => {
    if (!value) return '—';
    return new Date(value).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
      case 'consumed':
      case 'paid':
        return <span className="px-2 py-1 text-xs font-semibold bg-green-100 text-green-800 rounded-full">Completed</span>;
      case 'pending':
        return <span className="px-2 py-1 text-xs font-semibold bg-amber-100 text-amber-800 rounded-full">Pending</span>;
      case 'failed':
        return <span className="px-2 py-1 text-xs font-semibold bg-red-100 text-red-800 rounded-full">Failed</span>;
      default:
        return <span className="px-2 py-1 text-xs font-semibold bg-slate-100 text-slate-800 rounded-full">{status}</span>;
    }
  };

  const stats = useMemo(() => {
    if (!data) return [];
    return [
      {
        title: 'Total Revenue',
        value: data.stats.total_revenue.formatted ?? '£0.00',
        change: data.stats.total_revenue.change,
        icon: <MonetizationOn className="w-6 h-6" />,
        color: 'bg-green-50 text-green-600',
      },
      {
        title: 'Enrolled Members',
        value: String(data.stats.enrolled_members.value),
        change: null,
        icon: <People className="w-6 h-6" />,
        color: 'bg-blue-50 text-blue-600',
      },
      {
        title: 'Pending Payments',
        value: String(data.stats.pending_payments.value),
        change: null,
        icon: <CreditCard className="w-6 h-6" />,
        color: 'bg-amber-50 text-amber-600',
      },
      {
        title: 'Failed Payments',
        value: String(data.stats.failed_payments.value),
        change: null,
        icon: <Cancel className="w-6 h-6" />,
        color: 'bg-red-50 text-red-600',
      },
    ];
  }, [data]);

  const renderEmptyState = (message: string) => (
    <div className="py-12 text-center text-sm text-slate-500">{message}</div>
  );

  const renderOverview = () => {
    if (!data) return null;

    const { plan } = data;

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div key={stat.title} className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-2 rounded-lg ${stat.color}`}>{stat.icon}</div>
                {stat.change !== null && stat.change !== undefined && (
                  <span className={`text-sm font-semibold ${stat.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {stat.change >= 0 ? '+' : ''}
                    {stat.change}%
                  </span>
                )}
              </div>
              <div className="text-2xl font-bold text-slate-800 mb-1">{stat.value}</div>
              <div className="text-sm text-slate-500">{stat.title}</div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-1">Academy Plan</h3>
            <p className="text-sm text-slate-500">Single one-time enrollment for the Freedom Property Journey</p>
          </div>

          <div className="max-w-xl rounded-xl border-2 border-blue-300 bg-blue-50 p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h4 className="text-lg font-bold text-slate-800 mb-1">{plan.name}</h4>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-slate-800">{plan.formatted_amount}</span>
                  <span className="text-sm text-slate-500">one-time</span>
                </div>
              </div>
              <span className="px-3 py-1 text-xs font-semibold bg-green-100 text-green-800 rounded-full">Active</span>
            </div>

            <div className="space-y-2 mb-5">
              {plan.features.map((feature) => (
                <div key={feature} className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-slate-600">{feature}</span>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-blue-200 grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-500">Enrolled members</span>
                <div className="font-semibold text-slate-800">{plan.enrolled_count}</div>
              </div>
              <div>
                <span className="text-slate-500">Paid, awaiting registration</span>
                <div className="font-semibold text-slate-800">{plan.paid_awaiting_registration}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-slate-800 mb-1">Recent Payments</h3>
              <p className="text-sm text-slate-500">Latest academy payment transactions</p>
            </div>
          </div>

          {data.recent_payments.length === 0 ? (
            renderEmptyState('No payments recorded yet.')
          ) : (
            <div className="space-y-4">
              {data.recent_payments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-lg transition-colors">
                  <div>
                    <div className="text-sm font-semibold text-slate-800">{payment.customer}</div>
                    <div className="text-xs text-slate-500">{formatDate(payment.date)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-slate-800">{payment.formatted_amount}</div>
                    {getStatusBadge(payment.status)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderEnrollments = () => {
    if (!data) return null;

    const filtered = data.enrollments.filter((item) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        item.customer.toLowerCase().includes(q) ||
        (item.email?.toLowerCase().includes(q) ?? false)
      );
    });

    return (
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="p-6 border-b border-slate-200">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-800 mb-1">Academy Enrollments</h3>
              <p className="text-sm text-slate-500">Members who paid and completed registration</p>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search enrollments..."
                className="pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none w-full lg:w-72"
              />
            </div>
          </div>
        </div>

        <div className="p-6">
          {filtered.length === 0 ? (
            renderEmptyState('No enrollments yet.')
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Member</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Plan</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Amount</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Enrolled</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((enrollment: AcademyEnrollment) => (
                    <tr key={enrollment.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-4 px-4">
                        <div className="text-sm font-semibold text-slate-800">{enrollment.customer}</div>
                        <div className="text-xs text-slate-500">{enrollment.email ?? '—'}</div>
                      </td>
                      <td className="py-4 px-4 text-sm text-slate-800">{enrollment.plan}</td>
                      <td className="py-4 px-4 text-sm font-semibold text-slate-800">{enrollment.formatted_amount}</td>
                      <td className="py-4 px-4 text-sm text-slate-800">{formatDate(enrollment.enrolled_at)}</td>
                      <td className="py-4 px-4">{getStatusBadge(enrollment.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderPayments = () => {
    if (!data) return null;

    return (
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="p-6 border-b border-slate-200">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-800 mb-1">Payment Transactions</h3>
              <p className="text-sm text-slate-500">All academy payment attempts via Stripe</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="consumed">Consumed</option>
                <option value="failed">Failed</option>
              </select>
              <select
                value={rangeFilter}
                onChange={(e) => setRangeFilter(e.target.value)}
                className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
              >
                <option value="30days">Last 30 days</option>
                <option value="7days">Last 7 days</option>
                <option value="90days">Last 90 days</option>
                <option value="1year">This year</option>
                <option value="all">All time</option>
              </select>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search payments..."
                  className="pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none w-full lg:w-64"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="p-6">
          {data.payments.length === 0 ? (
            renderEmptyState('No payment transactions found.')
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Transaction</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Customer</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Plan</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Amount</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Date</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.payments.map((payment: AcademyPaymentRecord) => (
                    <tr key={payment.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-4 px-4">
                        <div className="font-mono text-xs text-slate-800">{payment.transaction_id}</div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-sm font-semibold text-slate-800">{payment.customer}</div>
                        <div className="text-xs text-slate-500">{payment.email ?? '—'}</div>
                      </td>
                      <td className="py-4 px-4 text-sm text-slate-800">{payment.plan}</td>
                      <td className="py-4 px-4 text-sm font-semibold text-slate-800">{payment.formatted_amount}</td>
                      <td className="py-4 px-4 text-sm text-slate-800">{formatDate(payment.date)}</td>
                      <td className="py-4 px-4">{getStatusBadge(payment.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200">
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-bold text-slate-800">Subscriptions & Payments</h2>
        </div>
        <p className="text-sm text-slate-500">
          Academy enrollment payments — {data?.plan.formatted_amount ?? '£3,000.00'} one-time plan
        </p>
      </div>

      <div className="px-6 pt-4 border-b border-slate-200">
        <div className="flex space-x-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold rounded-t-lg transition-all border-b-2 ${
                activeTab === tab.key
                  ? `${tab.color} border-current`
                  : 'text-slate-500 border-transparent hover:text-slate-700'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6">
        {loading ? (
          <div className="py-16 flex flex-col items-center gap-3 text-slate-500">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">Loading subscription data...</span>
          </div>
        ) : error ? (
          <div className="py-16 text-center">
            <p className="text-sm text-red-600 mb-4">{error}</p>
            <button
              onClick={loadData}
              className="px-4 py-2 text-sm font-semibold text-white bg-blue-500 rounded-lg hover:bg-blue-600"
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            {activeTab === 'overview' && renderOverview()}
            {activeTab === 'subscriptions' && renderEnrollments()}
            {activeTab === 'payments' && renderPayments()}
          </>
        )}

        {data && !loading && !error && (
          <div className="mt-8 pt-8 border-t border-slate-200">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 text-sm text-slate-600">
              <div className="flex flex-wrap items-center gap-6">
                <div>
                  <div className="font-semibold">Enrolled Members</div>
                  <div className="text-lg font-bold text-slate-800">{data.stats.enrolled_members.value}</div>
                </div>
                <div>
                  <div className="font-semibold">Period Revenue</div>
                  <div className="text-lg font-bold text-green-600">
                    {data.stats.range_revenue.formatted ?? '£0.00'}
                  </div>
                </div>
                <div>
                  <div className="font-semibold">Payment Success Rate</div>
                  <div className="text-lg font-bold text-blue-600">
                    {data.stats.success_rate !== null ? `${data.stats.success_rate}%` : '—'}
                  </div>
                </div>
              </div>
              <button
                onClick={loadData}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors"
              >
                <History className="w-4 h-4" />
                Refresh
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SubscriptionsPaymentsPanel;

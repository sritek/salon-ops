'use client';

import { useEffect } from 'react';
import { format } from 'date-fns';
import { Clock, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { useWalkInQueue } from '@/hooks/queries/use-appointments';
import { useAuthStore } from '@/stores/auth-store';

import type { QueueStatus } from '@/types/appointments';

const statusColors: Record<QueueStatus, string> = {
  waiting: 'bg-yellow-500',
  called: 'bg-blue-500',
  serving: 'bg-green-500',
  completed: 'bg-gray-500',
  left: 'bg-red-500',
};

export default function QueueDisplayPage() {
  const t = useTranslations('walkIn');
  const user = useAuthStore((state) => state.user);
  const branchId = user?.branchIds?.[0] || '';

  const { data: queueData, refetch } = useWalkInQueue({
    branchId,
    date: format(new Date(), 'yyyy-MM-dd'),
  });

  // Auto-refresh every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 10000);
    return () => clearInterval(interval);
  }, [refetch]);

  const servingQueue = queueData?.queue.filter((e) => e.status === 'serving') || [];
  const calledQueue = queueData?.queue.filter((e) => e.status === 'called') || [];
  const waitingQueue = queueData?.queue.filter((e) => e.status === 'waiting') || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white p-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-2">{t('title')}</h1>
        <div className="text-xl text-slate-300">{format(new Date(), 'EEEE, MMMM d, yyyy')}</div>
      </div>

      {/* Stats Bar */}
      <div className="flex justify-center gap-8 mb-12">
        <div className="flex items-center gap-3 bg-slate-700/50 px-6 py-3 rounded-lg">
          <Users className="h-6 w-6 text-yellow-400" />
          <span className="text-2xl font-semibold">{waitingQueue.length}</span>
          <span className="text-slate-300">{t('stats.waiting')}</span>
        </div>
        <div className="flex items-center gap-3 bg-slate-700/50 px-6 py-3 rounded-lg">
          <Clock className="h-6 w-6 text-blue-400" />
          <span className="text-2xl font-semibold">{queueData?.stats?.averageWaitTime || 0}</span>
          <span className="text-slate-300">min avg wait</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
        {/* Currently Serving */}
        <div className="bg-green-900/30 border border-green-500/30 rounded-2xl p-6">
          <h2 className="text-2xl font-bold text-green-400 mb-6 text-center">
            {t('currentlyServing')}
          </h2>
          <div className="space-y-4">
            {servingQueue.length === 0 ? (
              <div className="text-center text-slate-400 py-8">No one being served</div>
            ) : (
              servingQueue.map((entry) => (
                <div
                  key={entry.id}
                  className="bg-green-500/20 border border-green-500/40 rounded-xl p-6 text-center"
                >
                  <div className="text-6xl font-bold text-green-400 mb-2">#{entry.tokenNumber}</div>
                  <div className="text-xl text-slate-200">{entry.customerName}</div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Called / Next */}
        <div className="bg-blue-900/30 border border-blue-500/30 rounded-2xl p-6">
          <h2 className="text-2xl font-bold text-blue-400 mb-6 text-center">{t('called')}</h2>
          <div className="space-y-4">
            {calledQueue.length === 0 ? (
              <div className="text-center text-slate-400 py-8">No one called</div>
            ) : (
              calledQueue.map((entry) => (
                <div
                  key={entry.id}
                  className="bg-blue-500/20 border border-blue-500/40 rounded-xl p-6 text-center animate-pulse"
                >
                  <div className="text-6xl font-bold text-blue-400 mb-2">#{entry.tokenNumber}</div>
                  <div className="text-xl text-slate-200">{entry.customerName}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Waiting Queue */}
      <div className="mt-8 max-w-6xl mx-auto">
        <h2 className="text-2xl font-bold text-yellow-400 mb-6 text-center">{t('waitingQueue')}</h2>
        <div className="flex flex-wrap justify-center gap-4">
          {waitingQueue.length === 0 ? (
            <div className="text-center text-slate-400 py-8">{t('noWaiting')}</div>
          ) : (
            waitingQueue.map((entry, index) => (
              <div
                key={entry.id}
                className={`bg-slate-700/50 border border-slate-600 rounded-xl p-4 text-center min-w-[120px] ${
                  index === 0 ? 'ring-2 ring-yellow-500' : ''
                }`}
              >
                <div className="text-3xl font-bold text-yellow-400">#{entry.tokenNumber}</div>
                <div className="text-sm text-slate-300 mt-1">{entry.customerName}</div>
                <div className="text-xs text-slate-400 mt-1">~{entry.estimatedWaitMinutes} min</div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="fixed bottom-4 right-4 text-slate-500 text-sm">
        Auto-refreshes every 10 seconds
      </div>
    </div>
  );
}

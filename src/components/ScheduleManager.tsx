import React, { useState, useEffect } from 'react';
import { TourScheduleTable, formatDateVi, todayIso } from '../types';
import { Trash2, Plus, Calendar, Pencil } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface ScheduleManagerProps {
  experienceId: number;
  experienceTitle: string;
  onClose: () => void;
}

export default function ScheduleManager({ experienceId, experienceTitle, onClose }: ScheduleManagerProps) {
  const { t, tDynamic } = useLanguage();
  const [schedules, setSchedules] = useState<TourScheduleTable[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingScheduleId, setEditingScheduleId] = useState<number | null>(null);

  const [form, setForm] = useState({
    start_date: '',
    end_date: '',
    meeting_time: '08:00',
    max_slots: 20
  });

  useEffect(() => {
    fetchSchedules();
  }, [experienceId]);

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/schedules?experience_id=${experienceId}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('schedule_load_error'));
      setSchedules(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEditingScheduleId(null);
    setForm({ start_date: '', end_date: '', meeting_time: '08:00', max_slots: 20 });
  };

  const saveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.start_date || !form.end_date || !form.meeting_time) {
      setError(t('schedule_validate_dates'));
      return;
    }
    if (form.end_date < form.start_date) {
      setError(t('schedule_validate_range'));
      return;
    }
    
    try {
      const endpoint = editingScheduleId ? `/api/schedules/${editingScheduleId}` : '/api/schedules';
      const res = await fetch(endpoint, {
        method: editingScheduleId ? 'PUT' : 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          ...(editingScheduleId ? {} : { experience_id: experienceId }),
          start_date: form.start_date,
          end_date: form.end_date,
          meeting_time: form.meeting_time,
          max_slots: form.max_slots
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setSchedules(current => editingScheduleId
        ? current.map(schedule => schedule.id === data.id ? data : schedule)
        : [...current, data]);
      resetForm();
      setError(null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const editSchedule = (schedule: TourScheduleTable) => {
    if (schedule.max_slots !== schedule.remaining_slots) return;
    setEditingScheduleId(schedule.id);
    setForm({
      start_date: schedule.start_date,
      end_date: schedule.end_date,
      meeting_time: schedule.meeting_time || '08:00',
      max_slots: schedule.max_slots
    });
    setError(null);
  };

  const deleteSchedule = async (id: number) => {
    if (!confirm(t('schedule_delete_confirm'))) return;
    try {
      const res = await fetch(`/api/schedules/${id}`, { 
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      setSchedules(schedules.filter(s => s.id !== id));
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white/80 backdrop-blur-lg shadow-2xl">
        <div className="border-b border-zinc-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-zinc-900">
              {t('schedule_title')}: <span className="text-emerald-700">{tDynamic(experienceTitle)}</span>
            </h2>
            <button onClick={onClose} className="rounded-full p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900">
              ✕
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 rounded-xl border border-red-100 bg-red-50 p-3 text-sm font-semibold text-red-700">
              {error}
            </div>
          )}

          <p className="mb-3 text-xs font-semibold text-zinc-500">{t('schedule_reset_hint')}</p>
          <form onSubmit={saveSchedule} className="mb-6 grid gap-4 rounded-xl border border-emerald-100 bg-emerald-50/50 p-4 sm:grid-cols-5">
            <label className="block sm:col-span-1">
              <span className="mb-1 block text-xs font-bold text-zinc-600">{t('schedule_start')}</span>
              <input type="date" min={todayIso()} value={form.start_date} onChange={e => setForm({...form, start_date: e.target.value})} className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-emerald-500" />
            </label>
            <label className="block sm:col-span-1">
              <span className="mb-1 block text-xs font-bold text-zinc-600">{t('schedule_end')}</span>
              <input type="date" min={form.start_date} value={form.end_date} onChange={e => setForm({...form, end_date: e.target.value})} className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-emerald-500" />
            </label>
            <label className="block sm:col-span-1">
              <span className="mb-1 block text-xs font-bold text-zinc-600">{t('schedule_meeting_time')}</span>
              <input type="time" value={form.meeting_time} onChange={e => setForm({...form, meeting_time: e.target.value})} className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-emerald-500" />
            </label>
            <label className="block sm:col-span-1">
              <span className="mb-1 block text-xs font-bold text-zinc-600">{t('schedule_slots')}</span>
              <input type="number" min="1" value={form.max_slots} onChange={e => setForm({...form, max_slots: Number(e.target.value)})} className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-emerald-500" />
            </label>
            <div className="flex items-end gap-2 sm:col-span-1">
              <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-bold text-white hover:bg-emerald-700">
                {editingScheduleId ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />} {editingScheduleId ? t('schedule_save') : t('schedule_add')}
              </button>
              {editingScheduleId && <button type="button" onClick={resetForm} className="rounded-lg border border-zinc-200 px-3 py-2 text-sm font-bold text-zinc-600 hover:bg-white">{t('schedule_cancel')}</button>}
            </div>
          </form>

          {loading ? (
            <div className="py-10 text-center text-sm font-bold text-zinc-500">{t('schedule_loading')}</div>
          ) : schedules.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-300 py-10 text-center text-sm font-semibold text-zinc-500">
              {t('schedule_empty')}
            </div>
          ) : (
            <div className="space-y-3">
              {schedules.map(schedule => (
                <div key={schedule.id} className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white/80 backdrop-blur-lg p-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                      <Calendar className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-bold text-zinc-900">
                        {formatDateVi(schedule.start_date)} - {formatDateVi(schedule.end_date)}
                      </div>
                      <div className="text-xs font-semibold text-zinc-500">
                        {t('schedule_meeting_time')}: <span className="text-emerald-600">{schedule.meeting_time}</span> • {t('schedule_remaining')} <span className="text-emerald-600">{Math.max(0, schedule.remaining_slots)}</span> / {schedule.max_slots} {t('schedule_slots_empty')}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button aria-label={t('schedule_edit')} title={t('schedule_edit')} disabled={schedule.max_slots !== schedule.remaining_slots} onClick={() => editSchedule(schedule)} className="rounded-lg border border-emerald-100 p-2 text-emerald-600 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button aria-label={t('schedule_delete_confirm')} title={t('schedule_delete_confirm')} disabled={schedule.max_slots !== schedule.remaining_slots} onClick={() => deleteSchedule(schedule.id)} className="rounded-lg border border-red-100 p-2 text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

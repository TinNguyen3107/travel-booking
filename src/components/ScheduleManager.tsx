import React, { useState, useEffect } from 'react';
import { TourScheduleTable, formatDateVi } from '../types';
import { Trash2, Plus, Calendar } from 'lucide-react';

interface ScheduleManagerProps {
  experienceId: number;
  experienceTitle: string;
  onClose: () => void;
}

export default function ScheduleManager({ experienceId, experienceTitle, onClose }: ScheduleManagerProps) {
  const [schedules, setSchedules] = useState<TourScheduleTable[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    start_date: '',
    end_date: '',
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
      if (!res.ok) throw new Error(data.error || 'Lỗi tải lịch khởi hành');
      setSchedules(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const addSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.start_date || !form.end_date) {
      setError('Vui lòng chọn ngày bắt đầu và kết thúc');
      return;
    }
    if (form.end_date < form.start_date) {
      setError('Ngày kết thúc phải sau hoặc bằng ngày bắt đầu');
      return;
    }
    
    try {
      const res = await fetch('/api/schedules', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          experience_id: experienceId,
          start_date: form.start_date,
          end_date: form.end_date,
          max_slots: form.max_slots
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setSchedules([...schedules, data]);
      setForm({ start_date: '', end_date: '', max_slots: 20 });
      setError(null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const deleteSchedule = async (id: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa lịch này?')) return;
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
              Lịch khởi hành: <span className="text-emerald-700">{experienceTitle}</span>
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

          <form onSubmit={addSchedule} className="mb-6 grid gap-4 rounded-xl border border-emerald-100 bg-emerald-50/50 p-4 sm:grid-cols-4">
            <label className="block sm:col-span-1">
              <span className="mb-1 block text-xs font-bold text-zinc-600">Bắt đầu</span>
              <input type="date" value={form.start_date} onChange={e => setForm({...form, start_date: e.target.value})} className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-emerald-500" />
            </label>
            <label className="block sm:col-span-1">
              <span className="mb-1 block text-xs font-bold text-zinc-600">Kết thúc</span>
              <input type="date" min={form.start_date} value={form.end_date} onChange={e => setForm({...form, end_date: e.target.value})} className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-emerald-500" />
            </label>
            <label className="block sm:col-span-1">
              <span className="mb-1 block text-xs font-bold text-zinc-600">Số chỗ</span>
              <input type="number" min="1" value={form.max_slots} onChange={e => setForm({...form, max_slots: Number(e.target.value)})} className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-emerald-500" />
            </label>
            <div className="flex items-end sm:col-span-1">
              <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-bold text-white hover:bg-emerald-700">
                <Plus className="h-4 w-4" /> Thêm
              </button>
            </div>
          </form>

          {loading ? (
            <div className="py-10 text-center text-sm font-bold text-zinc-500">Đang tải lịch...</div>
          ) : schedules.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-300 py-10 text-center text-sm font-semibold text-zinc-500">
              Chưa có lịch khởi hành nào.
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
                        Còn <span className="text-emerald-600">{Math.max(0, schedule.remaining_slots)}</span> / {schedule.max_slots} chỗ trống
                      </div>
                    </div>
                  </div>
                  <button onClick={() => deleteSchedule(schedule.id)} className="rounded-lg border border-red-100 p-2 text-red-600 hover:bg-red-50">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

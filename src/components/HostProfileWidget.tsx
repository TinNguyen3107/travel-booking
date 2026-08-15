import React, { useEffect, useState } from 'react';
import { Star, MapPin, X, ChevronRight, Phone, CreditCard, Home, Info } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface HostProfile {
  host_name: string;
  description: string;
  avatar: string;
  total_experiences: number;
  total_reviews: number;
  average_rating: number;
  phone?: string;
  address?: string;
  id_number?: string;
  experience_location?: string;
}

export default function HostProfileWidget({ email }: { email: string }) {
  const { lang, t } = useLanguage();
  const [profile, setProfile] = useState<HostProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!email) return;
    setLoading(true);
    fetch(`/api/hosts/profile/${encodeURIComponent(email)}`)
      .then(res => res.json())
      .then(data => {
        if (!data.error) setProfile(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [email]);

  // Handle Escape key to close modal
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowModal(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  if (loading) return <div className="animate-pulse h-32 bg-zinc-100 dark:bg-slate-800 rounded-2xl mt-4"></div>;
  if (!profile) return null;

  const avatarUrl = profile.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.host_name || 'Host')}&background=10b981&color=fff&size=256`;

  return (
    <>
      <button
        type="button"
        onClick={() => setShowModal(true)}
        className="w-full text-left rounded-2xl border border-zinc-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg p-5 flex items-center gap-4 hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:border-emerald-500/50 dark:hover:bg-slate-800/80 transition-all group"
      >
        <img
          src={avatarUrl}
          alt={profile.host_name}
          className="w-16 h-16 rounded-full object-cover border-2 border-transparent group-hover:border-emerald-500 transition-colors"
        />
        <div className="flex-1">
          <h3 className="text-lg font-black text-zinc-900 dark:text-slate-50 group-hover:text-emerald-600 transition-colors">Host: {profile.host_name}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-sm font-medium text-zinc-600 dark:text-slate-400">
            <span className="flex items-center gap-1">
              <Star className="h-4 w-4 text-emerald-600" />
              {profile.average_rating > 0 ? profile.average_rating.toFixed(1) : t('host_no_reviews')}
            </span>
            <span>•</span>
            <span>{profile.total_reviews} {lang === 'en' ? (profile.total_reviews > 1 ? t('detail_reviews_count') : t('detail_review_count')) : t('detail_reviews_count')}</span>
            <span>•</span>
            <span>{profile.total_experiences} {lang === 'en' ? (profile.total_experiences > 1 ? t('detail_tours_count') : t('detail_tour_count')) : t('detail_tours_count')}</span>
          </div>
          {profile.experience_location && (
            <div className="mt-2 text-xs font-medium text-zinc-500 dark:text-slate-400 flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {profile.experience_location}
            </div>
          )}
        </div>
        <ChevronRight className="h-5 w-5 text-zinc-400 group-hover:text-emerald-500 transition-colors" />
      </button>

      {showModal && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm transition-all">
          <div
            className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-100 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg px-6 py-4">
              <h2 className="text-lg font-black text-zinc-950 dark:text-slate-50">{t('host_profile_title')}</h2>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 hover:bg-red-50 hover:text-red-600 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-red-900/30 dark:hover:text-red-500 transition-colors"
                title="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Content */}
            <div className="overflow-y-auto p-6 scrollbar-hide">
              <div className="flex flex-col items-center text-center mb-8">
                <img
                  src={avatarUrl}
                  alt={profile.host_name}
                  className="w-24 h-24 rounded-full object-cover shadow-lg border-4 border-white dark:border-slate-800 mb-4"
                />
                <h3 className="text-2xl font-black text-zinc-900 dark:text-slate-50 mb-1">{profile.host_name}</h3>

                <div className="flex flex-wrap items-center justify-center gap-4 text-sm font-medium text-zinc-600 dark:text-slate-400 mt-2">
                  <span className="flex items-center gap-1.5 bg-zinc-100 dark:bg-slate-800 px-3 py-1 rounded-full">
                    <Star className="h-4 w-4 text-emerald-500" />
                    {profile.average_rating > 0 ? profile.average_rating.toFixed(1) : t('host_no_reviews')}
                  </span>
                  <span className="bg-zinc-100 dark:bg-slate-800 px-3 py-1 rounded-full">
                    {profile.total_reviews} {lang === 'en' ? (profile.total_reviews > 1 ? t('detail_reviews_count') : t('detail_review_count')) : t('detail_reviews_count')}
                  </span>
                  <span className="bg-zinc-100 dark:bg-slate-800 px-3 py-1 rounded-full">
                    {profile.total_experiences} {lang === 'en' ? (profile.total_experiences > 1 ? t('detail_tours_count') : t('detail_tour_count')) : t('detail_tours_count')}
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                {profile.phone && (
                  <div className="flex items-start gap-3 p-4 rounded-2xl bg-zinc-50 dark:bg-slate-800/50 border border-zinc-100 dark:border-slate-700">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                      <Phone className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold uppercase text-zinc-500 dark:text-slate-400">{t('host_profile_phone')}</h4>
                      <p className="mt-1 text-sm font-semibold text-zinc-900 dark:text-slate-200">{profile.phone}</p>
                    </div>
                  </div>
                )}

                {profile.address && (
                  <div className="flex items-start gap-3 p-4 rounded-2xl bg-zinc-50 dark:bg-slate-800/50 border border-zinc-100 dark:border-slate-700">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                      <Home className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold uppercase text-zinc-500 dark:text-slate-400">{t('host_profile_address')}</h4>
                      <p className="mt-1 text-sm font-semibold text-zinc-900 dark:text-slate-200">{profile.address}</p>
                    </div>
                  </div>
                )}

                {profile.experience_location && (
                  <div className="flex items-start gap-3 p-4 rounded-2xl bg-zinc-50 dark:bg-slate-800/50 border border-zinc-100 dark:border-slate-700">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold uppercase text-zinc-500 dark:text-slate-400">{t('host_profile_area')}</h4>
                      <p className="mt-1 text-sm font-semibold text-zinc-900 dark:text-slate-200">{profile.experience_location}</p>
                    </div>
                  </div>
                )}



                {profile.description && (
                  <div className="flex items-start gap-3 p-4 rounded-2xl bg-zinc-50 dark:bg-slate-800/50 border border-zinc-100 dark:border-slate-700">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                      <Info className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold uppercase text-zinc-500 dark:text-slate-400">{t('host_profile_desc')}</h4>
                      <p className="mt-2 text-sm leading-relaxed text-zinc-700 dark:text-slate-300 whitespace-pre-wrap">
                        {profile.description}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
          {/* Invisible backdrop click handler */}
          <div className="absolute inset-0 z-[-1]" onClick={() => setShowModal(false)}></div>
        </div>
      )}
    </>
  );
}

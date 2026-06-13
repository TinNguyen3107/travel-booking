import React, { useEffect, useState } from 'react';
import { Star, MapPin } from 'lucide-react';

interface HostProfile {
  host_name: string;
  description: string;
  avatar: string;
  total_experiences: number;
  total_reviews: number;
  average_rating: number;
}

export default function HostProfileWidget({ email }: { email: string }) {
  const [profile, setProfile] = useState<HostProfile | null>(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) return <div className="animate-pulse h-32 bg-zinc-100 rounded-2xl mt-6"></div>;
  if (!profile) return null;

  return (
    <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-5 flex items-start gap-4">
      <img
        src={profile.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=256&auto=format&fit=crop'}
        alt={profile.host_name}
        className="w-16 h-16 rounded-full object-cover"
      />
      <div className="flex-1">
        <h3 className="text-lg font-black text-zinc-900">Host: {profile.host_name}</h3>
        <div className="mt-1 flex flex-wrap items-center gap-3 text-sm font-medium text-zinc-600">
          <span className="flex items-center gap-1">
            <Star className="h-4 w-4 text-emerald-600" />
            {profile.average_rating > 0 ? profile.average_rating.toFixed(1) : 'Chưa có đánh giá'}
          </span>
          <span>•</span>
          <span>{profile.total_reviews} bình luận</span>
          <span>•</span>
          <span>{profile.total_experiences} tour</span>
        </div>
        {profile.description && (
          <p className="mt-3 text-sm leading-relaxed text-zinc-600">
            {profile.description}
          </p>
        )}
      </div>
    </div>
  );
}

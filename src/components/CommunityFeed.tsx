import React, { useState, useEffect } from 'react';
import { Heart, Send, ThumbsUp, Image as ImageIcon, Trash2, X, ChevronLeft, ChevronRight, MapPin } from 'lucide-react';
import { PostTable, PostCommentTable, PostReactionTable } from '../types';
import CustomSelect from './CustomSelect';

interface CommunityFeedProps {
  currentUser: any;
  onLogin: () => void;
  limit?: number;
  onViewAll?: () => void;
  experiences?: any[];
  hideCreatePost?: boolean;
}

const reactionIcons: Record<string, React.ReactNode> = {
  like: <ThumbsUp className="h-8 w-8 text-blue-500 fill-blue-500" />,
  love: <Heart className="h-8 w-8 fill-rose-500 text-rose-500" />,
  wow: <span className="text-3xl">😲</span>,
  haha: <span className="text-3xl">😂</span>,
  sad: <span className="text-3xl">😢</span>,
  angry: <span className="text-3xl">😡</span>
};

const smallReactionIcons: Record<string, React.ReactNode> = {
  like: <ThumbsUp className="h-3.5 w-3.5 text-blue-500 fill-blue-500" />,
  love: <Heart className="h-3.5 w-3.5 fill-rose-500 text-rose-500" />,
  wow: <span className="text-sm">😲</span>,
  haha: <span className="text-sm">😂</span>,
  sad: <span className="text-sm">😢</span>,
  angry: <span className="text-sm">😡</span>
};

// tiny emoji for summary row (like Facebook's reaction cluster)
const tinyReactionEmoji: Record<string, string> = {
  like: '👍',
  love: '❤️',
  wow: '😲',
  haha: '😂',
  sad: '😢',
  angry: '😡'
};

const reactionLabels: Record<string, string> = {
  like: 'Thích',
  love: 'Yêu thích',
  wow: 'Wow',
  haha: 'Haha',
  sad: 'Buồn',
  angry: 'Phẫn nộ'
};

export default function CommunityFeed({ currentUser, onLogin, limit, onViewAll, experiences = [], hideCreatePost = false }: CommunityFeedProps) {
  const [posts, setPosts] = useState<PostTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [postContent, setPostContent] = useState('');
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [lightbox, setLightbox] = useState<{ urls: string[], index: number } | null>(null);

  const openLightbox = (urls: string[], index: number) => {
    setLightbox({ urls, index });
  };
  const [submitting, setSubmitting] = useState(false);
  const [commentModalPostId, setCommentModalPostId] = useState<number | null>(null);
  const [commentsData, setCommentsData] = useState<Record<number, PostCommentTable[]>>({});
  const [reactionsData, setReactionsData] = useState<Record<number, PostReactionTable[]>>({});
  const [commentReactionsData, setCommentReactionsData] = useState<Record<number, any[]>>({});
  const [viewReactions, setViewReactions] = useState<number | null>(null);
  const [viewCommentReactions, setViewCommentReactions] = useState<number | null>(null);
  const [selectedExperienceFilter, setSelectedExperienceFilter] = useState<string>('all');
  const [postExperienceId, setPostExperienceId] = useState<string>('none');
  const [replyingTo, setReplyingTo] = useState<{ postId: number; commentId: number; fullname: string } | null>(null);
  const [expandedReplies, setExpandedReplies] = useState<Record<number, boolean>>({});

  // comment input per post
  const [commentInputs, setCommentInputs] = useState<Record<number, string>>({});

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (!currentUser) { onLogin(); return; }

    const isVideo = files[0].type.startsWith('video/');
    if (!files.every(file => file.type.startsWith('image/') || file.type.startsWith('video/'))) {
      alert('Vui lòng chọn file hình ảnh hoặc video.');
      return;
    }

    setSubmitting(true);
    try {
      const uploadedUrls: string[] = [];
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
          body: formData
        });
        if (res.ok) {
          const data = await res.json();
          uploadedUrls.push(data.url);
        } else {
          const err = await res.json();
          alert(err.error || 'Lỗi tải lên file');
        }
      }
      setMediaUrls(prev => [...prev, ...uploadedUrls]);
      setMediaType(isVideo ? 'video' : 'image');
    } catch (err) {
      console.error(err);
      alert('Lỗi tải lên file');
    } finally {
      setSubmitting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const fetchPosts = async () => {
    try {
      const res = await fetch('/api/posts', { cache: 'no-store' });
      const data = await res.json();
      setPosts(data);
      data.forEach((post: any) => {
        fetchReactions(post.id);
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPosts(); }, []);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return onLogin();
    if (!postContent.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          user_email: currentUser.email,
          fullname: currentUser.fullname,
          role: currentUser.role,
          content: postContent,
          media_url: mediaUrls.length > 0 ? JSON.stringify(mediaUrls) : undefined,
          media_type: mediaUrls.length > 0 ? mediaType : undefined,
          experience_id: postExperienceId && postExperienceId !== 'none' ? Number(postExperienceId) : undefined
        })
      });
      if (res.ok) {
        setPostContent('');
        setMediaUrls([]);
        setPostExperienceId('none');
        fetchPosts();
      } else {
        const err = await res.json();
        alert(err.error);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const fetchComments = async (postId: number) => {
    try {
      const res = await fetch(`/api/posts/${postId}/comments`, { cache: 'no-store' });
      const data = await res.json();
      setCommentsData(prev => ({ ...prev, [postId]: data }));

      // Fetch reactions for each comment
      data.forEach((comment: any) => {
        fetchCommentReactions(comment.id);
      });
    } catch (e) { console.error(e); }
  };

  const fetchCommentReactions = async (commentId: number) => {
    try {
      const res = await fetch(`/api/comments/${commentId}/reactions`, { cache: 'no-store' });
      const data = await res.json();
      setCommentReactionsData(prev => ({ ...prev, [commentId]: data }));
    } catch (e) { console.error(e); }
  };

  const fetchReactions = async (postId: number) => {
    try {
      const res = await fetch(`/api/posts/${postId}/reactions`, { cache: 'no-store' });
      const data = await res.json();
      setReactionsData(prev => ({ ...prev, [postId]: data }));
    } catch (e) { console.error(e); }
  };

  const openCommentModal = (postId: number) => {
    setCommentModalPostId(postId);
    fetchComments(postId);
  };

  const submitComment = async (e: React.FormEvent, postId: number) => {
    e.preventDefault();
    if (!currentUser) return onLogin();
    const input = commentInputs[postId]?.trim();
    if (!input) return;

    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          user_email: currentUser.email,
          fullname: currentUser.fullname,
          comment: input,
          parent_id: replyingTo?.postId === postId ? replyingTo.commentId : undefined
        })
      });
      if (res.ok) {
        setCommentInputs(prev => ({ ...prev, [postId]: '' }));
        setReplyingTo(null);
        fetchComments(postId);
        fetchPosts();
      }
    } catch (e) { console.error(e); }
  };

  const toggleReaction = async (postId: number, reactionType: string) => {
    if (!currentUser) return onLogin();
    try {
      const res = await fetch(`/api/posts/${postId}/reactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ user_email: currentUser.email, reaction_type: reactionType })
      });
      if (res.ok) {
        fetchReactions(postId);
        fetchPosts();
      }
    } catch (e) { console.error(e); }
  };

  const toggleCommentReaction = async (commentId: number, reactionType: string, postId: number) => {
    if (!currentUser) return onLogin();
    try {
      const res = await fetch(`/api/comments/${commentId}/reactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ user_email: currentUser.email, reaction_type: reactionType })
      });
      if (res.ok) {
        fetchCommentReactions(commentId);
      }
    } catch (e) { console.error(e); }
  };

  const deletePost = async (postId: number) => {
    if (!window.confirm('Xóa bài viết này?')) return;
    try {
      const res = await fetch(`/api/posts/${postId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ status: 'deleted' })
      });
      if (res.ok) { fetchPosts(); } else { alert('Có lỗi xảy ra'); }
    } catch (e) { console.error(e); }
  };

  // Compute reaction summary: unique types and total count
  const getReactionSummary = (reactions: PostReactionTable[]) => {
    const counts: Record<string, number> = {};
    reactions.forEach(r => { counts[r.reaction_type] = (counts[r.reaction_type] || 0) + 1; });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const total = reactions.length;
    return { sorted, total };
  };

  if (loading) {
    return <div className="p-8 text-center text-zinc-500 dark:text-slate-400">Đang tải bảng tin...</div>;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <div className="mb-8 text-center">
        <h2 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-slate-100">Cộng đồng Travel</h2>
        <p className="mt-2 text-sm text-zinc-500 dark:text-slate-400">Chia sẻ khoảnh khắc và trải nghiệm của bạn cùng những người đam mê du lịch.</p>
      </div>

      {!limit && (
        <div className="mb-8 flex justify-end">
          <div className="w-64">
            <CustomSelect
              value={selectedExperienceFilter}
              onChange={setSelectedExperienceFilter}
              options={[
                { value: 'all', label: 'Tất cả bài viết' },
                ...experiences.map(exp => ({ value: String(exp.id), label: exp.title }))
              ]}
              className="w-full"
            />
          </div>
        </div>
      )}

      {/* Create post */}
      {!hideCreatePost && (
        <div className="mb-8 rounded-2xl border border-zinc-200 dark:border-slate-700 bg-white/80 backdrop-blur-lg dark:bg-slate-800 shadow-sm relative z-20">
          <div className="p-4">
            <form onSubmit={handleCreatePost}>
              <textarea
                className="w-full resize-none bg-transparent text-lg outline-none placeholder:text-zinc-400 dark:text-slate-500"
                rows={3}
                placeholder={currentUser ? `${currentUser.fullname} ơi, bạn đang nghĩ gì?` : 'Đăng nhập để chia sẻ trải nghiệm của bạn...'}
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
                onClick={() => !currentUser && onLogin()}
              />

              {mediaUrls.length > 0 && (
                <div className="relative mt-2 rounded-xl bg-zinc-100 dark:bg-slate-800 p-2">
                  <div className="flex gap-2 overflow-x-auto">
                    {mediaUrls.map((url, idx) => (
                      mediaType === 'image' ? (
                        <img key={idx} src={url} alt="Preview" className="h-32 rounded-lg object-cover shrink-0" />
                      ) : (
                        <video key={idx} src={url} controls className="h-32 rounded-lg object-cover shrink-0" />
                      )
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setMediaUrls([])}
                    className="absolute right-4 top-4 z-10 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}

              <hr className="my-4 border-zinc-100 dark:border-slate-800" />

              <div className="flex items-center justify-between">
                <div className="flex flex-wrap gap-2 items-center">
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*,video/*" multiple onChange={handleFileUpload} />
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => { if (!currentUser) return onLogin(); fileInputRef.current?.click(); }}
                    className="flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold text-zinc-600 dark:text-slate-300 hover:bg-zinc-100 dark:hover:bg-slate-800 disabled:opacity-50"
                  >
                    <ImageIcon className="h-4 w-4 text-emerald-500" /> Ảnh / Video
                  </button>
                  <div className="w-48">
                    <CustomSelect
                      value={postExperienceId || 'none'}
                      onChange={setPostExperienceId}
                      options={[
                        { value: 'none', label: 'Bài viết chung' },
                        ...experiences.map(exp => ({ value: String(exp.id), label: exp.title }))
                      ]}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting || !postContent.trim()}
                  className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  Đăng bài <Send className="h-4 w-4" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Posts */}
      <div className="space-y-6">
        {(() => {
          let filtered = posts;
          if (selectedExperienceFilter !== 'all') {
            filtered = posts.filter(p => String(p.experience_id) === selectedExperienceFilter);
          }
          const displayedPosts = limit ? filtered.slice(0, limit) : filtered;
          return displayedPosts.map(post => {
            const postReactions = reactionsData[post.id] || [];
            const myReaction = currentUser ? postReactions.find(r => r.user_email === currentUser.email)?.reaction_type : null;
            const { sorted: reactionSummary, total: reactionTotal } = getReactionSummary(postReactions);

            return (
              <div key={post.id} className="rounded-2xl border border-zinc-200 dark:border-slate-700 bg-white/80 backdrop-blur-lg dark:bg-slate-800 p-5 shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="flex gap-3 w-full">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 font-bold text-indigo-700 overflow-hidden">
                      {post.user_avatar ? (
                        <img src={post.user_avatar} alt={post.fullname} className="h-full w-full object-cover" />
                      ) : (
                        post.fullname.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-zinc-900 dark:text-slate-100">{post.fullname}</span>
                        {post.role === 'host' && <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">Host</span>}
                        {post.role === 'admin' && <span className="rounded bg-slate-700 px-1.5 py-0.5 text-[10px] font-medium text-white">Quản trị viên</span>}
                      </div>

                      <div className="mt-1 text-[15px] leading-relaxed text-zinc-800 dark:text-slate-200 whitespace-pre-wrap">{post.content}</div>

                      {post.experience_id && experiences.find(e => e.id === post.experience_id) && (
                        <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                          <MapPin className="h-3.5 w-3.5" />
                          Đang nói về: {experiences.find(e => e.id === post.experience_id)?.title}
                        </div>
                      )}

                      {/* Action row */}
                      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs font-semibold text-zinc-500 dark:text-slate-400 relative z-10">
                        <button onClick={() => openCommentModal(post.id)} className="hover:text-zinc-800 dark:hover:text-slate-200 hover:underline">
                          Bình luận {post.comments_count > 0 && `(${post.comments_count})`}
                        </button>
                        <span>•</span>

                        {/* Reaction trigger */}
                        <div className="group relative flex items-center">
                          <div className="absolute bottom-full left-0 pb-2 hidden group-hover:block z-50">
                            <div className="flex items-center gap-4 rounded-full border border-zinc-200 dark:border-slate-700 bg-white/80 backdrop-blur-lg dark:bg-slate-800 px-5 py-3 shadow-xl">
                              {['like', 'love', 'haha', 'wow', 'sad', 'angry'].map(reaction => (
                                <button
                                  key={reaction}
                                  onClick={() => toggleReaction(post.id, reaction)}
                                  className="transform transition-transform hover:scale-125 hover:-translate-y-2 origin-bottom"
                                  title={reactionLabels[reaction]}
                                >
                                  {reactionIcons[reaction]}
                                </button>
                              ))}
                            </div>
                          </div>
                          <button
                            onClick={() => toggleReaction(post.id, 'like')}
                            className={`flex items-center gap-1 hover:text-blue-600 ${myReaction ? 'text-blue-600' : ''}`}
                          >
                            {myReaction ? smallReactionIcons[myReaction] : <ThumbsUp className="h-3.5 w-3.5" />}
                            {myReaction ? reactionLabels[myReaction] : 'Hữu ích'}
                          </button>
                        </div>

                        <span>•</span>
                        <span className="text-zinc-400 dark:text-slate-500">{new Date(post.created_at).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                      </div>

                      {/* Reaction summary bar (Facebook-style) */}
                      {reactionTotal > 0 && (
                        <button
                          onClick={() => setViewReactions(post.id)}
                          className="mt-2 flex items-center gap-1.5 hover:bg-zinc-50 dark:hover:bg-slate-900/50 rounded p-1 -ml-1 transition-colors"
                        >
                          <div className="flex -space-x-1">
                            {reactionSummary.slice(0, 3).map(([type]) => (
                              <span key={type} className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-white/80 backdrop-blur-lg dark:bg-slate-800 text-sm shadow-sm" title={reactionLabels[type]}>
                                {tinyReactionEmoji[type]}
                              </span>
                            ))}
                          </div>
                          <span className="text-xs text-zinc-500 dark:text-slate-400 hover:underline">
                            {reactionTotal} người
                            {reactionSummary.length <= 2
                              ? ' · ' + reactionSummary.map(([t, c]) => `${reactionLabels[t]} (${c})`).join(', ')
                              : ''}
                          </span>
                        </button>
                      )}

                      {/* Media */}
                      {post.media_url && (
                        <div className="mt-4 w-full bg-zinc-50 dark:bg-slate-900/50 rounded-xl overflow-hidden border border-zinc-200 dark:border-slate-700">
                          {(() => {
                            let urls: string[] = [];
                            try {
                              urls = JSON.parse(post.media_url);
                              if (!Array.isArray(urls)) urls = [post.media_url];
                            } catch {
                              urls = [post.media_url];
                            }

                            if (post.media_type === 'video') {
                              return <video src={urls[0]} controls className="w-full max-h-96 object-cover" />;
                            }

                            if (urls.length === 1) {
                              return (
                                <img
                                  src={urls[0]}
                                  alt="Post media"
                                  className="w-full max-h-96 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                  onClick={() => openLightbox(urls, 0)}
                                />
                              );
                            }
                            if (urls.length === 2) {
                              return (
                                <div className="grid grid-cols-2 gap-1 w-full h-64 sm:h-80">
                                  {urls.map((url, idx) => (
                                    <img key={idx} src={url} className="w-full h-full object-cover cursor-pointer hover:opacity-90" onClick={() => openLightbox(urls, idx)} />
                                  ))}
                                </div>
                              );
                            }
                            if (urls.length === 3) {
                              return (
                                <div className="flex flex-col gap-1 w-full h-100">
                                  <div className="flex-1 min-h-0">
                                    <img src={urls[0]} className="w-full h-full object-cover cursor-pointer hover:opacity-90" onClick={() => openLightbox(urls, 0)} />
                                  </div>
                                  <div className="flex-1 min-h-0 grid grid-cols-2 gap-1">
                                    <img src={urls[1]} className="w-full h-full object-cover cursor-pointer hover:opacity-90" onClick={() => openLightbox(urls, 1)} />
                                    <img src={urls[2]} className="w-full h-full object-cover cursor-pointer hover:opacity-90" onClick={() => openLightbox(urls, 2)} />
                                  </div>
                                </div>
                              );
                            }
                            if (urls.length === 4) {
                              return (
                                <div className="grid grid-cols-2 gap-1 w-full h-100">
                                  {urls.map((url, idx) => (
                                    <img key={idx} src={url} className="w-full h-full object-cover cursor-pointer hover:opacity-90" onClick={() => openLightbox(urls, idx)} />
                                  ))}
                                </div>
                              );
                            }
                            // 5 or more
                            return (
                              <div className="flex flex-col gap-1 w-full h-112.5">
                                <div className="flex-1 min-h-0 grid grid-cols-2 gap-1">
                                  <img src={urls[0]} className="w-full h-full object-cover cursor-pointer hover:opacity-90" onClick={() => openLightbox(urls, 0)} />
                                  <img src={urls[1]} className="w-full h-full object-cover cursor-pointer hover:opacity-90" onClick={() => openLightbox(urls, 1)} />
                                </div>
                                <div className="flex-1 min-h-0 grid grid-cols-3 gap-1">
                                  <img src={urls[2]} className="w-full h-full object-cover cursor-pointer hover:opacity-90" onClick={() => openLightbox(urls, 2)} />
                                  <img src={urls[3]} className="w-full h-full object-cover cursor-pointer hover:opacity-90" onClick={() => openLightbox(urls, 3)} />
                                  <div className="relative w-full h-full cursor-pointer hover:opacity-90 overflow-hidden" onClick={() => openLightbox(urls, 4)}>
                                    <img src={urls[4]} className="w-full h-full object-cover" />
                                    {urls.length > 5 && (
                                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-3xl font-bold">
                                        +{urls.length - 4}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      )}

                    </div>
                  </div>

                  {(currentUser?.role === 'admin' || currentUser?.email === post.user_email) && (
                    <button onClick={() => deletePost(post.id)} className="ml-4 shrink-0 text-zinc-400 dark:text-slate-500 hover:text-rose-500">
                      <Trash2 className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </div>
            );
          });
        })()}
        {posts.length === 0 && (
          <div className="py-12 text-center text-zinc-500 dark:text-slate-400">Chưa có bài viết nào. Hãy là người đầu tiên!</div>
        )}
        {limit && posts.length > limit && (
          <div className="text-center mt-6">
            <button
              onClick={onViewAll}
              className="rounded-xl border border-zinc-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-6 py-2.5 text-sm font-bold text-zinc-700 dark:text-slate-200 shadow-sm hover:bg-zinc-50 dark:hover:bg-slate-900/50"
            >
              Xem thêm
            </button>
          </div>
        )}
      </div>

      {lightbox && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md">
          <button
            className="absolute top-4 right-4 text-white hover:text-zinc-300 p-2"
            onClick={() => setLightbox(null)}
          >
            <X className="h-8 w-8" />
          </button>

          <button
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:text-zinc-300 p-2 disabled:opacity-30"
            onClick={() => setLightbox({ ...lightbox, index: lightbox.index - 1 })}
            disabled={lightbox.index === 0}
          >
            <ChevronLeft className="h-12 w-12" />
          </button>

          <img
            src={lightbox.urls[lightbox.index]}
            className="max-h-[90vh] max-w-[90vw] object-contain"
            alt="Expanded view"
          />

          <button
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:text-zinc-300 p-2 disabled:opacity-30"
            onClick={() => setLightbox({ ...lightbox, index: lightbox.index + 1 })}
            disabled={lightbox.index === lightbox.urls.length - 1}
          >
            <ChevronRight className="h-12 w-12" />
          </button>
        </div>
      )}

      {viewReactions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white dark:bg-slate-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-slate-800 p-4">
              <h3 className="font-bold text-zinc-900 dark:text-slate-100">Người đã bày tỏ cảm xúc</h3>
              <button onClick={() => setViewReactions(null)} className="rounded-full p-1 hover:bg-zinc-100 dark:hover:bg-slate-800 text-zinc-500"><X className="h-5 w-5" /></button>
            </div>
            <div className="max-h-96 overflow-y-auto p-4 space-y-3">
              {(reactionsData[viewReactions] || []).map(r => (
                <div key={r.id} className="flex items-center justify-between">
                  <span className="font-semibold text-zinc-800 dark:text-slate-200 text-sm">{(r as any).fullname || r.user_email}</span>
                  <span className="flex items-center gap-2 text-sm text-zinc-500">{smallReactionIcons[r.reaction_type]} {reactionLabels[r.reaction_type]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {viewCommentReactions && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white dark:bg-slate-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-slate-800 p-4">
              <h3 className="font-bold text-zinc-900 dark:text-slate-100">Người đã bày tỏ cảm xúc</h3>
              <button onClick={() => setViewCommentReactions(null)} className="rounded-full p-1 hover:bg-zinc-100 dark:hover:bg-slate-800 text-zinc-500"><X className="h-5 w-5" /></button>
            </div>
            <div className="max-h-96 overflow-y-auto p-4 space-y-3">
              {(commentReactionsData[viewCommentReactions] || []).map(r => (
                <div key={r.id} className="flex items-center justify-between">
                  <span className="font-semibold text-zinc-800 dark:text-slate-200 text-sm">{(r as any).fullname || r.user_email}</span>
                  <span className="flex items-center gap-2 text-sm text-zinc-500">{smallReactionIcons[r.reaction_type]} {reactionLabels[r.reaction_type]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {commentModalPostId && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="flex flex-col w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl bg-white dark:bg-slate-900 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-slate-800 p-4 shrink-0">
              <h3 className="font-bold text-xl text-zinc-900 dark:text-slate-100">Bình luận</h3>
              <button
                onClick={() => setCommentModalPostId(null)}
                className="rounded-full p-2 hover:bg-zinc-100 dark:hover:bg-slate-800 text-zinc-500 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Comments List */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {(() => {
                const comments = commentsData[commentModalPostId] || [];
                if (comments.length === 0) {
                  return <div className="py-8 text-center text-zinc-500">Chưa có bình luận nào. Hãy trở thành người đầu tiên!</div>;
                }

                const rootComments = comments.filter(c => !c.parent_id);
                const repliesByParent = comments.reduce((acc, c) => {
                  if (c.parent_id) {
                    acc[c.parent_id] = acc[c.parent_id] || [];
                    acc[c.parent_id].push(c);
                  }
                  return acc;
                }, {} as Record<number, PostCommentTable[]>);

                const renderComment = (comment: PostCommentTable, isReply: boolean = false): React.ReactNode => (
                  <div key={comment.id} className={`flex gap-3 ${isReply ? 'mt-4' : ''}`}>
                    <div className={`flex shrink-0 items-center justify-center rounded-full bg-zinc-100 dark:bg-slate-800 font-bold text-zinc-600 dark:text-slate-300 overflow-hidden ${isReply ? 'h-8 w-8 text-xs' : 'h-10 w-10 text-sm'}`}>
                      {comment.user_avatar ? (
                        <img src={comment.user_avatar} alt={comment.fullname} className="h-full w-full object-cover" />
                      ) : (
                        comment.fullname.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="inline-block rounded-2xl bg-zinc-100 dark:bg-slate-800 px-4 py-2.5 max-w-full">
                        <span className="block font-bold text-zinc-900 dark:text-slate-100 text-sm">{comment.fullname}</span>
                        <span className="block mt-0.5 text-[15px] leading-relaxed text-zinc-800 dark:text-slate-200 wrap-break-word">{comment.comment}</span>
                      </div>

                      <div className="mt-1.5 ml-2 flex items-center gap-3">
                        <button
                          onClick={() => {
                            setReplyingTo({ postId: commentModalPostId, commentId: isReply && comment.parent_id ? comment.parent_id : comment.id, fullname: comment.fullname });
                            const input = commentInputs[commentModalPostId] || '';
                            const mention = `@${comment.fullname} `;
                            if (!input.includes(mention)) {
                              setCommentInputs(prev => ({ ...prev, [commentModalPostId]: mention + input }));
                            }
                            document.getElementById('comment-input')?.focus();
                          }}
                          className="text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-slate-200 font-semibold transition-colors"
                        >
                          Trả lời
                        </button>

                        {/* Comment Reaction trigger */}
                        <div className="group relative flex items-center">
                          <div className="absolute bottom-full left-0 pb-2 hidden group-hover:block z-50">
                            <div className="flex items-center gap-2 rounded-full border border-zinc-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 shadow-xl">
                              {['like', 'love', 'haha', 'wow', 'sad', 'angry'].map(reaction => (
                                <button
                                  key={reaction}
                                  onClick={() => toggleCommentReaction(comment.id, reaction, commentModalPostId)}
                                  className="transform transition-transform hover:scale-125 hover:-translate-y-1 origin-bottom"
                                  title={reactionLabels[reaction]}
                                >
                                  {smallReactionIcons[reaction]}
                                </button>
                              ))}
                            </div>
                          </div>
                          <button
                            onClick={() => toggleCommentReaction(comment.id, 'like', commentModalPostId)}
                            className={`text-xs font-semibold hover:text-blue-600 transition-colors ${currentUser && commentReactionsData[comment.id]?.find(r => r.user_email === currentUser.email)
                              ? 'text-blue-600'
                              : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-slate-200'
                              }`}
                          >
                            Thích
                          </button>
                        </div>

                        {/* Comment Reaction summary */}
                        {commentReactionsData[comment.id] && commentReactionsData[comment.id].length > 0 && (
                          <button 
                            onClick={() => setViewCommentReactions(comment.id)}
                            className="flex items-center gap-1 bg-white dark:bg-slate-700 rounded-full px-2 py-0.5 shadow-sm border border-zinc-100 dark:border-slate-600 text-[10px] text-zinc-500 hover:bg-zinc-50 dark:hover:bg-slate-600 transition-colors"
                          >
                            <div className="flex -space-x-1">
                              {getReactionSummary(commentReactionsData[comment.id]).sorted.slice(0, 2).map(([type]) => (
                                <span key={type} title={reactionLabels[type]}>{tinyReactionEmoji[type]}</span>
                              ))}
                            </div>
                            <span>{commentReactionsData[comment.id].length}</span>
                          </button>
                        )}
                      </div>

                      {/* Replies */}
                      {repliesByParent[comment.id] && repliesByParent[comment.id].length > 0 && (
                        <div className="mt-2 space-y-1">
                          {(() => {
                            const replies = repliesByParent[comment.id];
                            const isExpanded = expandedReplies[comment.id];
                            const visibleReplies = isExpanded ? replies : replies.slice(0, 2);
                            const hiddenCount = replies.length - 2;
                            return (
                              <>
                                {visibleReplies.map(reply => renderComment(reply, true))}
                                {!isExpanded && hiddenCount > 0 && (
                                  <button
                                    onClick={() => setExpandedReplies(prev => ({ ...prev, [comment.id]: true }))}
                                    className="mt-2 ml-11 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 hover:underline transition-colors"
                                  >
                                    Hiển thị thêm {hiddenCount} phản hồi
                                  </button>
                                )}
                                {isExpanded && hiddenCount > 0 && (
                                  <button
                                    onClick={() => setExpandedReplies(prev => ({ ...prev, [comment.id]: false }))}
                                    className="mt-2 ml-11 text-xs font-semibold text-zinc-500 dark:text-slate-400 hover:text-zinc-800 dark:hover:text-slate-200 hover:underline transition-colors"
                                  >
                                    Ẩn bớt phản hồi
                                  </button>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  </div>
                );

                return rootComments.map(c => renderComment(c, false));
              })()}
            </div>

            {/* Comment Input Box */}
            <div className="border-t border-zinc-200 dark:border-slate-800 p-4 shrink-0 bg-zinc-50 dark:bg-slate-900/80">
              {replyingTo?.postId === commentModalPostId && (
                <div className="mb-2 flex items-center justify-between text-xs text-zinc-500 dark:text-slate-400 bg-zinc-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg w-max max-w-full">
                  <span className="truncate">Đang trả lời <strong>{replyingTo.fullname}</strong></span>
                  <button onClick={() => setReplyingTo(null)} className="ml-2 hover:text-zinc-800 dark:hover:text-slate-200">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
              <form onSubmit={(e) => submitComment(e, commentModalPostId)} className="flex items-end gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700 mt-1 overflow-hidden">
                  {currentUser?.avatar ? (
                    <img src={currentUser.avatar} alt={currentUser.fullname} className="h-full w-full object-cover" />
                  ) : (
                    currentUser?.fullname?.charAt(0).toUpperCase() || '?'
                  )}
                </div>
                <div className="flex-1 relative">
                  <textarea
                    id="comment-input"
                    rows={1}
                    placeholder="Viết phản hồi của bạn..."
                    value={commentInputs[commentModalPostId] || ''}
                    onChange={(e) => {
                      setCommentInputs(prev => ({ ...prev, [commentModalPostId]: e.target.value }));
                      e.target.style.height = 'auto';
                      e.target.style.height = e.target.scrollHeight + 'px';
                    }}
                    onClick={() => !currentUser && onLogin()}
                    className="w-full rounded-2xl border border-zinc-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-3 pr-12 text-[15px] outline-none focus:border-indigo-500 dark:focus:border-indigo-400 transition-colors resize-none overflow-hidden min-h-11.5 max-h-37.5"
                    style={{ lineHeight: '1.4' }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (commentInputs[commentModalPostId]?.trim()) {
                          submitComment(e as any, commentModalPostId);
                        }
                      }
                    }}
                  />
                  <button
                    type="submit"
                    disabled={!commentInputs[commentModalPostId]?.trim()}
                    className="absolute right-3 bottom-3 text-indigo-600 hover:text-indigo-700 disabled:text-zinc-300 transition-colors"
                  >
                    <Send className="h-5 w-5" />
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

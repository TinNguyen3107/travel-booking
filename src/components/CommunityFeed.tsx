import React, { useState, useEffect } from 'react';
import { Heart, Send, ThumbsUp, Image as ImageIcon, Trash2, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { PostTable, PostCommentTable, PostReactionTable } from '../types';

interface CommunityFeedProps {
  currentUser: any;
  onLogin: () => void;
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

export default function CommunityFeed({ currentUser, onLogin }: CommunityFeedProps) {
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
  const [activeComments, setActiveComments] = useState<number | null>(null);
  const [commentsData, setCommentsData] = useState<Record<number, PostCommentTable[]>>({});
  const [reactionsData, setReactionsData] = useState<Record<number, PostReactionTable[]>>({});
  const [viewReactions, setViewReactions] = useState<number | null>(null);
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
          media_type: mediaUrls.length > 0 ? mediaType : undefined
        })
      });
      if (res.ok) {
        setPostContent('');
        setMediaUrls([]);
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
    } catch (e) { console.error(e); }
  };

  const fetchReactions = async (postId: number) => {
    try {
      const res = await fetch(`/api/posts/${postId}/reactions`, { cache: 'no-store' });
      const data = await res.json();
      setReactionsData(prev => ({ ...prev, [postId]: data }));
    } catch (e) { console.error(e); }
  };

  const toggleComments = (postId: number) => {
    if (activeComments === postId) {
      setActiveComments(null);
    } else {
      setActiveComments(postId);
      fetchComments(postId);
    }
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
          comment: input
        })
      });
      if (res.ok) {
        setCommentInputs(prev => ({ ...prev, [postId]: '' }));
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

      {/* Create post */}
      <div className="mb-8 overflow-hidden rounded-2xl border border-zinc-200 dark:border-slate-700 bg-white/80 backdrop-blur-lg dark:bg-slate-800 shadow-sm">
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
              <div className="flex gap-2">
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*,video/*" multiple onChange={handleFileUpload} />
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => { if (!currentUser) return onLogin(); fileInputRef.current?.click(); }}
                  className="flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold text-zinc-600 dark:text-slate-300 hover:bg-zinc-100 dark:hover:bg-slate-800 disabled:opacity-50"
                >
                  <ImageIcon className="h-4 w-4 text-emerald-500" /> Ảnh / Video
                </button>
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

      {/* Posts */}
      <div className="space-y-6">
        {posts.map(post => {
          const postReactions = reactionsData[post.id] || [];
          const myReaction = currentUser ? postReactions.find(r => r.user_email === currentUser.email)?.reaction_type : null;
          const { sorted: reactionSummary, total: reactionTotal } = getReactionSummary(postReactions);

          return (
            <div key={post.id} className="rounded-2xl border border-zinc-200 dark:border-slate-700 bg-white/80 backdrop-blur-lg dark:bg-slate-800 p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex gap-3 w-full">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 font-bold text-indigo-700">
                    {post.fullname.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-zinc-900 dark:text-slate-100">{post.fullname}</span>
                      {post.role === 'host' && <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">Host</span>}
                      {post.role === 'admin' && <span className="rounded bg-slate-700 px-1.5 py-0.5 text-[10px] font-medium text-white">Quản trị viên</span>}
                    </div>

                    <div className="mt-1 text-[15px] leading-relaxed text-zinc-800 dark:text-slate-200 whitespace-pre-wrap">{post.content}</div>

                    {/* Action row */}
                    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs font-semibold text-zinc-500 dark:text-slate-400">
                      <button onClick={() => toggleComments(post.id)} className="hover:text-zinc-800 dark:hover:text-slate-200 hover:underline">
                        Gửi trả lời {post.comments_count > 0 && `(${post.comments_count})`}
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

                    {/* Comments section */}
                    {activeComments === post.id && (
                      <div className="mt-5 space-y-5">
                        {commentsData[post.id]?.length > 0 && (
                          <div className="space-y-4">
                            {commentsData[post.id].map(comment => (
                              <div key={comment.id} className="flex gap-3 pl-4 border-l-2 border-zinc-200 dark:border-slate-700">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-xs font-bold text-zinc-600 dark:text-slate-300">
                                  {comment.fullname.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <span className="font-bold text-zinc-900 dark:text-slate-100 text-sm">{comment.fullname}</span>
                                  <div className="mt-0.5 text-sm leading-relaxed text-zinc-800 dark:text-slate-200">{comment.comment}</div>
                                  <button
                                    onClick={() => {
                                      setCommentInputs(prev => ({ ...prev, [post.id]: `@${comment.fullname} ` }));
                                    }}
                                    className="text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-slate-200 font-semibold mt-1"
                                  >
                                    Trả lời
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        <form onSubmit={(e) => submitComment(e, post.id)} className="flex items-start gap-3 pl-4 border-l-2 border-zinc-200 dark:border-slate-700 pt-2">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                            {currentUser?.fullname?.charAt(0).toUpperCase() || '?'}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 rounded-2xl border border-zinc-300 dark:border-slate-600 bg-white/80 backdrop-blur-lg dark:bg-slate-800 px-4 py-2 focus-within:border-indigo-500">
                              <input
                                type="text"
                                placeholder="Viết phản hồi..."
                                value={commentInputs[post.id] || ''}
                                onChange={(e) => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                                onClick={() => !currentUser && onLogin()}
                                className="w-full bg-transparent text-sm outline-none"
                              />
                              <button type="submit" disabled={!commentInputs[post.id]?.trim()} className="text-indigo-600 hover:text-indigo-700 disabled:text-zinc-300">
                                <Send className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </form>
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
        })}
        {posts.length === 0 && (
          <div className="py-12 text-center text-zinc-500 dark:text-slate-400">Chưa có bài viết nào. Hãy là người đầu tiên!</div>
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
    </div>
  );
}

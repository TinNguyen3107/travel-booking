import React, { useState, useEffect } from 'react';
import { Heart, Send, ThumbsUp, Image as ImageIcon, Trash2 } from 'lucide-react';
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
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [submitting, setSubmitting] = useState(false);
  const [activeComments, setActiveComments] = useState<number | null>(null);
  const [commentsData, setCommentsData] = useState<Record<number, PostCommentTable[]>>({});
  const [reactionsData, setReactionsData] = useState<Record<number, PostReactionTable[]>>({});
  // comment input per post
  const [commentInputs, setCommentInputs] = useState<Record<number, string>>({});

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!currentUser) { onLogin(); return; }

    const isVideo = file.type.startsWith('video/');
    if (!file.type.startsWith('image/') && !isVideo) {
      alert('Vui lòng chọn file hình ảnh hoặc video.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setSubmitting(true);
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        setMediaUrl(data.url);
        setMediaType(isVideo ? 'video' : 'image');
      } else {
        const err = await res.json();
        alert(err.error || 'Lỗi tải lên file');
      }
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
      const res = await fetch('/api/posts');
      const data = await res.json();
      setPosts(data);
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
          media_url: mediaUrl || undefined,
          media_type: mediaUrl ? mediaType : undefined
        })
      });
      if (res.ok) {
        setPostContent('');
        setMediaUrl('');
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
      const res = await fetch(`/api/posts/${postId}/comments`);
      const data = await res.json();
      setCommentsData(prev => ({ ...prev, [postId]: data }));
    } catch (e) { console.error(e); }
  };

  const fetchReactions = async (postId: number) => {
    try {
      const res = await fetch(`/api/posts/${postId}/reactions`);
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
      <div className="mb-8 overflow-hidden rounded-2xl border border-zinc-200 dark:border-slate-700 bg-white/80 backdrop-blur-lg border border-white/50 shadow-sm dark:bg-slate-800 shadow-sm">
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

            {mediaUrl && (
              <div className="relative mt-2 rounded-xl bg-zinc-100 dark:bg-slate-800 p-2">
                {mediaType === 'image' ? (
                  <img src={mediaUrl} alt="Preview" className="max-h-64 rounded-lg object-contain" />
                ) : (
                  <video src={mediaUrl} controls className="max-h-64 rounded-lg object-contain" />
                )}
                <button
                  type="button"
                  onClick={() => setMediaUrl('')}
                  className="absolute right-4 top-4 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )}

            <hr className="my-4 border-zinc-100 dark:border-slate-800" />

            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*,video/*" onChange={handleFileUpload} />
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
            <div key={post.id} className="rounded-2xl border border-zinc-200 dark:border-slate-700 bg-white/80 backdrop-blur-lg border border-white/50 shadow-sm dark:bg-slate-800 p-5 shadow-sm">
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
                        {/* Invisible bridge */}
                        <div className="absolute bottom-full left-0 h-4 w-full" />
                        <div className="absolute bottom-full left-0 mb-2 hidden items-center gap-4 rounded-full border border-zinc-200 dark:border-slate-700 bg-white/80 backdrop-blur-lg border border-white/50 shadow-sm dark:bg-slate-800 px-5 py-3 shadow-xl group-hover:flex z-50">
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
                      <div className="mt-2 flex items-center gap-1.5">
                        <div className="flex -space-x-1">
                          {reactionSummary.slice(0, 3).map(([type]) => (
                            <span key={type} className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-white/80 backdrop-blur-lg border border-white/50 shadow-sm dark:bg-slate-800 text-sm shadow-sm" title={reactionLabels[type]}>
                              {tinyReactionEmoji[type]}
                            </span>
                          ))}
                        </div>
                        <span className="text-xs text-zinc-500 dark:text-slate-400 hover:underline cursor-default">
                          {reactionTotal} người
                          {reactionSummary.length <= 2
                            ? ' · ' + reactionSummary.map(([t, c]) => `${reactionLabels[t]} (${c})`).join(', ')
                            : ''}
                        </span>
                      </div>
                    )}

                    {/* Media */}
                    {post.media_url && (
                      <div className="mt-4 bg-zinc-50 dark:bg-slate-900/50 rounded-xl overflow-hidden border border-zinc-200 dark:border-slate-700 inline-block">
                        {post.media_type === 'image' ? (
                          <img src={post.media_url} alt="Post media" className="max-h-64 object-cover" />
                        ) : (
                          <video src={post.media_url} controls className="max-h-64 object-cover" />
                        )}
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
                            <div className="flex items-center gap-2 rounded-2xl border border-zinc-300 dark:border-slate-600 bg-white/80 backdrop-blur-lg border border-white/50 shadow-sm dark:bg-slate-800 px-4 py-2 focus-within:border-indigo-500">
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

                {currentUser?.role === 'admin' && (
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
    </div>
  );
}

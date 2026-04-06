import { apiFetch, handleApiResponse } from '@lib/api';

export interface ForumAuthor {
  id: string;
  nickname: string;
  avatarUrl?: string;
  equippedFrame?: string;
  frameUrl?: string;
  exp?: number;
  displayedTitleKey?: string | null;
  rankName?: string;
  rankColor?: string;
  titleName?: string | null;
  titleColor?: string | null;
  expToNext?: number;
  nextRankName?: string | null;
  coins?: number;
  stardust?: number;
}

export interface ForumBoard {
  id: string;
  key: string;
  name: string;
  description?: string;
  icon?: string;
  postCount: number;
}

export interface ForumPostSummary {
  id: string;
  title: string;
  isPinned: boolean;
  isEssence: boolean;
  isLocked: boolean;
  viewCount: number;
  likeCount: number;
  replyCount: number;
  bountyCoin: number;
  lastReplyAt: string;
  createdAt: string;
  author: ForumAuthor;
  lastReplyBy?: { id: string; nickname: string } | null;
}

export interface ForumReplyItem {
  id: string;
  content: string;
  isBestReply: boolean;
  createdAt: string;
  updatedAt: string;
  author: ForumAuthor;
}

export interface ForumPostDetail extends ForumPostSummary {
  content: string;
  bestReplyId?: string | null;
  updatedAt: string;
  hasLiked: boolean;
  board: { key: string; name: string };
  replies: ForumReplyItem[];
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface BoardPostsResult {
  pinnedPosts: ForumPostSummary[];
  essencePosts: ForumPostSummary[];
  posts: ForumPostSummary[];
  pagination: Pagination;
}

export async function getForumBoards(): Promise<{ boards: ForumBoard[] }> {
  const res = await apiFetch('/forum/boards');
  const data = await handleApiResponse<{ boards: ForumBoard[] }>(res);
  return data;
}

export async function getBoardPosts(
  key: string,
  page = 1,
  limit = 20,
  sort: 'newest' | 'last_reply' = 'last_reply'
): Promise<BoardPostsResult> {
  const res = await apiFetch(
    `/forum/boards/${encodeURIComponent(key)}/posts?page=${page}&limit=${limit}&sort=${sort}`
  );
  const data = await handleApiResponse<BoardPostsResult>(res);
  return data;
}

export async function getPostDetail(id: string): Promise<{ post: ForumPostDetail }> {
  const res = await apiFetch(`/forum/posts/${encodeURIComponent(id)}`);
  const data = await handleApiResponse<{ post: ForumPostDetail }>(res);
  return data;
}

export async function createPost(body: {
  boardKey: string;
  title: string;
  content: string;
  bountyCoin?: number;
}): Promise<{ post: { id: string }; reward?: { rewardExp: number; rewardCoin: number } }> {
  const res = await apiFetch('/forum/posts', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  const data = await handleApiResponse<{ post: { id: string }; reward?: { rewardExp: number; rewardCoin: number } }>(res);
  return data;
}

export async function updatePost(
  postId: string,
  body: { title?: string; content?: string }
): Promise<{ post: ForumPostDetail }> {
  const res = await apiFetch(`/forum/posts/${encodeURIComponent(postId)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  return handleApiResponse(res);
}

export async function createReply(
  postId: string,
  content: string
): Promise<{ reply: { id: string }; reward?: { rewardExp: number; rewardCoin: number } }> {
  const res = await apiFetch(`/forum/posts/${encodeURIComponent(postId)}/replies`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  });
  return handleApiResponse(res);
}

export async function updateReply(
  replyId: string,
  content: string
): Promise<{ reply: ForumReplyItem }> {
  const res = await apiFetch(`/forum/replies/${encodeURIComponent(replyId)}`, {
    method: 'PATCH',
    body: JSON.stringify({ content }),
  });
  return handleApiResponse(res);
}

export async function toggleLike(postId: string): Promise<{ liked: boolean }> {
  const res = await apiFetch(`/forum/posts/${encodeURIComponent(postId)}/like`, {
    method: 'POST',
  });
  const data = await handleApiResponse<{ liked: boolean }>(res);
  return data;
}

export async function setBestReply(postId: string, replyId: string): Promise<void> {
  await apiFetch(`/forum/posts/${encodeURIComponent(postId)}/best-reply`, {
    method: 'POST',
    body: JSON.stringify({ replyId }),
  });
}

export async function toggleEssence(postId: string): Promise<{ isEssence: boolean }> {
  const res = await apiFetch(`/forum/posts/${encodeURIComponent(postId)}/essence`, {
    method: 'POST',
  });
  return handleApiResponse(res);
}

export async function togglePin(postId: string): Promise<{ isPinned: boolean }> {
  const res = await apiFetch(`/forum/posts/${encodeURIComponent(postId)}/pin`, {
    method: 'POST',
  });
  return handleApiResponse(res);
}

export async function deletePost(postId: string): Promise<void> {
  await apiFetch(`/forum/posts/${encodeURIComponent(postId)}`, {
    method: 'DELETE',
  });
}

export async function deleteReply(replyId: string): Promise<void> {
  await apiFetch(`/forum/replies/${encodeURIComponent(replyId)}`, {
    method: 'DELETE',
  });
}

// 版块管理员相关
export async function getBoardModerators(boardKey: string): Promise<{ moderators: { id: string; userId: string; nickname: string; avatarUrl?: string }[] }> {
  const res = await apiFetch(`/forum/boards/${encodeURIComponent(boardKey)}/moderators`);
  return handleApiResponse(res);
}

export async function getMyModeratedBoards(): Promise<{ boardKeys: string[] }> {
  const res = await apiFetch('/forum/users/me/moderated-boards');
  return handleApiResponse(res);
}

export async function addBoardModerator(boardKey: string, userId: string): Promise<{ message: string }> {
  const res = await apiFetch(`/forum/boards/${encodeURIComponent(boardKey)}/moderators`, {
    method: 'POST',
    body: JSON.stringify({ userId }),
  });
  return handleApiResponse(res);
}

export async function removeBoardModerator(boardKey: string, userId: string): Promise<{ message: string }> {
  const res = await apiFetch(`/forum/boards/${encodeURIComponent(boardKey)}/moderators/${encodeURIComponent(userId)}`, {
    method: 'DELETE',
  });
  return handleApiResponse(res);
}

export async function getUserForumStats(userId: string): Promise<{
  postCount: number;
  replyCount: number;
  likeCountReceived: number;
  bestReplyCount: number;
}> {
  const res = await apiFetch(`/forum/users/${encodeURIComponent(userId)}/stats`);
  const data = await handleApiResponse<{
    postCount: number;
    replyCount: number;
    likeCountReceived: number;
    bestReplyCount: number;
  }>(res);
  return data;
}

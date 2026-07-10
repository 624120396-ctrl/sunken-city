import { apiFetch, handleApiResponse } from '@lib/api';
import type {
  AdminGlobalRecruitmentReportView,
  GlobalRecruitmentPostPayload,
  GlobalRecruitmentPostView,
  GlobalRecruitmentReportPayload,
  GlobalRecruitmentResponsePayload,
  GlobalRecruitmentResponseStatus,
  GlobalRecruitmentResponseView,
  GlobalRecruitmentSourceType,
} from '@/types/global-recruitment-contract';

export interface GlobalRecruitmentListFilters {
  status?: 'OPEN' | 'CLOSED' | 'EXPIRED' | 'ALL';
  sourceType?: GlobalRecruitmentSourceType | 'ALL';
  q?: string;
  mine?: boolean;
}

function toQuery(filters: GlobalRecruitmentListFilters = {}) {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.sourceType) params.set('sourceType', filters.sourceType);
  if (filters.q?.trim()) params.set('q', filters.q.trim());
  if (filters.mine) params.set('mine', '1');
  const query = params.toString();
  return query ? `?${query}` : '';
}

export async function listGlobalRecruitments(filters?: GlobalRecruitmentListFilters): Promise<GlobalRecruitmentPostView[]> {
  const data = await apiFetch(`/recruitments${toQuery(filters)}`)
    .then(res => handleApiResponse<{ posts: GlobalRecruitmentPostView[] }>(res));
  return data.posts;
}

export async function createGlobalRecruitment(payload: GlobalRecruitmentPostPayload): Promise<GlobalRecruitmentPostView> {
  const data = await apiFetch('/recruitments', {
    method: 'POST',
    body: JSON.stringify(payload),
  }).then(res => handleApiResponse<{ post: GlobalRecruitmentPostView }>(res));
  return data.post;
}

export async function updateGlobalRecruitment(
  postId: string,
  payload: Partial<GlobalRecruitmentPostPayload>
): Promise<GlobalRecruitmentPostView> {
  const data = await apiFetch(`/recruitments/${encodeURIComponent(postId)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }).then(res => handleApiResponse<{ post: GlobalRecruitmentPostView }>(res));
  return data.post;
}

export async function respondGlobalRecruitment(
  postId: string,
  payload: GlobalRecruitmentResponsePayload
): Promise<GlobalRecruitmentResponseView> {
  const data = await apiFetch(`/recruitments/${encodeURIComponent(postId)}/responses`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }).then(res => handleApiResponse<{ response: GlobalRecruitmentResponseView }>(res));
  return data.response;
}

export async function updateGlobalRecruitmentResponse(
  postId: string,
  responseId: string,
  status: GlobalRecruitmentResponseStatus
): Promise<GlobalRecruitmentResponseView> {
  const data = await apiFetch(
    `/recruitments/${encodeURIComponent(postId)}/responses/${encodeURIComponent(responseId)}`,
    {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }
  ).then(res => handleApiResponse<{ response: GlobalRecruitmentResponseView }>(res));
  return data.response;
}

export async function reportGlobalRecruitment(postId: string, payload: GlobalRecruitmentReportPayload): Promise<void> {
  await apiFetch(`/recruitments/${encodeURIComponent(postId)}/reports`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }).then(res => handleApiResponse<{ reportId: string }>(res));
}

export async function listAdminGlobalRecruitmentReports(status: 'OPEN' | 'RESOLVED' | 'DISMISSED' | 'ALL' = 'OPEN') {
  const data = await apiFetch(`/admin/recruitments/reports?status=${status}`)
    .then(res => handleApiResponse<{ reports: AdminGlobalRecruitmentReportView[] }>(res));
  return data.reports;
}

export async function reviewAdminGlobalRecruitmentReport(
  reportId: string,
  payload: { status: 'RESOLVED' | 'DISMISSED'; closePost?: boolean }
) {
  return apiFetch(`/admin/recruitments/reports/${encodeURIComponent(reportId)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }).then(res => handleApiResponse<{ reportId: string; status: string }>(res));
}

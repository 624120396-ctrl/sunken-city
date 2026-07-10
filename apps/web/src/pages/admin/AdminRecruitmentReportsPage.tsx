import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, ShieldAlert, X } from 'lucide-react';
import { Button } from '@components/system';
import {
  listAdminGlobalRecruitmentReports,
  reviewAdminGlobalRecruitmentReport,
} from '@services/global-recruitment.service';
import type { GlobalRecruitmentReportReason } from '@/types/global-recruitment-contract';

const reasonLabels: Record<GlobalRecruitmentReportReason, string> = {
  HARASSMENT: '骚扰或越界联系',
  SPAM: '垃圾信息',
  MISLEADING: '内容不实',
  UNSAFE: '安全风险',
  OTHER: '其他',
};

export function AdminRecruitmentReportsPage() {
  const [status, setStatus] = useState<'OPEN' | 'RESOLVED' | 'DISMISSED' | 'ALL'>('OPEN');
  const queryClient = useQueryClient();
  const reportsQuery = useQuery({
    queryKey: ['admin-global-recruitment-reports', status],
    queryFn: () => listAdminGlobalRecruitmentReports(status),
  });
  const reviewMutation = useMutation({
    mutationFn: ({ reportId, nextStatus, closePost }: {
      reportId: string;
      nextStatus: 'RESOLVED' | 'DISMISSED';
      closePost?: boolean;
    }) => reviewAdminGlobalRecruitmentReport(reportId, { status: nextStatus, closePost }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-global-recruitment-reports'] }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-serif font-bold text-coc-parchment flex items-center gap-2">
          <ShieldAlert className="text-coc-accent-red" size={26} /> 招募举报审核
        </h1>
        <p className="text-sm text-coc-text-muted mt-1">处理公共招募的骚扰、虚假与安全风险报告。关闭条目不会改动任何房间生命周期。</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(['OPEN', 'RESOLVED', 'DISMISSED', 'ALL'] as const).map(item => (
          <Button key={item} size="sm" variant={status === item ? 'primary' : 'ghost'} onClick={() => setStatus(item)}>
            {{ OPEN: '待处理', RESOLVED: '已处理', DISMISSED: '已忽略', ALL: '全部' }[item]}
          </Button>
        ))}
      </div>

      {reportsQuery.isLoading ? (
        <div className="text-coc-text-muted">正在读取举报记录...</div>
      ) : reportsQuery.data?.length ? (
        <div className="space-y-3">
          {reportsQuery.data.map(report => (
            <article key={report.id} className="bg-coc-bg-tertiary border border-coc-border rounded-lg p-5 space-y-3">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-coc-text-muted">
                <span className="text-coc-accent-gold">{reasonLabels[report.reason]}</span>
                <span>举报人：{report.reporterName}</span>
                <span>条目状态：{report.post.status}</span>
                <span>{new Date(report.createdAt).toLocaleString('zh-CN')}</span>
              </div>
              <div>
                <h2 className="text-lg text-coc-parchment font-semibold">{report.post.title}</h2>
                <p className="text-sm text-coc-text-secondary">发起人：{report.post.authorName}</p>
                {report.note && <p className="mt-2 text-sm text-coc-text-primary whitespace-pre-wrap">{report.note}</p>}
              </div>
              {report.status === 'OPEN' ? (
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="secondary" icon={<Check size={14} />} loading={reviewMutation.isPending}
                    onClick={() => reviewMutation.mutate({ reportId: report.id, nextStatus: 'RESOLVED' })}>
                    标记已处理
                  </Button>
                  <Button size="sm" variant="danger" icon={<ShieldAlert size={14} />} loading={reviewMutation.isPending}
                    onClick={() => reviewMutation.mutate({ reportId: report.id, nextStatus: 'RESOLVED', closePost: true })}>
                    关闭招募并处理
                  </Button>
                  <Button size="sm" variant="ghost" icon={<X size={14} />} loading={reviewMutation.isPending}
                    onClick={() => reviewMutation.mutate({ reportId: report.id, nextStatus: 'DISMISSED' })}>
                    忽略
                  </Button>
                </div>
              ) : <p className="text-xs text-coc-text-muted">审核状态：{report.status === 'RESOLVED' ? '已处理' : '已忽略'}</p>}
            </article>
          ))}
        </div>
      ) : <div className="text-coc-text-muted">当前筛选下没有举报记录。</div>}

      {reviewMutation.error && <p className="text-sm text-red-400">{(reviewMutation.error as Error).message}</p>}
    </div>
  );
}

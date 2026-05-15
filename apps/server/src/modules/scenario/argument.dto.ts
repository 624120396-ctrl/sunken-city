/**
 * 论证数据传输对象
 */

export interface SubmitArgumentDto {
  doubtId: string;
  selectedClueIds: string[];
}

export interface ArgumentResultDto {
  success: boolean;
  result: 'SUCCESS' | 'FAIL' | 'INSUFFICIENT_CLUES';
  message: string;
  nextNodeId: string;
  accuracy?: number;
  punishment?: {
    sanityLoss?: number;
    triggerBE?: boolean;
  };
}

export interface ArgumentRecordView {
  id: string;
  sessionId: string;
  doubtId: string;
  selectedClueIds: string[];
  result: 'SUCCESS' | 'FAIL' | 'ABORT';
  createdAt: Date;
}

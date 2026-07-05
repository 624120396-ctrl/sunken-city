import { apiFetch, handleApiResponse } from '@lib/api';
import type { RoomListOverviewItem, RoomOperationsOverview, RoomReportArchiveItem } from '@/types/room-overview-contract';

export function getRoomOperationsOverview(roomId: string): Promise<RoomOperationsOverview> {
  return apiFetch(`/rooms/${roomId}/overview`)
    .then(res => handleApiResponse<RoomOperationsOverview>(res));
}

export function getRoomListOverview(): Promise<RoomListOverviewItem[]> {
  return apiFetch('/rooms/overview/list-summary')
    .then(res => handleApiResponse<{ rooms: RoomListOverviewItem[] }>(res))
    .then(data => data.rooms);
}

export function getRoomReportArchive(): Promise<RoomReportArchiveItem[]> {
  return apiFetch('/rooms/overview/report-archive')
    .then(res => handleApiResponse<{ archives: RoomReportArchiveItem[] }>(res))
    .then(data => data.archives);
}

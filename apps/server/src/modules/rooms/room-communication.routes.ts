import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth';
import {
  createRoomQueueItem,
  deleteRoomQueueItem,
  getRoomCommunication,
  saveRoomCommunicationState,
  updateRoomQueueItem,
} from './room-communication.service';

const router = Router();

router.get('/:roomId/communication', authMiddleware, getRoomCommunication);
router.put('/:roomId/communication/state', authMiddleware, saveRoomCommunicationState);
router.patch('/:roomId/communication/state', authMiddleware, saveRoomCommunicationState);
router.post('/:roomId/communication/queue', authMiddleware, createRoomQueueItem);
router.patch('/:roomId/communication/queue/:itemId', authMiddleware, updateRoomQueueItem);
router.delete('/:roomId/communication/queue/:itemId', authMiddleware, deleteRoomQueueItem);

export default router;

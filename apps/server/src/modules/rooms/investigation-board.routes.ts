import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth';
import {
  createInvestigationClue,
  deleteInvestigationClue,
  getInvestigationClues,
  revealInvestigationClue,
  updateInvestigationClue,
} from './investigation-clue.service';
import {
  archiveImportantRoomMessage,
  archiveKeyDiceRoll,
  createManualInvestigationLog,
  getInvestigationTimeline,
  updateInvestigationLogPin,
} from './investigation-log.service';
import {
  createInvestigationNpc,
  deleteInvestigationNpc,
  getInvestigationNpcs,
  revealInvestigationNpc,
  updateInvestigationNpc,
} from './investigation-npc.service';
import {
  createInvestigationScene,
  deleteInvestigationScene,
  getInvestigationScenes,
  setCurrentInvestigationScene,
  updateInvestigationScene,
} from './investigation-scene.service';
import {
  createKpPrivateNote,
  deleteKpPrivateNote,
  getKpPrivateNotes,
  updateKpPrivateNote,
} from './kp-note.service';
import { getCurrentFocus, saveCurrentFocus } from './session-recap.service';
import { getCharacterSyncStatus, getSessionPrep, saveSessionPrep } from './session-prep.service';

const router = Router();

router.get('/:roomId/investigation/clues', authMiddleware, getInvestigationClues);
router.post('/:roomId/investigation/clues', authMiddleware, createInvestigationClue);
router.patch('/:roomId/investigation/clues/:clueId', authMiddleware, updateInvestigationClue);
router.post('/:roomId/investigation/clues/:clueId/reveal', authMiddleware, revealInvestigationClue);
router.delete('/:roomId/investigation/clues/:clueId', authMiddleware, deleteInvestigationClue);

router.get('/:roomId/investigation/npcs', authMiddleware, getInvestigationNpcs);
router.post('/:roomId/investigation/npcs', authMiddleware, createInvestigationNpc);
router.patch('/:roomId/investigation/npcs/:npcId', authMiddleware, updateInvestigationNpc);
router.post('/:roomId/investigation/npcs/:npcId/reveal', authMiddleware, revealInvestigationNpc);
router.delete('/:roomId/investigation/npcs/:npcId', authMiddleware, deleteInvestigationNpc);

router.get('/:roomId/investigation/scenes', authMiddleware, getInvestigationScenes);
router.post('/:roomId/investigation/scenes', authMiddleware, createInvestigationScene);
router.patch('/:roomId/investigation/scenes/:sceneId', authMiddleware, updateInvestigationScene);
router.post('/:roomId/investigation/scenes/:sceneId/current', authMiddleware, setCurrentInvestigationScene);
router.delete('/:roomId/investigation/scenes/:sceneId', authMiddleware, deleteInvestigationScene);

router.get('/:roomId/investigation/timeline', authMiddleware, getInvestigationTimeline);
router.post('/:roomId/investigation/timeline', authMiddleware, createManualInvestigationLog);
router.post('/:roomId/investigation/timeline/important-message', authMiddleware, archiveImportantRoomMessage);
router.post('/:roomId/investigation/timeline/key-dice', authMiddleware, archiveKeyDiceRoll);
router.patch('/:roomId/investigation/timeline/:entryId/pin', authMiddleware, updateInvestigationLogPin);

router.get('/:roomId/investigation/kp-notes', authMiddleware, getKpPrivateNotes);
router.post('/:roomId/investigation/kp-notes', authMiddleware, createKpPrivateNote);
router.patch('/:roomId/investigation/kp-notes/:noteId', authMiddleware, updateKpPrivateNote);
router.delete('/:roomId/investigation/kp-notes/:noteId', authMiddleware, deleteKpPrivateNote);

router.get('/:roomId/investigation/session-prep', authMiddleware, getSessionPrep);
router.put('/:roomId/investigation/session-prep', authMiddleware, saveSessionPrep);
router.patch('/:roomId/investigation/session-prep', authMiddleware, saveSessionPrep);
router.get('/:roomId/investigation/character-sync', authMiddleware, getCharacterSyncStatus);

router.get('/:roomId/investigation/current-focus', authMiddleware, getCurrentFocus);
router.put('/:roomId/investigation/current-focus', authMiddleware, saveCurrentFocus);
router.patch('/:roomId/investigation/current-focus', authMiddleware, saveCurrentFocus);

export default router;

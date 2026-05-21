import { create } from 'zustand';

export interface SoloEdge {
  id: string;
  label: string;
  type: string;
  conditions: Record<string, any> | null;
  priority: number;
  isDefault: boolean;
  targetNodeId: string;
}

export interface SoloNode {
  id: string;
  worldState: string;
  title: string;
  type: string;
  content: string;
  metadata: {
    stageDirection?: string;
    clues?: string[];
    npcs?: Array<{
      name: string;
      profile?: string;
      mood?: string;
      dialogueRounds?: Array<{
        playerOptions: string[];
        npcReplies: string[];
      }>;
      dialogueHint?: string;
    }>;
  } | null;
}

export interface SoloGlobalState {
  corruption: number;
  currentWorld: 'normal' | 'corrupted';
  visitedNodes: Array<{ nodeId: string; worldState: string; visitedAt: string }>;
  unlockedClues: string[];
  inventory: string[];
  checkpointFlags: string[];
  lastCheckResult?: {
    skill: string;
    rolledValue: number;
    isSuccess: boolean;
    successLevel: string;
    timestamp: string;
  } | null;
  npcTalkHistory?: Array<{
    npcName: string;
    playerChoice: string;
    npcReply: string;
    roundIndex: number;
  }>;
}

export interface SoloSessionData {
  sessionId: string;
  status: string;
  scenario: {
    id: string;
    title: string;
  };
  node: SoloNode;
  globalState: SoloGlobalState;
  aiText?: string | null;
  edges: SoloEdge[];
  visitedNodes: Array<{ nodeId: string; worldState: string; visitedAt: string }>;
  characterRuntime: Record<string, any> | null;
  sceneImageUrl?: string | null;
  inventory: string[];
}

interface SoloState {
  sessionId: string | null;
  session: SoloSessionData | null;
  isLoading: boolean;
  error: string | null;
  worldTransitioning: boolean;

  setSession: (session: SoloSessionData) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setWorldTransitioning: (v: boolean) => void;
  clearSession: () => void;
  initSession: (scenarioId: string) => Promise<void>;

  // optimistic local updates
  updateGlobalState: (patch: Partial<SoloGlobalState>) => void;
}

export const useSoloStore = create<SoloState>((set) => ({
  sessionId: null,
  session: null,
  isLoading: false,
  error: null,
  worldTransitioning: false,

  setSession: (session) => set({
    session,
    sessionId: session.sessionId,
    error: null,
  }),

  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  setWorldTransitioning: (worldTransitioning) => set({ worldTransitioning }),
  clearSession: () => set({ sessionId: null, session: null, error: null }),

  initSession: async (scenarioId: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`/api/solo/session?scenarioId=${scenarioId}`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      
      if (!data.success) {
        throw new Error(data.error?.message || '创建会话失败');
      }
      
      set({
        session: data.data,
        sessionId: data.data.sessionId,
        isLoading: false,
      });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
      throw err;
    }
  },

  updateGlobalState: (patch) => set((state) => {
    if (!state.session) return state;
    return {
      session: {
        ...state.session,
        globalState: {
          ...state.session.globalState,
          ...patch,
        },
      },
    };
  }),
}));

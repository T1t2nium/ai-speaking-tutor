'use client';

import { create } from 'zustand';
import type { ConversationPhase, WsServerMessage, Evaluation, Correction } from '@tutor/shared';

interface ConversationState {
  phase: ConversationPhase;
  messages: Array<{ role: 'user' | 'ai'; content: string }>;
  interimTranscript: string;
  wsStatus: 'disconnected' | 'connecting' | 'connected';
  error: string | null;
  evaluation: Evaluation | null;
  correctionMap: Record<number, Correction[]>;
  scenario: { id: string; slug: string; title: string; icon: string } | null;

  // Actions
  setPhase: (phase: ConversationPhase) => void;
  setWsStatus: (status: 'disconnected' | 'connecting' | 'connected') => void;
  addMessage: (role: 'user' | 'ai', content: string) => void;
  setInterimTranscript: (text: string) => void;
  setError: (error: string | null) => void;
  handleServerMessage: (msg: WsServerMessage) => void;
  reset: () => void;
}

const initialState = {
  phase: 'idle' as ConversationPhase,
  messages: [] as Array<{ role: 'user' | 'ai'; content: string }>,
  interimTranscript: '',
  wsStatus: 'disconnected' as const,
  error: null as string | null,
  evaluation: null as Evaluation | null,
  correctionMap: {} as Record<number, Correction[]>,
  scenario: null as { id: string; slug: string; title: string; icon: string } | null,
};

export const useConversationStore = create<ConversationState>((set, get) => ({
  ...initialState,

  setPhase: (phase) => set({ phase }),
  setWsStatus: (wsStatus) => set({ wsStatus }),
  setInterimTranscript: (interimTranscript) => set({ interimTranscript }),
  setError: (error) => set({ error }),
  reset: () => set(initialState),

  addMessage: (role, content) => {
    set((state) => ({
      messages: [...state.messages, { role, content }],
    }));
  },

  handleServerMessage: (msg) => {
    switch (msg.type) {
      case 'connected':
        set({ phase: 'idle', scenario: msg.scenario });
        break;

      case 'interim_transcript':
        set({ interimTranscript: msg.text, phase: 'listening' });
        break;

      case 'final_transcript':
        // Append to last user message if one exists (merge fragmented transcripts)
        set((state) => {
          const msgs = [...state.messages];
          const last = msgs[msgs.length - 1];
          if (last?.role === 'user') {
            msgs[msgs.length - 1] = { role: 'user', content: last.content + ' ' + msg.text };
          } else {
            msgs.push({ role: 'user', content: msg.text });
          }
          return { messages: msgs, interimTranscript: '' };
        });
        break;

      case 'ai_response_start':
        if (msg.text) {
          get().addMessage('ai', msg.text);
        }
        set({ phase: 'speaking' });
        break;

      case 'ai_response_end':
        set((state) => {
          // Don't leave evaluating phase (end_session is in progress)
          if (state.phase === 'evaluating') return {};
          return { phase: 'idle' };
        });
        break;

      case 'correction':
        if (msg.messageIndex !== undefined) {
          const clientMsgIndex = msg.messageIndex * 2;
          set((state) => ({
            correctionMap: {
              ...state.correctionMap,
              [clientMsgIndex]: [
                ...(state.correctionMap[clientMsgIndex] || []),
                {
                  id: msg.id,
                  original: msg.original,
                  corrected: msg.corrected,
                  correctionType: msg.correctionType,
                  category: msg.category,
                  explanation: msg.explanation,
                },
              ],
            },
          }));
        }
        break;

      case 'evaluation_result':
        set({ evaluation: msg.evaluation, phase: 'evaluating' });
        break;

      case 'error':
        set({ error: msg.message });
        break;

      case 'fatal_error':
        set({ error: msg.message, phase: 'idle' });
        break;
    }
  },
}));

// Core types for the decision engine

export type Decision =
  | 'execute_silent'
  | 'execute_and_inform'
  | 'confirm_before_execute'
  | 'ask_clarification'
  | 'refuse_escalate';

export interface Action {
  type: string;
  description: string;
  target?: string;
  data?: Record<string, any>;
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface Context {
  latestMessage: string;
  conversationHistory: ConversationMessage[];
  userState?: {
    hasConfirmedSimilarBefore?: boolean;
    trustLevel?: 'new' | 'regular' | 'trusted';
    preferences?: Record<string, any>;
  };
}

export interface RiskSignals {
  financialRisk: number; // 0-100
  privacyRisk: number; // 0-100
  reversibilityScore: number; // 0-100 (100 = fully reversible)
  externalPartyRisk: number; // 0-100
  clarityScore: number; // 0-100
  contextConsistency: number; // 0-100
  urgency: 'low' | 'medium' | 'high';
}

export interface DecisionRequest {
  action: Action;
  context: Context;
}

export interface DecisionResponse {
  decision: Decision;
  rationale: string;
  confidence: number; // 0-100
  signals: RiskSignals;
  rawLLMResponse?: string;
  prompt?: string;
  error?: string;
}

export interface ScenarioExample {
  id: string;
  name: string;
  category: 'easy' | 'ambiguous' | 'adversarial';
  request: DecisionRequest;
  expectedBehavior?: string;
}
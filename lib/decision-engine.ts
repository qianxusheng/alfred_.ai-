// Core decision engine logic

import {
  Decision,
  DecisionRequest,
  DecisionResponse,
  RiskSignals,
} from './types';

export class DecisionEngine {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Main decision method - orchestrates the decision process
   */
  async decide(request: DecisionRequest): Promise<DecisionResponse> {
    try {
      // Step 1: Compute deterministic signals
      const signals = this.computeRiskSignals(request);

      // Step 2: Apply deterministic rules (fail-fast)
      const ruleBasedDecision = this.applyDeterministicRules(signals, request);
      if (ruleBasedDecision) {
        return {
          decision: ruleBasedDecision.decision,
          rationale: ruleBasedDecision.rationale,
          confidence: 95, // High confidence for rule-based decisions
          signals,
        };
      }

      // Step 3: Prepare LLM prompt
      const prompt = this.buildPrompt(request, signals);

      // Step 4: Get LLM decision
      const llmResponse = await this.getLLMDecision(prompt);

      // Step 5: Parse and validate LLM response
      const decision = this.parseLLMResponse(llmResponse, signals);

      return {
        ...decision,
        signals,
        prompt,
        rawLLMResponse: llmResponse,
      };
    } catch (error) {
      // Default to safe behavior on error
      return {
        decision: 'confirm_before_execute',
        rationale: 'System uncertainty - requesting confirmation for safety',
        confidence: 0,
        signals: this.getDefaultSignals(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Compute risk signals from the request
   */
  private computeRiskSignals(request: DecisionRequest): RiskSignals {
    const { action, context } = request;

    // Financial risk detection
    const financialRisk = this.calculateFinancialRisk(action, context);

    // Privacy risk (sharing data, access permissions, etc.)
    const privacyRisk = this.calculatePrivacyRisk(action);

    // Can this action be undone?
    const reversibilityScore = this.calculateReversibility(action);

    // Risk from external parties (emails to outside org, etc.)
    const externalPartyRisk = this.calculateExternalRisk(action);

    // How clear is the user's intent?
    const clarityScore = this.calculateClarity(context);

    // Does this align with conversation history?
    const contextConsistency = this.calculateConsistency(request);

    // Urgency detection
    const urgency = this.detectUrgency(context);

    return {
      financialRisk,
      privacyRisk,
      reversibilityScore,
      externalPartyRisk,
      clarityScore,
      contextConsistency,
      urgency,
    };
  }

  /**
   * Apply deterministic rules that bypass LLM
   */
  private applyDeterministicRules(
    signals: RiskSignals,
    request: DecisionRequest
  ): { decision: Decision; rationale: string } | null {
    // Rule 1: Always refuse if financial risk is extreme
    if (signals.financialRisk > 90) {
      return {
        decision: 'refuse_escalate',
        rationale: 'Financial risk too high - requires manual review',
      };
    }

    // Rule 2: Missing critical context
    if (!request.context.latestMessage || !request.action.type) {
      return {
        decision: 'ask_clarification',
        rationale: 'Missing critical information to make decision',
      };
    }

    // Rule 3: Clear contradiction with recent history
    if (signals.contextConsistency < 20 && signals.financialRisk > 30) {
      return {
        decision: 'confirm_before_execute',
        rationale: 'Action contradicts recent conversation - confirming intent',
      };
    }

    // Rule 4: Low risk + high clarity + consistent = execute silently
    if (
      signals.financialRisk < 10 &&
      signals.privacyRisk < 10 &&
      signals.clarityScore > 90 &&
      signals.contextConsistency > 80 &&
      signals.reversibilityScore > 80
    ) {
      return {
        decision: 'execute_silent',
        rationale: 'Low risk action with clear intent',
      };
    }

    return null; // No deterministic rule applies
  }

  /**
   * Build the LLM prompt
   */
  private buildPrompt(request: DecisionRequest, signals: RiskSignals): string {
    const { action, context } = request;

    return `You are alfred_, an AI assistant that helps users manage their digital life through text messages.

DECISION TASK:
Analyze the following action request and context to determine the appropriate execution strategy.

ACTION TO EVALUATE:
Type: ${action.type}
Description: ${action.description}
Target: ${action.target || 'N/A'}
Additional Data: ${JSON.stringify(action.data || {})}

LATEST USER MESSAGE:
"${context.latestMessage}"

CONVERSATION HISTORY (last 5 messages):
${context.conversationHistory
  .slice(-5)
  .map((msg) => `[${msg.role}]: ${msg.content}`)
  .join('\n')}

COMPUTED RISK SIGNALS:
- Financial Risk: ${signals.financialRisk}/100
- Privacy Risk: ${signals.privacyRisk}/100
- Reversibility: ${signals.reversibilityScore}/100
- External Party Risk: ${signals.externalPartyRisk}/100
- Clarity Score: ${signals.clarityScore}/100
- Context Consistency: ${signals.contextConsistency}/100
- Urgency: ${signals.urgency}

DECISION OPTIONS:
1. execute_silent - Perform the action without confirmation
2. execute_and_inform - Perform the action and tell the user afterwards
3. confirm_before_execute - Ask for confirmation before proceeding
4. ask_clarification - Request more information before deciding
5. refuse_escalate - Refuse the action or escalate to human review

DECISION BOUNDARIES:
- Choose "ask_clarification" when intent, entity, or key parameters are unresolved
- Choose "confirm_before_execute" when intent is resolved but risk is above silent execution threshold
- Choose "refuse_escalate" when policy disallows the action, or risk/uncertainty remains too high

Consider the FULL conversation history, not just the latest message. For example, if the user previously said "hold off" but now says "send it", consider what "it" refers to and whether the hold is still in effect.

Respond with a JSON object:
{
  "decision": "<one of the five options>",
  "rationale": "<brief explanation of your decision>",
  "confidence": <0-100>,
  "key_factors": ["<factor1>", "<factor2>", ...]
}`;
  }

  /**
   * Call the LLM API
   */
  private async getLLMDecision(prompt: string): Promise<string> {
    // Simulate timeout for demonstration
    if (Math.random() < 0.05) {
      throw new Error('LLM timeout');
    }

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are a decision engine for alfred_, an AI assistant. Analyze requests carefully and respond with JSON.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.3, // Lower temperature for more consistent decisions
          max_tokens: 500,
        }),
      });

      if (!response.ok) {
        throw new Error(`LLM API error: ${response.status}`);
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      // Fallback for demo/testing when no API key
      return this.getMockLLMResponse(prompt);
    }
  }

  /**
   * Parse and validate LLM response
   */
  private parseLLMResponse(
    llmResponse: string,
    signals: RiskSignals
  ): Omit<DecisionResponse, 'signals' | 'prompt' | 'rawLLMResponse'> {
    try {
      // Handle potential malformed JSON
      const cleanedResponse = llmResponse
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();

      const parsed = JSON.parse(cleanedResponse);

      // Validate the decision is one of our allowed values
      const validDecisions: Decision[] = [
        'execute_silent',
        'execute_and_inform',
        'confirm_before_execute',
        'ask_clarification',
        'refuse_escalate',
      ];

      if (!validDecisions.includes(parsed.decision)) {
        throw new Error('Invalid decision value from LLM');
      }

      return {
        decision: parsed.decision,
        rationale: parsed.rationale || 'No rationale provided',
        confidence: parsed.confidence || 50,
      };
    } catch (error) {
      // Malformed output - default to safe behavior
      return {
        decision: 'confirm_before_execute',
        rationale: 'Unable to parse LLM response - defaulting to confirmation',
        confidence: 0,
        error: 'Malformed LLM output',
      };
    }
  }

  // Helper methods for signal computation

  private calculateFinancialRisk(action: any, context: any): number {
    const keywords = ['payment', 'transfer', 'buy', 'purchase', 'send money', 'invoice', 'discount'];
    const hasFinancialKeyword = keywords.some(
      (kw) =>
        action.description?.toLowerCase().includes(kw) ||
        action.type?.toLowerCase().includes(kw)
    );

    if (!hasFinancialKeyword) return 0;

    // Check for amounts
    const amountMatch = action.description?.match(/\$?(\d+)/);
    if (amountMatch) {
      const amount = parseInt(amountMatch[1]);
      if (amount > 10000) return 90;
      if (amount > 1000) return 70;
      if (amount > 100) return 40;
    }

    return 30; // Default financial risk when money is involved
  }

  private calculatePrivacyRisk(action: any): number {
    const sensitiveKeywords = ['password', 'ssn', 'credit card', 'personal', 'private', 'confidential'];
    const hasSensitive = sensitiveKeywords.some(
      (kw) => action.description?.toLowerCase().includes(kw)
    );
    return hasSensitive ? 80 : 20;
  }

  private calculateReversibility(action: any): number {
    const irreversibleActions = ['delete', 'remove', 'cancel', 'close', 'terminate'];
    const isIrreversible = irreversibleActions.some(
      (kw) => action.type?.toLowerCase().includes(kw)
    );
    return isIrreversible ? 10 : 80;
  }

  private calculateExternalRisk(action: any): number {
    const hasExternal =
      action.target?.includes('@') && !action.target?.includes('@company.com');
    return hasExternal ? 60 : 10;
  }

  private calculateClarity(context: any): number {
    const latestMsg = context.latestMessage?.toLowerCase() || '';
    const vagueTerms = ['it', 'that', 'this', 'them', 'those'];
    const hasVagueTerms = vagueTerms.some((term) => latestMsg.includes(term));

    if (latestMsg.length < 10) return 30; // Very short messages are unclear
    if (hasVagueTerms) return 50;
    return 80;
  }

  private calculateConsistency(request: any): number {
    const history = request.context.conversationHistory || [];
    if (history.length < 2) return 70; // Not enough history to judge

    // Check for contradictions
    const latestMsg = request.context.latestMessage?.toLowerCase();
    const recentMessages = history.slice(-3);

    for (const msg of recentMessages) {
      if (msg.content.toLowerCase().includes('hold off') ||
          msg.content.toLowerCase().includes('wait') ||
          msg.content.toLowerCase().includes('cancel')) {
        if (latestMsg?.includes('send') || latestMsg?.includes('go ahead')) {
          return 30; // Potential contradiction
        }
      }
    }

    return 85;
  }

  private detectUrgency(context: any): 'low' | 'medium' | 'high' {
    const urgentKeywords = ['asap', 'urgent', 'immediately', 'now', 'quickly'];
    const hasUrgent = urgentKeywords.some(
      (kw) => context.latestMessage?.toLowerCase().includes(kw)
    );
    return hasUrgent ? 'high' : 'medium';
  }

  private getDefaultSignals(): RiskSignals {
    return {
      financialRisk: 50,
      privacyRisk: 50,
      reversibilityScore: 50,
      externalPartyRisk: 50,
      clarityScore: 50,
      contextConsistency: 50,
      urgency: 'medium',
    };
  }

  /**
   * Mock LLM response for testing without API key
   */
  private getMockLLMResponse(prompt: string): string {
    // Simple mock logic based on signals in the prompt
    if (prompt.includes('Financial Risk: 0/100') && prompt.includes('Clarity Score: 90/100')) {
      return JSON.stringify({
        decision: 'execute_silent',
        rationale: 'Low risk action with clear intent',
        confidence: 85,
        key_factors: ['low_risk', 'high_clarity'],
      });
    }

    return JSON.stringify({
      decision: 'confirm_before_execute',
      rationale: 'Mock response - defaulting to confirmation',
      confidence: 60,
      key_factors: ['mock_mode'],
    });
  }
}
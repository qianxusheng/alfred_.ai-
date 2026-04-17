'use client';

import { useState } from 'react';
import { scenarios } from '@/lib/scenarios';
import {
  DecisionRequest,
  DecisionResponse,
  ScenarioExample,
  ConversationMessage,
  Decision,
} from '@/lib/types';

export default function DecisionDemo() {
  const [apiKey, setApiKey] = useState('');
  const [selectedScenario, setSelectedScenario] = useState<ScenarioExample | null>(null);
  const [customRequest, setCustomRequest] = useState<DecisionRequest>({
    action: {
      type: '',
      description: '',
      target: '',
    },
    context: {
      latestMessage: '',
      conversationHistory: [],
    },
  });
  const [response, setResponse] = useState<DecisionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [simulateError, setSimulateError] = useState<'none' | 'timeout' | 'malformed' | 'missing'>('none');

  const handleScenarioSelect = (scenario: ScenarioExample) => {
    setSelectedScenario(scenario);
    setCustomRequest(scenario.request);
    setResponse(null);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setResponse(null);

    try {
      // Simulate different error conditions
      if (simulateError === 'timeout') {
        await new Promise((_, reject) => setTimeout(() => reject(new Error('Request timeout')), 2000));
      }

      if (simulateError === 'malformed') {
        // Will cause malformed response in the engine
        const modifiedRequest = {
          ...customRequest,
          context: {
            ...customRequest.context,
            latestMessage: 'FORCE_MALFORMED_RESPONSE',
          },
        };

        const res = await fetch('/api/decide', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...modifiedRequest, apiKey }),
        });

        const data = await res.json();
        setResponse(data);
        setLoading(false);
        return;
      }

      if (simulateError === 'missing') {
        // Send request with missing critical context
        const res = await fetch('/api/decide', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: customRequest.action,
            context: {
              latestMessage: '',
              conversationHistory: [],
            },
            apiKey
          }),
        });

        const data = await res.json();
        setResponse(data);
        setLoading(false);
        return;
      }

      // Normal request
      const res = await fetch('/api/decide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...customRequest, apiKey }),
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();
      setResponse(data);
    } catch (error) {
      setResponse({
        decision: 'confirm_before_execute',
        rationale: 'Error occurred - defaulting to safe behavior',
        confidence: 0,
        signals: {
          financialRisk: 50,
          privacyRisk: 50,
          reversibilityScore: 50,
          externalPartyRisk: 50,
          clarityScore: 50,
          contextConsistency: 50,
          urgency: 'medium',
        },
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  };

  const getDecisionColor = (decision: Decision) => {
    switch (decision) {
      case 'execute_silent':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'execute_and_inform':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'confirm_before_execute':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'ask_clarification':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'refuse_escalate':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getDecisionEmoji = (decision: Decision) => {
    switch (decision) {
      case 'execute_silent': return '✅';
      case 'execute_and_inform': return '📬';
      case 'confirm_before_execute': return '🤔';
      case 'ask_clarification': return '❓';
      case 'refuse_escalate': return '🚫';
      default: return '📋';
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">alfred_ Execution Decision Layer</h1>
        <p className="text-gray-600">
          Test the decision engine with preloaded scenarios or custom inputs
        </p>
      </div>

      {/* API Key Input */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <label className="block text-sm font-medium mb-2">
          OpenAI API Key (Optional - will use mock responses if not provided)
        </label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          className="w-full px-3 py-2 border rounded-md"
          placeholder="sk-..."
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Panel - Input */}
        <div className="space-y-6">
          {/* Scenario Selection */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Preloaded Scenarios</h2>
            <div className="space-y-2">
              {scenarios.map((scenario) => (
                <button
                  key={scenario.id}
                  onClick={() => handleScenarioSelect(scenario)}
                  className={`w-full text-left p-3 rounded border transition-colors ${
                    selectedScenario?.id === scenario.id
                      ? 'bg-blue-50 border-blue-400'
                      : 'hover:bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{scenario.name}</span>
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        scenario.category === 'easy'
                          ? 'bg-green-100 text-green-700'
                          : scenario.category === 'ambiguous'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {scenario.category}
                    </span>
                  </div>
                  {selectedScenario?.id === scenario.id && scenario.expectedBehavior && (
                    <p className="text-sm text-gray-600 mt-2">
                      Expected: {scenario.expectedBehavior}
                    </p>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Input */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Action Details</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Action Type</label>
                <input
                  type="text"
                  value={customRequest.action.type}
                  onChange={(e) =>
                    setCustomRequest({
                      ...customRequest,
                      action: { ...customRequest.action, type: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="e.g., send_email"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={customRequest.action.description}
                  onChange={(e) =>
                    setCustomRequest({
                      ...customRequest,
                      action: { ...customRequest.action, description: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 border rounded-md"
                  rows={2}
                  placeholder="e.g., Send email reply to external partner"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Latest Message</label>
                <input
                  type="text"
                  value={customRequest.context.latestMessage}
                  onChange={(e) =>
                    setCustomRequest({
                      ...customRequest,
                      context: { ...customRequest.context, latestMessage: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="e.g., Yes, send it"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Conversation History (one message per line, prefix with "user:" or "assistant:")
                </label>
                <textarea
                  value={customRequest.context.conversationHistory
                    .map((msg) => `${msg.role}: ${msg.content}`)
                    .join('\n')}
                  onChange={(e) => {
                    const lines = e.target.value.split('\n').filter((line) => line.trim());
                    const history: ConversationMessage[] = lines.map((line) => {
                      const [role, ...contentParts] = line.split(':');
                      return {
                        role: role.trim() as 'user' | 'assistant',
                        content: contentParts.join(':').trim(),
                        timestamp: new Date().toISOString(),
                      };
                    });
                    setCustomRequest({
                      ...customRequest,
                      context: { ...customRequest.context, conversationHistory: history },
                    });
                  }}
                  className="w-full px-3 py-2 border rounded-md font-mono text-sm"
                  rows={5}
                  placeholder="user: Draft a reply to Acme
assistant: I've drafted the email
user: Hold off for now"
                />
              </div>
            </div>
          </div>

          {/* Error Simulation */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Simulate Failure Cases</h2>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="none"
                  checked={simulateError === 'none'}
                  onChange={(e) => setSimulateError('none')}
                  className="mr-2"
                />
                No error simulation
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="timeout"
                  checked={simulateError === 'timeout'}
                  onChange={(e) => setSimulateError('timeout')}
                  className="mr-2"
                />
                Simulate LLM timeout
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="malformed"
                  checked={simulateError === 'malformed'}
                  onChange={(e) => setSimulateError('malformed')}
                  className="mr-2"
                />
                Simulate malformed LLM output
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="missing"
                  checked={simulateError === 'missing'}
                  onChange={(e) => setSimulateError('missing')}
                  className="mr-2"
                />
                Simulate missing critical context
              </label>
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors font-medium"
          >
            {loading ? 'Processing...' : 'Get Decision'}
          </button>
        </div>

        {/* Right Panel - Output */}
        <div className="space-y-6">
          {response && (
            <>
              {/* Decision Result */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4">Decision Result</h2>
                <div
                  className={`p-4 rounded-lg border-2 ${getDecisionColor(response.decision)}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl font-bold flex items-center gap-2">
                      {getDecisionEmoji(response.decision)}
                      {response.decision.replace(/_/g, ' ').toUpperCase()}
                    </span>
                    <span className="text-sm">
                      Confidence: {response.confidence}%
                    </span>
                  </div>
                  <p className="text-sm mt-2">{response.rationale}</p>
                  {response.error && (
                    <div className="mt-3 p-2 bg-red-50 rounded text-red-700 text-sm">
                      Error: {response.error}
                    </div>
                  )}
                </div>
              </div>

              {/* Risk Signals */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4">Computed Signals</h2>
                <div className="space-y-3">
                  {Object.entries(response.signals).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        {key.replace(/([A-Z])/g, ' $1').trim()}:
                      </span>
                      {typeof value === 'number' ? (
                        <div className="flex items-center gap-2">
                          <div className="w-32 bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                value > 66
                                  ? 'bg-red-500'
                                  : value > 33
                                  ? 'bg-yellow-500'
                                  : 'bg-green-500'
                              }`}
                              style={{ width: `${value}%` }}
                            />
                          </div>
                          <span className="text-sm w-10 text-right">{value}</span>
                        </div>
                      ) : (
                        <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                          {value}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Debug Information */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">Pipeline Details</h2>
                  <button
                    onClick={() => setShowDebug(!showDebug)}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    {showDebug ? 'Hide' : 'Show'} Debug Info
                  </button>
                </div>
                {showDebug && (
                  <div className="space-y-4">
                    {response.prompt && (
                      <div>
                        <h3 className="font-medium mb-2">LLM Prompt:</h3>
                        <pre className="bg-gray-50 p-3 rounded text-xs overflow-auto max-h-64">
                          {response.prompt}
                        </pre>
                      </div>
                    )}
                    {response.rawLLMResponse && (
                      <div>
                        <h3 className="font-medium mb-2">Raw LLM Response:</h3>
                        <pre className="bg-gray-50 p-3 rounded text-xs overflow-auto max-h-64">
                          {response.rawLLMResponse}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
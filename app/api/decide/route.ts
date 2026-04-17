// API route for decision engine

import { NextRequest, NextResponse } from 'next/server';
import { DecisionEngine } from '@/lib/decision-engine';
import { DecisionRequest } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body: DecisionRequest & { apiKey?: string } = await request.json();

    // Get API key from request or environment
    const apiKey = body.apiKey || process.env.OPENAI_API_KEY || '';

    if (!apiKey) {
      console.warn('No API key provided - using mock responses');
    }

    const engine = new DecisionEngine(apiKey);
    const decision = await engine.decide({
      action: body.action,
      context: body.context,
    });

    return NextResponse.json(decision);
  } catch (error) {
    console.error('Decision API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to process decision',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface GenerateParams {
  companyName: string;
  contactName: string;
  contactRole: string;
  industry: string;
  ourCompany: string;
  userRole: string;
  valueProposition: string;
}

interface RequestBody {
  sectionType: string;
  params: GenerateParams;
}

const PROMPTS: Record<string, (p: GenerateParams) => [string, number]> = {
  objectives: (p) => [`You are an enterprise sales intelligence analyst. Research ${p.companyName} and identify their top 5 business objectives for 2024-2025.

Context:
- Target Company: ${p.companyName}
- Industry: ${p.industry}
- Our Company: ${p.ourCompany}
- Our Value Prop: ${p.valueProposition}

Format your response as:

TOP 5 BUSINESS OBJECTIVES FOR ${p.companyName.toUpperCase()}

1. [Objective Title]
   Strategic Focus: [description]
   Success Metrics: [KPIs]
   Our Alignment: [how we help]

[Continue for all 5 objectives]

INTELLIGENCE SOURCES

- Market research and industry trends
- Company announcements and strategic initiatives
- Competitive positioning`, 3000],

  competitive: (p) => [`Create a comprehensive competitive analysis for selling to ${p.companyName}.

TARGET: ${p.companyName}
OUR SOLUTION: ${p.valueProposition}

COMPETITIVE LANDSCAPE

- Top 3-5 competitors
- Market positioning
- Key differentiators

CURRENT VENDOR STACK

- Existing solutions they likely use
- Switching costs and barriers

DIFFERENTIATION OPPORTUNITIES

- Competitor weaknesses
- Market gaps
- Our unique advantages

BATTLE CARDS

- How we compare vs each competitor
- Key talking points`, 3000],

  overview: (p) => [`Create a comprehensive company overview for ${p.companyName}.

COMPANY PROFILE

- Headquarters and Key Locations
- Employee Count and Growth Trajectory
- Revenue and Funding History
- Leadership Team
- Recent Developments

STRATEGIC PRIORITIES

- Current business focus
- Recent initiatives
- Investment areas
- Expansion plans

ORGANIZATION STRUCTURE

- Key departments
- Decision makers
- Procurement process
- Budget cycles`, 3000],

  insights: (p) => [`Create an industry insights report for ${p.companyName}.

INDUSTRY: ${p.industry}

MACRO TRENDS (2024-2025)

- Top industry trends
- Impact on ${p.companyName}
- Urgency and timeline

MARKET DYNAMICS

- Growth rate and projections
- Disruption factors
- Emerging technologies

BENCHMARKING

- Industry averages
- Performance gaps
- Opportunities

CONVERSATION STARTERS

- Timely topics
- Executive talking points`, 3000],

  emails: (p) => [`Create 3 hyper-personalized email sequences for ${p.companyName}.

CONTEXT:
- Company: ${p.companyName}
- Contact: ${p.contactName}
- Role: ${p.contactRole}
- My Company: ${p.ourCompany}
- My Role: ${p.userRole}
- Value: ${p.valueProposition}

EMAIL 1: PATTERN INTERRUPT

Subject: [Compelling subject line]
[150 words max. Open with a specific insight, mention a pain point, end with a soft CTA.]

EMAIL 2: VALUE DEMONSTRATION

Subject: [Follow-up subject]
[150 words max. Reference a relevant case study with quantified results, medium CTA.]

EMAIL 3: EXECUTIVE BREAKUP

Subject: [Permission to close loop]
[150 words max. Acknowledge their schedule, share one powerful insight, final CTA.]`, 4000],

  coldCall: (p) => [`Create an enterprise cold call script for reaching ${p.companyName}.

TARGET: ${p.companyName}
CONTACT: ${p.contactName} - ${p.contactRole}

GATEKEEPER BYPASS

[Script for getting past gatekeeper]

OPENING (first 10 seconds)

[Opening that earns attention without sounding like a sales call]

VALUE PROPOSITION (30 seconds)

[Clear, compelling value statement]

DISCOVERY QUESTIONS

1. [Question]
2. [Question]
3. [Question]
4. [Question]

OBJECTION HANDLING

- Not interested: [response]
- Send me information: [response]
- We already have a solution: [response]
- Bad timing: [response]

CLOSING FOR MEETING

[Script to secure the next step]`, 3000],

  qualification: (p) => [`Create a MEDDPICC qualification framework for ${p.companyName}.

COMPANY: ${p.companyName}

METRICS

1. [Question]
   Why ask: [reason]
   Good answer: [what to listen for]
2. [Question]
   Why ask: [reason]
   Good answer: [what to listen for]
3. [Question]
   Why ask: [reason]
   Good answer: [what to listen for]

ECONOMIC BUYER

[3 questions in same format]

DECISION CRITERIA

[3 questions in same format]

DECISION PROCESS

[3 questions in same format]

PAPER PROCESS

[2 questions in same format]

IDENTIFY PAIN

[3 questions in same format]

CHAMPION

[2 questions in same format]

COMPETITION

[2 questions in same format]`, 3500],

  linkedin: (p) => [`Create a LinkedIn prospecting strategy for ${p.companyName}.

TARGET: ${p.companyName}
CONTACT: ${p.contactName}

RESEARCH PHASE

- Sales Navigator search parameters
- Boolean operators to use
- Profile signals to look for (positive and negative)

CONNECTION REQUEST

[Template — 300 character max]

FOLLOW-UP MESSAGE 1

[Template sent 3 days after connecting]

FOLLOW-UP MESSAGE 2

[Template sent 7 days after connecting]

VALUE-ADD TOUCHPOINTS

[Content types and engagement cadence]

TRANSITION TO MEETING

[Script for converting a connection into a booked call]`, 3000],
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { sectionType, params }: RequestBody = await req.json();

    if (!PROMPTS[sectionType]) {
      return new Response(JSON.stringify({ error: `Unknown section type: ${sectionType}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicKey) {
      return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured in edge function secrets' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const [prompt, maxTokens] = PROMPTS[sectionType](params);

    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!anthropicResponse.ok) {
      const errText = await anthropicResponse.text();
      return new Response(JSON.stringify({ error: `Claude API error: ${errText}` }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const anthropicData = await anthropicResponse.json();
    const content = anthropicData.content[0].text;

    return new Response(JSON.stringify({ content, sectionType }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

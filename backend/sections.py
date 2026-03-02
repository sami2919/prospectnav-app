import os
import anthropic
from dotenv import load_dotenv

load_dotenv()

SECTION_PROMPTS = {
    "overview": lambda p, r: f"""You are an enterprise sales intelligence analyst. Write a company overview for {p['companyName']}.

RESEARCH INTELLIGENCE (use this real data — do not invent facts):
{r}

---
TARGET: {p['companyName']} | INDUSTRY: {p['industry']}

Write a structured company overview with these sections:

COMPANY PROFILE
- Headquarters and Key Locations
- Employee Count and Growth Trajectory
- Revenue and Funding History (use research data)
- Leadership Team (use real names from research)
- Recent Developments (use specific news from research)

STRATEGIC PRIORITIES
- Current business focus based on research findings
- Recent initiatives and investment areas
- Expansion plans

ORGANIZATION STRUCTURE
- Key departments and decision makers
- Procurement process
- Budget cycles

Use specific facts from the research. Where research provides real data, use it. Be concrete and specific.""",

    "objectives": lambda p, r: f"""You are an enterprise sales intelligence analyst. Identify the top business objectives for {p['companyName']}.

RESEARCH INTELLIGENCE (use this real data):
{r}

---
OUR COMPANY: {p['ourCompany']} | OUR VALUE: {p['valueProposition']}

TOP 5 BUSINESS OBJECTIVES FOR {p['companyName'].upper()}

For each objective, use evidence from the research above where available.

1. [Objective Title]
   Strategic Focus: [specific description grounded in research]
   Success Metrics: [relevant KPIs]
   Our Alignment: [how {p['ourCompany']} helps achieve this]

[Continue for all 5 objectives]

INTELLIGENCE SOURCES
- Cite specific news, statements, or evidence from the research that supports each objective.""",

    "competitive": lambda p, r: f"""You are a competitive intelligence analyst. Create a competitive analysis for selling to {p['companyName']}.

RESEARCH INTELLIGENCE (use this real data):
{r}

---
OUR SOLUTION: {p['valueProposition']}

COMPETITIVE LANDSCAPE
- Top 3-5 competitors {p['companyName']} faces in their market
- Their market positioning based on research

CURRENT VENDOR STACK
- Existing solutions {p['companyName']} likely uses (based on research signals)
- Switching costs and barriers

DIFFERENTIATION OPPORTUNITIES
- Where competitors are weak
- Market gaps {p['ourCompany']} can fill
- Our unique advantages vs alternatives

BATTLE CARDS
- How {p['ourCompany']} compares vs each likely competitor
- Specific talking points for displacement

Use real competitive intelligence from the research where available.""",

    "emails": lambda p, r: f"""You are an expert B2B sales copywriter. Write 3 personalized email sequences.

RESEARCH INTELLIGENCE — use these real facts to personalize each email:
{r}

---
CONTACT: {p['contactName']} | ROLE: {p['contactRole']} | COMPANY: {p['companyName']}
FROM: {p['userRole']} at {p['ourCompany']}
OUR VALUE: {p['valueProposition']}

EMAIL 1: PATTERN INTERRUPT
Subject: [Compelling subject referencing a specific insight from the research]
[150 words max. Open with a specific, real insight about {p['companyName']} from the research. Connect to a pain point. Soft CTA.]

EMAIL 2: VALUE DEMONSTRATION
Subject: [Follow-up subject]
[150 words max. Reference a relevant result or case study. Connect to their specific situation from research. Medium CTA.]

EMAIL 3: EXECUTIVE BREAKUP
Subject: [Permission to close the loop]
[150 words max. Acknowledge their schedule. Share one powerful, research-grounded insight. Final CTA.]

Each email must feel personally researched — reference something specific from the intelligence above.""",

    "coldCall": lambda p, r: f"""You are an enterprise sales trainer. Write a cold call script for reaching {p['companyName']}.

RESEARCH INTELLIGENCE (use to personalize the script):
{r}

---
TARGET: {p['companyName']} | CONTACT: {p['contactName']} - {p['contactRole']}
CALLER: {p['userRole']} at {p['ourCompany']}

GATEKEEPER BYPASS
[Script for getting past the gatekeeper using a specific, researched reason for calling]

OPENING (first 10 seconds)
[Opening that references something specific about {p['companyName']} from the research — not a generic pitch]

VALUE PROPOSITION (30 seconds)
[Clear, compelling value statement connecting {p['ourCompany']}'s {p['valueProposition']} to their specific situation]

DISCOVERY QUESTIONS (4 questions grounded in research pain points)
1. [Question about a pain point identified in research]
2. [Question]
3. [Question]
4. [Question]

OBJECTION HANDLING
- Not interested: [response]
- Send me information: [response]
- We already have a solution: [response]
- Bad timing: [response]

CLOSING FOR MEETING
[Script to secure the next step]""",

    "qualification": lambda p, r: f"""You are a sales methodology expert. Create a MEDDPICC qualification framework for {p['companyName']}.

RESEARCH INTELLIGENCE (use to make questions company-specific):
{r}

---
COMPANY: {p['companyName']} | OUR SOLUTION: {p['valueProposition']}

For each MEDDPICC category, write 2-3 questions tailored to {p['companyName']}'s specific situation from the research.

Format each question as:
Q: [Question]
Why ask: [Specific reason tied to {p['companyName']}'s situation]
Good answer: [What signals a qualified opportunity]

METRICS — questions about quantifiable business impact
ECONOMIC BUYER — questions to identify and engage the real buyer
DECISION CRITERIA — questions about evaluation standards
DECISION PROCESS — questions about how they make decisions
PAPER PROCESS — questions about legal/procurement steps
IDENTIFY PAIN — questions that surface the problems your research revealed
CHAMPION — questions to identify and develop an internal champion
COMPETITION — questions about other solutions they're evaluating""",

    "linkedin": lambda p, r: f"""You are a LinkedIn sales expert. Create a LinkedIn prospecting strategy for {p['companyName']}.

RESEARCH INTELLIGENCE (use real people and details from research):
{r}

---
TARGET COMPANY: {p['companyName']}
CONTACT: {p['contactName']} | INDUSTRY: {p['industry']}
FROM: {p['userRole']} at {p['ourCompany']}

SALES NAVIGATOR SEARCH
- Specific search parameters for {p['companyName']}
- Boolean operators and filters to use
- Profile signals to look for (based on the research context)

CONNECTION REQUEST (300 character max)
[Template referencing something specific from the research about {p['companyName']}]

FOLLOW-UP MESSAGE 1 (sent 3 days after connecting)
[Template adding genuine value based on a research finding]

FOLLOW-UP MESSAGE 2 (sent 7 days after connecting)
[Template with a specific insight or question based on their business situation]

VALUE-ADD TOUCHPOINTS
[Content types to engage with and cadence — tied to {p['companyName']}'s industry and challenges from research]

TRANSITION TO MEETING
[Script for converting a LinkedIn connection to a booked call]""",

    "insights": lambda p, r: f"""You are an industry analyst. Create an insights report for {p['companyName']}.

RESEARCH INTELLIGENCE (use real, specific findings):
{r}

---
COMPANY: {p['companyName']} | INDUSTRY: {p['industry']}
OUR ANGLE: {p['valueProposition']}

MACRO TRENDS (2024-2025)
- Top 3 industry trends directly affecting {p['companyName']}
- Specific impact on their business based on research
- Urgency and timeline for each

MARKET DYNAMICS
- Growth rates and projections for {p['industry']}
- Disruption factors specific to {p['companyName']}'s position
- Emerging technologies reshaping their space

BENCHMARKING
- How {p['companyName']} compares to industry standards (based on research data)
- Performance gaps that represent opportunities
- Best practices they may not be leveraging

CONVERSATION STARTERS
- 5 timely, research-grounded topics to open a conversation with {p['companyName']}
- Why each is relevant to their current situation""",
}


async def generate_section(
    section_type: str, params: dict, research_context: str
) -> str:
    client = anthropic.AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

    prompt_fn = SECTION_PROMPTS.get(section_type)
    if not prompt_fn:
        raise ValueError(f"Unknown section type: {section_type}")

    prompt = prompt_fn(params, research_context)

    message = await client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=3000,
        messages=[{"role": "user", "content": prompt}],
    )

    return message.content[0].text

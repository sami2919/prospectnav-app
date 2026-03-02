import os
import json
from crewai import Agent, Task, Crew, Process, LLM
from crewai.tools import BaseTool
from duckduckgo_search import DDGS
from dotenv import load_dotenv

load_dotenv()

claude_llm = LLM(
    model="claude-sonnet-4-20250514",
    api_key=os.getenv("ANTHROPIC_API_KEY"),
    temperature=0.3,
)


class WebSearchTool(BaseTool):
    name: str = "web_search"
    description: str = (
        "Search the web for current information about a company. "
        "Use specific queries like company name + topic (news, leadership, technology, etc.)."
    )

    def _run(self, query: str) -> str:
        try:
            with DDGS() as ddgs:
                results = list(ddgs.text(query, max_results=6))
            return json.dumps([
                {
                    "title": r.get("title", ""),
                    "body": r.get("body", "")[:600],
                    "url": r.get("href", ""),
                }
                for r in results
            ])
        except Exception as e:
            return f"Search failed: {str(e)}"


class WebPageReaderTool(BaseTool):
    name: str = "read_webpage"
    description: str = (
        "Read and extract the text content from a specific webpage URL. "
        "Use this to get detailed information from a company website or news article."
    )

    def _run(self, url: str) -> str:
        try:
            from llama_index.readers.web import SimpleWebPageReader
            reader = SimpleWebPageReader(html_to_text=True)
            docs = reader.load_data([url])
            return docs[0].text[:4000] if docs else "Could not read webpage."
        except Exception as e:
            return f"Error reading webpage: {str(e)}"


def run_research_crew(params: dict) -> str:
    """
    Runs a 2-agent CrewAI crew (Researcher + Analyst) to gather real company
    intelligence. Returns a structured research + analysis string that is
    then injected as context into each section generation prompt.
    """
    company_name = params.get("companyName", "")
    industry = params.get("industry", "Technology")
    our_company = params.get("ourCompany", "")
    value_prop = params.get("valueProposition", "")
    contact_name = params.get("contactName", "")
    contact_role = params.get("contactRole", "")

    researcher = Agent(
        role="Business Intelligence Researcher",
        goal=f"Gather comprehensive, accurate, and current information about {company_name}",
        backstory=(
            "You are an expert B2B research analyst who builds deep company intelligence "
            "profiles for enterprise sales teams. You use web search and web page reading "
            "to find real, current, factual information — never guessing or hallucinating."
        ),
        tools=[WebSearchTool(), WebPageReaderTool()],
        llm=claude_llm,
        verbose=True,
        allow_delegation=False,
        max_iter=8,
    )

    analyst = Agent(
        role="B2B Sales Strategist",
        goal=(
            f"Create an actionable sales strategy for {our_company} to win "
            f"{company_name} as a customer"
        ),
        backstory=(
            "You are a senior B2B sales strategist with 15 years of enterprise experience. "
            "You transform raw company research into specific, actionable sales intelligence "
            "— identifying real pain points, genuine opportunities, and concrete talking points."
        ),
        llm=claude_llm,
        verbose=True,
        allow_delegation=False,
        max_iter=3,
    )

    research_task = Task(
        description=f"""Research {company_name} ({industry}) thoroughly using web search and page reading.

Gather and document the following with specific facts and sources:

1. COMPANY PROFILE
   - What they do, core products/services
   - Company size (employees, revenue if available)
   - Headquarters and key locations
   - Funding history or public status

2. RECENT DEVELOPMENTS (2024-2025)
   - News, announcements, product launches
   - Leadership changes, acquisitions, expansions
   - Any financial news or strategic pivots

3. LEADERSHIP & DECISION MAKERS
   - CEO and C-suite names and backgrounds
   - Relevant VP/Director level contacts
   - Any LinkedIn presence or stated priorities

4. TECHNOLOGY & OPERATIONS
   - Known tech stack, tools, platforms they use
   - Operational scale and infrastructure signals

5. BUSINESS CHALLENGES
   - Pain points visible from news, job postings, or statements
   - Industry headwinds specific to {industry}

Run these searches:
- "{company_name} company"
- "{company_name} news 2025"
- "{company_name} CEO leadership team"
- "{company_name} technology stack"
- "{company_name} {industry} challenges"

Then read the top 1-2 most relevant pages for deeper detail.""",
        agent=researcher,
        expected_output=(
            "A detailed research report with specific, factual information about "
            f"{company_name} gathered from real web sources, including company profile, "
            "recent news, leadership, technology, and business challenges."
        ),
    )

    analysis_task = Task(
        description=f"""Using the research on {company_name}, create a strategic sales analysis.

OUR CONTEXT:
- Our company: {our_company}
- What we offer: {value_prop}
- Our contact: {contact_name} ({contact_role})

ANALYZE AND PRODUCE:

1. TOP PAIN POINTS (3-5 specific)
   - Each pain point mapped to specific evidence from the research
   - Business impact of each pain point

2. VALUE ALIGNMENT
   - How {our_company}'s {value_prop} directly addresses each pain point
   - Specific use cases relevant to {company_name}

3. STRATEGIC APPROACH
   - Best angle for engaging {contact_name} as a {contact_role}
   - Key talking points that will resonate given their business situation
   - Urgency triggers (new leadership, expansion, recent news, etc.)

4. COMPETITIVE CONTEXT
   - Solutions {company_name} likely already uses
   - How we differentiate and where we win

5. LIKELY OBJECTIONS
   - Top 3 objections and how to handle each""",
        agent=analyst,
        expected_output=(
            "A strategic sales analysis with specific, actionable intelligence for "
            f"selling {our_company} to {company_name}, including pain points, "
            "value alignment, approach strategy, and objection handling."
        ),
        context=[research_task],
    )

    crew = Crew(
        agents=[researcher, analyst],
        tasks=[research_task, analysis_task],
        process=Process.sequential,
        verbose=True,
    )

    result = crew.kickoff()
    return str(result)

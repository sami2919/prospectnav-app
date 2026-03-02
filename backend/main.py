import os
import json
import asyncio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="ProspectNav AI Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SECTION_TYPES = [
    "overview",
    "objectives",
    "competitive",
    "emails",
    "coldCall",
    "qualification",
    "linkedin",
    "insights",
]


class GenerateRequest(BaseModel):
    companyName: str
    contactName: str = ""
    contactRole: str = ""
    industry: str = ""
    ourCompany: str = ""
    userRole: str = ""
    valueProposition: str = ""


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/generate")
async def generate(req: GenerateRequest):
    from crew import run_research_crew
    from sections import generate_section

    params = req.model_dump()

    async def stream():
        try:
            # Phase 1: Research with CrewAI + LlamaIndex
            company_name = params["companyName"]
            yield f"data: {json.dumps({'type': 'progress', 'stage': 'researching', 'message': f'Researching {company_name} using web intelligence...'})}\n\n"

            research_context = await asyncio.to_thread(run_research_crew, params)

            yield f"data: {json.dumps({'type': 'progress', 'stage': 'generating', 'message': 'Research complete. Generating all 8 intelligence sections in parallel...'})}\n\n"

            # Phase 2: Generate all 8 sections in parallel using research context
            queue: asyncio.Queue = asyncio.Queue()

            async def gen_and_queue(section_type: str):
                try:
                    content = await generate_section(section_type, params, research_context)
                    await queue.put({"type": "section", "sectionType": section_type, "content": content})
                except Exception as e:
                    await queue.put({"type": "section_error", "sectionType": section_type, "message": str(e)})

            tasks = [asyncio.create_task(gen_and_queue(st)) for st in SECTION_TYPES]

            # Yield each section as it completes
            for _ in range(len(SECTION_TYPES)):
                event = await queue.get()
                yield f"data: {json.dumps(event)}\n\n"

            await asyncio.gather(*tasks)
            yield f"data: {json.dumps({'type': 'complete'})}\n\n"

        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(
        stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )

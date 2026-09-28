"""Engram agent — recall → respond → retain, per user, backed by Hindsight."""
import asyncio
import json
import re
import threading
import time
from datetime import datetime, timezone

import groq as groq_sdk
from groq import Groq
from hindsight_client import Hindsight

from config import HINDSIGHT_API_KEY, HINDSIGHT_BASE_URL, GROQ_API_KEY

groq_client = Groq(api_key=GROQ_API_KEY)
hindsight = Hindsight(base_url=HINDSIGHT_BASE_URL, api_key=HINDSIGHT_API_KEY)

MODEL = "openai/gpt-oss-120b"
MAX_RECALL = 20
BANK_PREFIX = "engram-user"

# ---------------------------------------------------------------- async ---
# One persistent event loop. asyncio.run() closes its loop after every call,
# which kills aiohttp's connection pool — that's what caused
# "Event loop is closed" and empty recalls on the second request.
_loop = asyncio.new_event_loop()
_loop_thread = threading.Thread(target=_loop.run_forever, daemon=True)
_loop_thread.start()


def _run(coro):
    """Schedule an async coroutine on the shared persistent loop."""
    future = asyncio.run_coroutine_threadsafe(coro, _loop)
    return future.result(timeout=60)


def utcnow():
    return datetime.now(timezone.utc)


def bank_for(user_id: str) -> str:
    return f"{BANK_PREFIX}-{user_id}"


def ensure_bank(bank_id: str):
    try:
        _run(hindsight.acreate_bank(bank_id=bank_id))
    except Exception:
        pass


# ------------------------------------------------------------ recall -----
def recall_memories(bank_id: str, query: str) -> list[dict]:
    """List every memory in this user's bank.

    We list instead of using semantic recall because Hindsight's indexer
    has a lag — freshly retained memories are not yet visible to recall().
    Per-user banks are small, so listing is fast and always up to date.
    """
    res = _run(hindsight.alist_memories(bank_id=bank_id, limit=MAX_RECALL))
    items = getattr(res, "items", None) or getattr(res, "results", None) or []
    out = []
    for i, m in enumerate(items[:MAX_RECALL], 1):
        text = getattr(m, "text", "") or ""
        if not text:
            continue
        when = (
            getattr(m, "occurred_start", None)
            or getattr(m, "mentioned_at", None)
            or getattr(m, "updated_at", None)
        )
        out.append({
            "id": i,
            "text": text,
            "when": when.isoformat() if hasattr(when, "isoformat") else (str(when) if when else None),
            "type": getattr(m, "fact_type", None) or getattr(m, "type", "fact") or "fact",
            "used": False,
        })
    return out


# ------------------------------------------------------------ retain -----
def retain_content(bank_id: str, content: str, when=None):
    when = when or utcnow()
    last_err = None
    for extra in (
        {"timestamp": when, "context": "Engram conversation"},
        {"timestamp": when},
        {},
    ):
        try:
            _run(hindsight.aretain(bank_id=bank_id, content=content, **extra))
            return
        except (TypeError, ValueError) as e:
            last_err = e
            continue
        except Exception as e:
            last_err = e
            break
    raise RuntimeError(f"Hindsight rejected retain: {last_err}")


# ------------------------------------------------------------ prompt -----
def build_prompt(name: str, message: str, memories: list[dict]) -> str:
    if memories:
        block = "\n".join(f"[{m['id']}] {m['text']}" for m in memories)
        return f"""You are Engram, a laptop troubleshooting assistant.

MEMORY OF {name} (from past interactions):
{block}

RULES:
- Only reference facts explicitly in the memory above. Do not invent details.
- Start with "I remember..." only if you have a concrete fact to cite.
- Give one clear diagnostic question or fix.

{name} says: {message}

Reply in 2-3 sentences. Return ONLY JSON:
{{"reply": "...", "used": [1,2], "influence": "..."}}"""

    return f"""You are Engram, a laptop troubleshooting assistant.

You have NO prior history with {name}.

{name} says: {message}

Ask essential diagnostic questions (laptop model, OS, symptom timeline).
Reply in 2-3 sentences. Return ONLY JSON:
{{"reply": "...", "used": [], "influence": "No memory used"}}"""


# ------------------------------------------------------------ LLM --------
def call_llm(prompt: str, retries: int = 4) -> str:
    delay, last = 1.5, None
    for _ in range(retries):
        try:
            r = groq_client.chat.completions.create(
                model=MODEL, messages=[{"role": "user", "content": prompt}]
            )
            text = (r.choices[0].message.content or "").strip()
            if text:
                return text
            last = "empty response"
        except (groq_sdk.RateLimitError, groq_sdk.APIConnectionError, groq_sdk.InternalServerError) as e:
            last = e
        time.sleep(delay)
        delay *= 2
    raise RuntimeError(f"LLM unavailable: {last}")


def parse_json(raw: str):
    text = re.sub(r"^```(?:json)?|```$", "", raw.strip(), flags=re.M).strip()
    start, end = text.find("{"), text.rfind("}")
    if start != -1 and end > start:
        try:
            d = json.loads(text[start:end + 1])
            reply = str(d.get("reply", "")).strip()
            if reply:
                used = [int(x) for x in (d.get("used") or []) if str(x).isdigit()]
                return reply, used, str(d.get("influence", "")).strip()
        except Exception:
            pass
    return raw.strip(), [], ""


# ------------------------------------------------------------ writes -----
def write_device_facts(user_id: str, name: str, brand: str, model: str, os_: str, age_months: int):
    bank_id = bank_for(user_id)
    ensure_bank(bank_id)
    content = (
        f"{name} uses a {brand} {model} running {os_}, "
        f"about {age_months} months old."
    )
    retain_content(bank_id, content)


# ------------------------------------------------------------ main -------
def handle_chat(user_id: str, name: str, message: str, day_offset: int = 0) -> dict:
    message = (message or "").strip()
    if not message:
        raise ValueError("Message is empty")

    bank_id = bank_for(user_id)
    ensure_bank(bank_id)

    memories = []
    try:
        memories = recall_memories(bank_id, message)
    except Exception as e:
        print(f"RECALL FAILED: {type(e).__name__}: {e}")

    raw = call_llm(build_prompt(name, message, memories))
    reply, used, influence = parse_json(raw)

    for m in memories:
        m["used"] = m["id"] in used

    retained = False
    try:
        retain_content(bank_id, f"{name} said: {message}. Engram replied: {reply}")
        retained = True
    except Exception as e:
        print(f"RETAIN FAILED: {type(e).__name__}: {e}")

    return {
        "reply": reply,
        "memories": memories,
        "influence": influence,
        "retained": retained,
    }


def get_timeline(user_id: str) -> dict:
    bank_id = bank_for(user_id)
    try:
        items = recall_memories(bank_id, "all")
        facts = [{"text": m["text"], "when": m["when"], "type": m["type"]} for m in items]
    except Exception:
        facts = []
    return {"timeline": [], "facts": facts}
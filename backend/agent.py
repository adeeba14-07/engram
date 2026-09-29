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
VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct"
MAX_RECALL = 6
MAX_BANK_SCAN = 100
BANK_PREFIX = "engram-user"

SIMILARITY_THRESHOLD = 0.75

_loop = asyncio.new_event_loop()
_loop_thread = threading.Thread(target=_loop.run_forever, daemon=True)
_loop_thread.start()


def _run(coro):
    future = asyncio.run_coroutine_threadsafe(coro, _loop)
    return future.result(timeout=90)


def utcnow():
    return datetime.now(timezone.utc)


def bank_for(user_id: str) -> str:
    return f"{BANK_PREFIX}-{user_id}"


def ensure_bank(bank_id: str):
    try:
        _run(hindsight.acreate_bank(bank_id=bank_id))
    except Exception:
        pass


# ----------------------------------------------------------- text utils ------
STOPWORDS = {
    "the", "a", "an", "is", "are", "was", "were", "my", "i", "me", "you",
    "it", "this", "that", "of", "to", "for", "on", "in", "and", "or", "with",
    "have", "has", "had", "be", "been", "being", "do", "does", "did", "but",
    "when", "about", "into", "from", "used", "uses", "using",
}


def _keywords(text: str) -> set:
    words = re.findall(r"[a-zA-Z0-9]+", (text or "").lower())
    return {w for w in words if w not in STOPWORDS and len(w) > 2}


def _relevance(query_kw: set, memory_text: str) -> float:
    if not query_kw:
        return 0.0
    mem_kw = _keywords(memory_text)
    if not mem_kw:
        return 0.0
    overlap = len(query_kw & mem_kw)
    return round(overlap / max(len(query_kw), 1), 3)


def _strip_meta(text: str) -> str:
    return text.split("|")[0].strip()


def _normalize(text: str) -> str:
    base = _strip_meta(text).lower()
    base = re.sub(r"[^\w\s]", " ", base)
    base = re.sub(r"\s+", " ", base).strip()
    return base


def _jaccard(a: set, b: set) -> float:
    if not a or not b:
        return 0.0
    return len(a & b) / len(a | b)


def _is_similar(text_a: str, text_b: str) -> bool:
    if _normalize(text_a) == _normalize(text_b):
        return True
    ka, kb = _keywords(text_a), _keywords(text_b)
    return _jaccard(ka, kb) >= SIMILARITY_THRESHOLD


def _merge_group(items: list) -> dict:
    def sort_key(m):
        return (-len(m["text"]), -(m.get("_when_ts") or 0))
    return sorted(items, key=sort_key)[0]


def _dedupe_and_merge(raw: list) -> list:
    """Group similar memories, keep one representative per group."""
    groups = []
    for entry in raw:
        placed = False
        for g in groups:
            if _is_similar(entry["text"], g[0]["text"]):
                g.append(entry)
                placed = True
                break
        if not placed:
            groups.append([entry])
    return [_merge_group(g) for g in groups]


def _fetch_raw(bank_id: str) -> list:
    res = _run(hindsight.alist_memories(bank_id=bank_id, limit=MAX_BANK_SCAN))
    items = getattr(res, "items", None) or getattr(res, "results", None) or []
    raw = []
    for m in items:
        text = (getattr(m, "text", "") or "").strip()
        if not text:
            continue
        when_obj = (
            getattr(m, "occurred_start", None)
            or getattr(m, "mentioned_at", None)
            or getattr(m, "updated_at", None)
        )
        if hasattr(when_obj, "timestamp"):
            when_iso = when_obj.isoformat()
            when_ts = when_obj.timestamp()
        else:
            when_iso = str(when_obj) if when_obj else None
            when_ts = 0
        raw.append({"text": text, "when": when_iso, "_when_ts": when_ts})
    return raw


# ----------------------------------------------------------- recall ----------
def recall_memories(bank_id: str, query: str):
    """Fetch, dedupe, score, rank. Returns (matched, explanation)."""
    raw = _fetch_raw(bank_id)
    deduped = _dedupe_and_merge(raw)

    query_kw = _keywords(query)
    for d in deduped:
        d["score"] = _relevance(query_kw, d["text"])

    matched = [d for d in deduped if d["score"] > 0]
    matched.sort(key=lambda d: (-d["score"], -d["_when_ts"]))

    if not matched:
        matched = sorted(deduped, key=lambda d: -d["_when_ts"])[:3]

    matched = matched[:MAX_RECALL]

    for i, m in enumerate(matched, 1):
        m["id"] = i
        m["used"] = False
        m.pop("_when_ts", None)

    explanation = {
        "query": query,
        "total_in_bank": len(raw),
        "unique_facts": len(deduped),
        "merged_duplicates": len(raw) - len(deduped),
        "matched": matched,
        "dropped": max(0, len(deduped) - len(matched)),
    }
    return matched, explanation


# ----------------------------------------------------------- retain ----------
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


def delete_memories_matching(bank_id: str, fragment: str):
    if not fragment or len(fragment) < 4:
        return
    try:
        res = _run(hindsight.alist_memories(bank_id=bank_id, limit=200))
        items = getattr(res, "items", None) or getattr(res, "results", None) or []
        for m in items:
            t = getattr(m, "text", "") or ""
            if fragment[:40] in t:
                mid = getattr(m, "id", None) or getattr(m, "memory_id", None)
                if mid and hasattr(hindsight, "adelete_memory"):
                    try:
                        _run(hindsight.adelete_memory(bank_id=bank_id, memory_id=mid))
                    except Exception:
                        pass
    except Exception:
        pass


# ----------------------------------------------------------- prompts ---------
def _device_line(device: dict | None) -> str:
    if not device:
        return ""
    parts = [
        device.get("brand"), device.get("model"),
        f"{device.get('os_name', '')} {device.get('os_version', '')}".strip(),
    ]
    parts = [p for p in parts if p]
    if device.get("age_months"):
        parts.append(f"{device['age_months']} months old")
    if device.get("ram_gb"):
        parts.append(f"{device['ram_gb']}GB RAM")
    if device.get("storage_gb"):
        parts.append(f"{device['storage_gb']}GB storage")
    if device.get("gpu"):
        parts.append(f"GPU: {device['gpu']}")
    if device.get("cpu"):
        parts.append(f"CPU: {device['cpu']}")
    return "Device: " + ", ".join(parts)


def build_prompt(name, device, message, memories, prior_outcomes=None):
    device_line = _device_line(device)

    if memories:
        block = "\n".join(f"[{m['id']}] {m['text']}" for m in memories)
        outcomes = ""
        if prior_outcomes:
            outcomes = "\nPAST OUTCOMES:\n" + "\n".join(prior_outcomes)
        return f"""You are Engram, a laptop troubleshooting assistant for {name}.
{device_line}

RELEVANT MEMORY (only what matters for this question):
{block}{outcomes}

RULES:
- Use memory ONLY when it is relevant to the current message.
- If memory doesn't help, ignore it — do not force it into the reply.
- Never invent facts.
- 2-3 sentences. One clear diagnostic question or fix.

{name} says: {message}

Return ONLY JSON:
{{"reply": "...", "used": [1,2], "influence": "..."}}"""

    return f"""You are Engram, a laptop troubleshooting assistant for {name}.
{device_line}

No relevant history for this message.

{name} says: {message}

Ask focused diagnostic questions. 2-3 sentences.

Return ONLY JSON:
{{"reply": "...", "used": [], "influence": "No memory used"}}"""


# ----------------------------------------------------------- LLM ------------
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


def call_vision(image_base64: str) -> str:
    try:
        r = groq_client.chat.completions.create(
            model=VISION_MODEL,
            messages=[{
                "role": "user",
                "content": [
                    {"type": "text",
                     "text": ("Describe this laptop image. Extract any error "
                              "messages, blue-screen codes, dialog text, or visible "
                              "hardware issues. Be factual and short.")},
                    {"type": "image_url",
                     "image_url": {"url": f"data:image/png;base64,{image_base64}"}},
                ],
            }],
        )
        return (r.choices[0].message.content or "").strip()
    except Exception as e:
        raise RuntimeError(f"Vision failed: {e}")


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


# ----------------------------------------------------------- device ----------
def write_device_facts(user_id, name, device: dict):
    bank_id = bank_for(user_id)
    ensure_bank(bank_id)
    parts = [f"{name} uses a {device['brand']} {device['model']}",
             f"running {device['os_name']} {device['os_version']}"]
    parts.append(f"{device['age_months']} months old")
    if device.get("ram_gb"):
        parts.append(f"{device['ram_gb']}GB RAM")
    if device.get("storage_gb"):
        parts.append(f"{device['storage_gb']}GB storage")
    if device.get("gpu"):
        parts.append(f"GPU {device['gpu']}")
    if device.get("cpu"):
        parts.append(f"CPU {device['cpu']}")
    retain_content(bank_id, ", ".join(parts) + ".")


# ----------------------------------------------------------- main ------------
def handle_chat(user_id, name, device, message,
                media_base64=None, media_type=None,
                prior_outcomes=None):
    message = (message or "").strip()
    if not message and not media_base64:
        raise ValueError("Message is empty")

    bank_id = bank_for(user_id)
    ensure_bank(bank_id)

    media_text = ""
    if media_base64 and media_type == "image":
        try:
            media_text = call_vision(media_base64)
        except Exception as e:
            media_text = f"[Image could not be read: {e}]"
    elif media_base64 and media_type == "video":
        media_text = "[Video attached — frame analysis not yet supported]"

    full_message = message
    if media_text:
        full_message = f"{message}\n[Attached {media_type}: {media_text}]"

    memories, explanation = recall_memories(bank_id, full_message)

    prompt = build_prompt(name, device, full_message, memories, prior_outcomes)
    raw = call_llm(prompt)
    reply, used, influence = parse_json(raw)

    for m in memories:
        m["used"] = m["id"] in used

    retained = False
    try:
        retain_content(bank_id, f"{name} said: {full_message}. Engram replied: {reply}")
        retained = True
    except Exception as e:
        print(f"RETAIN FAILED: {type(e).__name__}: {e}")

    return {
        "reply": reply,
        "memories": memories,
        "influence": influence,
        "retained": retained,
        "recall": explanation,
        "media_text": media_text,
    }


def record_outcome(user_id, message_content, outcome_value):
    bank_id = bank_for(user_id)
    label = {"worked": "worked", "failed": "didn't work", "unsure": "unclear"}.get(
        outcome_value, outcome_value
    )
    try:
        retain_content(bank_id, f"Previous suggestion ({message_content[:120]}): {label}.")
    except Exception as e:
        print(f"OUTCOME RETAIN FAILED: {e}")


def get_all_facts(user_id):
    """Return all unique facts in the user's bank, sorted by date."""
    bank_id = bank_for(user_id)
    try:
        raw = _fetch_raw(bank_id)
        deduped = _dedupe_and_merge(raw)
        facts = [{"text": d["text"], "when": d["when"]} for d in deduped]
        facts.sort(key=lambda f: f["when"] or "")
        return facts
    except Exception:
        return []


# Legacy shim so old call sites still work
def get_timeline(user_id: str) -> dict:
    return {"timeline": [], "facts": get_all_facts(user_id)}
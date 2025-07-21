
# recommender.py
from __future__ import annotations      
import json, re
from pathlib import Path
from typing import List, Dict

# Read JSON and return rule-based suggestions
LABEL_MAP: Dict[str, list] = json.loads(Path(__file__).with_name(
    "component_label.json").read_text(encoding="utf‑8"))

def suggest(prompt: str) -> list[dict]:
    """Return [{component: 'input', label:'Username'}, …]"""
    prompt_lc = prompt.lower()
    specs: list[dict] = []
    for keyword, comp_specs in LABEL_MAP.items():
        if re.search(rf"\b{re.escape(keyword)}\b", prompt_lc):
            specs.extend(comp_specs)
    return specs

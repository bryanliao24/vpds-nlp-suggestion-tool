from __future__ import annotations
import json
import os
import re
import uvicorn
from collections import defaultdict
from typing import List, Tuple
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pathlib import Path


from recommender import suggest     # keyword → component mapping logic

# === The project root directory =================================================
COMPONENT_BASE_DIR = Path(__file__).parent / "components"

from pathlib import Path

# === Component → Default File Mapping ===========================================
COMPONENT_FILE_MAP: dict[str, str] = json.loads(
    Path(__file__).with_name("default_component_files_updated.json")
        .read_text(encoding="utf-8")
)

# === FastAPI Configuration ======================================================
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    # allow_origins=["http://localhost:5173"],   # Vite dev server
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# === Pydantic model ===============================================================
class PromptRequest(BaseModel):
    prompt: str

# === Helper function ==============================================================

IMPORT_RE = re.compile(
    r"import\s+{([\s\S]*?)}\s+from\s+['\"]([^'\"]+)['\"]", re.DOTALL
)
ID_DECL_RE = re.compile(r"const\s+id\s*=\s*(['\"][^'\"]+['\"]);?")
LABEL_RE = re.compile(
    r"(<Label\b[^>]*>)(.*?)(</Label>)", flags=re.IGNORECASE | re.DOTALL
)

def apply_label(jsx: str, text: str) -> str:
    """
    Replace the content of the first <Label …>…</Label> in JSX with text.
    """
    return LABEL_RE.sub(lambda m: m.group(1)+text+m.group(3), jsx, count=1)

BTN_RE = re.compile(
    r"(<Button\b[^>]*>)(.*?)(</Button>)", flags=re.IGNORECASE | re.DOTALL
)

def apply_button_text(jsx: str, text: str) -> str:
    """Replace visible text in first <Button>…</Button>"""
    if not text:
        return jsx
    return BTN_RE.sub(lambda m: m.group(1) + text + m.group(3), jsx, count=1)

def read_default_tsx(comp: str) -> str:
    """
    Read the component default tsx file according to COMPONENT_FILE_MAP and skip the first 16 lines of comments.
    If the mapping is missing or the file does not exist, placeholder comments will be returned directly.
    """
    file_name = COMPONENT_FILE_MAP.get(comp)
    if not file_name:
        return f"// snippet not found (no mapping for '{comp}')"

    file_path = os.path.join(COMPONENT_BASE_DIR, comp, file_name)
    if not os.path.isfile(file_path):
        return f"// snippet not found ({file_path} missing)"

    with open(file_path, "r", encoding="utf-8") as f:
        return "".join(f.readlines()[16:])


def _unique_module_imports(import_lines: List[str]) -> List[str]:
    """Merge the import statements of the same module and return the duplicated import list"""
    module_map: dict[str, set[str]] = defaultdict(set)
    passthrough: List[str] = []

    for stmt in import_lines:
        m = IMPORT_RE.match(stmt.strip())
        if m:
            specifiers, module = m.groups()
            for s in map(str.strip, specifiers.split(",")):
                if s:
                    module_map[module].add(s)
        else:
            # default / side‑effect import, leave as is
            passthrough.append(stmt.strip())

    merged: List[str] = [
        f"import {{ {', '.join(sorted(specs))} }} from '{module}';"
        for module, specs in module_map.items()
    ]
    merged.extend(passthrough)
    return sorted(set(merged))     # prevent exact duplication

IMPORT_STMT_RE = re.compile(
    r"import\s+{[\s\S]*?}\s+from\s+['\"][^'\"]+['\"];?", re.MULTILINE
)

# === main.py  ===========================================
IMPORT_STMT_RE  = re.compile(r"import\s+{[\s\S]*?}\s+from\s+['\"][^'\"]+['\"];?")
EXPORT_LINE_RE  = re.compile(r"^\s*export\b")
FUNC_DEF_RE     = re.compile(r"^\s*(const|let|var)\s+\w+\s*=\s*\([^=]*?\)\s*=>\s*{")

TDECL_LINE_RE = re.compile(
    r"""^
    \s*                      # Optional indentation
    (?:                      
        type\s+\w+\s*=         # type  Foo =
    | interface\s+\w+\s*\{   # interface Foo {
    )
    """,
    re.VERBOSE,
)


GENERIC_RE      = re.compile(r"=\s*<[^>(]+>\s*\(")             # "= <T,U>(" → "= ("
RTYPE_RE   = re.compile(r"\)\s*:\s*[\w<>\[\],\s]+\b")      # ") : Foo<T>[] " → ")"

# The line is "destructuring rename" of the form ref: tabsRef,
ALIAS_LINE_RE = re.compile(r"^\s*\w+\s*:\s*\w+\s*,?\s*$")

# Real TS type annotation foo: Bar<Baz>[] (excluding the alias line above)
TS_ANNOT_RE = re.compile(
    r"""
    :\s*                       # :
    [A-Z_]\w*(?:<[^>]*>)?      # Type names start with capital letters and can contain generics
    (?:\[\])?                  # []
    (?=\s*[=,)\{;])            # following with  = , ) { ;
    """,
    re.VERBOSE,
)
TS_PRIMITIVES = r'(?:string|number|boolean|any|unknown|void|null|undefined|never)'
PARAM_TYPE_RE = re.compile(
    rf'(\(|,)\s*([\w$]+)\s*:\s*(?:[A-Z_]\w*{TS_PRIMITIVES})(?:<[^>]+>)?'
)

DESTRUCT_PARAM_RE = re.compile(r'(\}\s*):\s*[A-Z_]\w*(?:<[^>]+>)?')

def _strip_ts(line: str) -> str:
    """
    Remove common TS annotations, but retain alias writing methods such as `ref: tabsRef` in object destructuring
    """
    if ALIAS_LINE_RE.match(line):
        return line.rstrip()               # Just keep the alias line
    
    # First remove the ": Type" on the formal parameter
    line = PARAM_TYPE_RE.sub(r'\1 \2', line)
    line = DESTRUCT_PARAM_RE.sub(r'\1', line)
    line = GENERIC_RE.sub("= (", line)     # Generic function
    line = RTYPE_RE.sub(")", line)         # Return type
    line = TS_ANNOT_RE.sub("", line)       # Variable/parameter type
    # Remove things like useRef<HTMLInputElement> / someFn<Foo, Bar>
    line = re.sub(r"\b(\w+)\s*<[^>]+>", r"\1", line)
    line = re.sub(r'(\w)!([\s\]\)};,])', r'\1\2', line)
    return line.rstrip()

_QUOTE = {"'": "'", '"': '"', '`': '`'}

def _grab_jsx_block(src: str) -> str | None:
    """JSX in return (...), but must start with <"""
    pos = 0
    while True:
        i = src.find('return', pos)
        if i == -1:
            return None
        j = src.find('(', i)
        if j == -1:
            return None

        # First look at the first non-whitespace character after (
        k = j + 1
        while k < len(src) and src[k].isspace():
            k += 1
        if k >= len(src) or src[k] != '<':      # Not JSX, continue to find the next return
            pos = j + 1
            continue

        # Original bracket/curly brace/string balanced scan logic
        p = b = 0
        s = None
        for idx in range(j, len(src)):
            ch = src[idx]
            if s:
                if ch == s and src[idx-1] != '\\':
                    s = None
                continue
            if ch in _QUOTE:
                s = ch
                continue
            if   ch == '(': p += 1
            elif ch == ')': p -= 1
            elif ch == '{': b += 1
            elif ch == '}': b -= 1
            if p == 0 and b == 0:
                return src[j+1:idx]        

def extract_parts(code: str, alias: str):
    # --- Remove import ---------------------------------------------------
    imports = IMPORT_STMT_RE.findall(code)
    body    = IMPORT_STMT_RE.sub("", code)

    # --- Split by the first 'return' ---------------------------------------
    m = re.search(r"return\s*\(\s*<", body)      # Find `return (` followed by `<`
    split_pos = m.start() if m else body.find("return")  # settle for the next best thing
    pre  = body[:split_pos]
    post = body[split_pos:]

    vars_block = []
    for ln in pre.splitlines():
        if not ln.strip():
            continue                                  # empty line
        if EXPORT_LINE_RE.match(ln):
            ln = ln.replace("export ", "", 1)         # Remove export prefix

        # (1) If export is included, it must be the outermost layer, so skip it directly.
        if "export" in ln and FUNC_DEF_RE.match(ln):
            continue

        # (2) It looks like const PascalCase = (...) => { and only keeps the first line
        if re.match(r"^\s*const\s+[A-Z]\w*\s*=\s*\([^=]*?\)\s*=>\s*{", ln):
            continue
        if TDECL_LINE_RE.match(ln):                   # type / interface line, the entire line is discarded
            continue
        vars_block.append(_strip_ts(ln.rstrip()))

    # ---  parse JSX --------------------------------------------------------
    jsx = ""
    for pat in (r"return\s*\(\s*([\s\S]*?)\s*\);",
                r"return\s*(<[\s\S]*?>);"):
        m = re.search(pat, body, re.DOTALL)
        if m:
            jsx = m.group(1).strip()
            break
    
    jsx = _grab_jsx_block(body)
    if not jsx:                       # ② If it fails, fall back to regular
        for pat in (
            r"return\s*\(\s*([\s\S]*?)\s*\);",
            r"return\s*(<[\s\S]*?>);",
        ):
            m = re.search(pat, body, re.DOTALL)
            if m:
                jsx = m.group(1).strip()
                break
    if not jsx:
        jsx = "/* TODO: JSX not parsed */"
    jsx = re.sub(r'(\w)!([\s\]\)};,])', r'\1\2', jsx)
    JSX_GENERIC_RE = re.compile(r'(<\/?\s*\w+)\s*<[^>]+>')

    jsx = JSX_GENERIC_RE.sub(r'\1', jsx)       

    # ---  id → useId replacement -----------------------------------
    m_id = ID_DECL_RE.search("\n".join(vars_block))
    if m_id:
       
        new_var = safe_ident(f"{alias}_id") 

        # --- right after new_var is defined ----------------
        # 1. change *expressions* like `${id}`  →  `${new_var}`
        body  = re.sub(r'\$\{id\}', fr'${{{new_var}}}', body)

        # 2. change JSX braces  {id}  →  {new_var}
        jsx   = re.sub(r'\{(\s*)id(\s*)\}', fr'{{\1{new_var}\2}}', jsx)

        # 3. change the *stand‑alone* identifier id in JS code,
        #    but NOT when it’s a property key (`id:`) nor import/require etc.
        id_use = re.compile(r'\bid\b(?!\s*:)')
        vars_block = [id_use.sub(new_var, ln) for ln in vars_block]

    return imports, vars_block, jsx, f"{alias.capitalize()}Comp"

IDENT_SAFE = re.compile(r'\W')         # " not [0‑9A‑Za‑z_$] "

def safe_ident(name: str) -> str:
    # 1) replace every non‑word char with "_"
    cleaned = IDENT_SAFE.sub('_', name)
    # 2) identifier can't start with a digit, prepend "_" if needed
    return cleaned if not cleaned[0].isdigit() else f'_{cleaned}'

# === interface for suggestion =======================================================
@app.post("/suggest")
async def suggest_components(data: PromptRequest):
    """
    Receive natural language prompt → Return:
      • components: ['input', 'button', ...]
      • snippets: {'input': '...', 'button': '...'}
      • assembled_code: Demo component that can be pasted directly
    """
    
    specs = suggest(data.prompt)           # ← list[dict]
    components = [s["component"] for s in specs]  # Still gives the frontend a flat list
    subcomponents = []          # Save subcomponent code
    calls         = []          # Save <subcomponent/> call


    # Read snippets and assemble
    file_cache = {c: read_default_tsx(c) for c in set(components)}
    import_pool, vars_pool, jsx_pool, counter = [], [], [], {}
    for spec in specs:
        comp        = spec["component"]
        label_text  = spec.get("label", "")
        counter[comp] = counter.get(comp, 0) + 1
        alias = safe_ident(f"{comp}{counter[comp]}") 

        code                = file_cache.get(comp, "// snippet not found")
        imp, vars_, jsx, cname = extract_parts(code, alias)
        jsx                 = apply_label(jsx, label_text)  # Inject tags

        # If it is a Button, replace the internal text as well
        if comp == "button":
            jsx = apply_button_text(jsx, label_text)

        import_pool.extend(imp)
        vars_pool.extend(vars_)
        jsx_pool.append(jsx)
        subcomponents.extend([
            f"function {cname}() {{",
            *vars_,
            "  return (",
            *["    "+ln for ln in jsx.splitlines()],
            "  );",
            "}",
            ""                               # separated by blank lines
        ])
        calls.append(f"      <{cname} />")   # Then insert it into the overall JSX

    # -- Summarize imports (including useId) and generate the final string -------------------------
    import_pool.append("import { useId } from 'react';")
    import_lines = _unique_module_imports(import_pool)

    assembled_lines = []
    assembled_lines.extend(import_lines)
    assembled_lines.append("")               # blank line
    assembled_lines.extend(subcomponents)    # All subcomponents
    assembled_lines.append("export const AssembledDemo = () => (")
    assembled_lines.append("  <>")
    assembled_lines.extend(calls)            # Insert <Child /> row by row
    assembled_lines.append("  </>")
    assembled_lines.append(");")

    assembled_code = "\n".join(assembled_lines)

    # -- Organize snippets (including deduplication index)-------------------------------------
    snippets = {}
    for comp, idx in counter.items():
        if idx == 1:
            snippets[comp] = file_cache.get(comp, "// snippet not found")
        else:
            for i in range(1, idx + 1):
                key = f"{comp}-{i}"
                snippets[key] = file_cache.get(comp, "// snippet not found")

    return {
        "components": components,
        "snippets": snippets,
        "assembled_code": assembled_code,
    }

# === helper function for assemble code------------------------------
def read_variant_tsx(comp: str, variant_name: str) -> str:
    """
    Read tsx based on component name + variant name, still skipping the first 16 lines of comments.
    variant_name is already a plain file prefix without .tsx.
    """
    file_path = os.path.join(COMPONENT_BASE_DIR, comp, f"{variant_name}.tsx")
    if not os.path.isfile(file_path):
        return f"// snippet not found ({file_path} missing)"
    with open(file_path, "r", encoding="utf-8") as f:
        return "".join(f.readlines()[16:])
# ------------------------------------------------------------------

def resolve_component_folder_from_cid(cid: str) -> str:
    """
    Multi-layer matching strategy, the order is as follows:
      1. Exact match (e.g. link → link)
      2. The folder starts with keyword (for example link → link-menu)
      3. Fuzzy matching (including keyword, such as link → anchor-link-menu)
    """
    keyword = cid.split('-')[0]  # e.g., "link" from "link-default"

    exact_match = None
    prefix_match = None
    fuzzy_match = None

    for folder in os.listdir(COMPONENT_BASE_DIR):
        if folder == keyword:
            exact_match = folder
        elif folder.startswith(keyword) and prefix_match is None:
            prefix_match = folder
        elif keyword in folder and fuzzy_match is None:
            fuzzy_match = folder

    if exact_match:
        return exact_match
    elif prefix_match:
        return prefix_match
    elif fuzzy_match:
        return fuzzy_match
    return ""

@app.post("/assemble")
async def assemble_code(data: dict):
    """
    data = {
        "prompt"     : str,
        "selections" : { "input":"clear-button-input", ... }
    }
    """
    prompt      = data.get("prompt", "")
    selections  = data.get("selections", {})

    # ---- The process is almost the same as /suggest, 
    # ---- except that when reading files, read_variant_tsx is used instead. ----
    components   = list(selections.keys())
    subcomponents, calls = [], []
    import_pool, vars_pool = [], []

    for cid in components:
        comp = resolve_component_folder_from_cid(cid)
        if not comp:
            return { "assembled_code": f"// ERROR: Cannot resolve component folder for cid: {cid}" }
       
        alias  = safe_ident(cid)
        tsx    = read_variant_tsx(comp, selections[cid])
        imp, vars_, jsx, cname = extract_parts(tsx, alias)

        import_pool.extend(imp)
        vars_pool  .extend(vars_)
        subcomponents.extend([
            f"function {cname}() {{",
            *vars_,
            "  return (",
            *["    "+ln for ln in jsx.splitlines()],
            "  );",
            "}",
            ""
        ])
        calls.append(f"      <{cname} />")

    import_pool.append("import { useId } from 'react';")
    import_lines = _unique_module_imports(import_pool)

    code = []
    code.extend(import_lines)
    code.append("")
    code.extend(subcomponents)
    code.append("export const AssembledDemo = () => (")
    code.append("  <>")
    code.extend(calls)
    code.append("  </>")
    code.append(");")

    return { "assembled_code": "\n".join(code) }

# === Run main function =========================================================
if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)

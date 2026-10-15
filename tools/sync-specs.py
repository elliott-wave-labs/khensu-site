"""Copies the public specifications from khensu-specs into the developer site (sites/khensu-dev/src/specs).

Links between the copied documents become /specs/<slug>; links to anything else in khensu-specs go to the file on
GitHub. Display names follow AGENTS.md (khensu.ñü, ñü.media, webË) outside code.

  python3 tools/sync-specs.py
"""

import re
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent
SPECS = Path.home() / "Documents/GitHub/khensu/khensu-specs"
OUT = HERE / "sites/khensu-dev/src/specs"
REPO = "https://github.com/elliott-wave-labs/khensu-specs/blob/main/"

DOCS = {
    "WEBE.md": ("webe", "webË specification"),
    "PROTOCOL.md": ("protocol", "Protocol specification"),
    "THREAT-MODEL.md": ("threat-model", "Threat model"),
    "PAYMENTS.md": ("payments", "ñü.wallet specification"),
    "design/nu-media.md": ("nu-media", "ñü.media design"),
    "design/indra.md": ("indra", "îňðřæ.ōġ"),
    "design/nu-avatars.md": ("nu-avatars", "ñü.ævätåřş"),
    "design/nu-aura.md": ("nu-aura", "ñü.åůřâ"),
    "design/nu-glass.md": ("nu-glass", "nu.glass"),
    "FOUNDER-HANDOVER.md": ("founder-handover", "Founder handover"),
    "OPEN-SOURCE.md": ("open-source", "Open source"),
    "LICENSING.md": ("licensing", "Licensing"),
    "nu.harness.md": ("nu.harness", "nu.harness"),
}


def display(text: str) -> str:
    text = re.sub(r"(?<![/\w@.\-])khensu\.nu(?![/\w\-]|\.[a-z])", "khensu.ñü", text)
    text = re.sub(r"(?<![/\w.\-`])nu-media(?![\w/\-.]|\.md)", "ñü.media", text)
    return re.sub(r"(?<![/\w.\-`])webE(?!\w)", "webË", text)


def outside_code(text: str, fn) -> str:
    parts = re.split(r"(```[\s\S]*?```|`[^`\n]*`)", text)
    return "".join(p if p.startswith("`") else fn(p) for p in parts)


def relink(src: str, text: str) -> str:
    base = Path(src).parent

    def fix(m):
        label, target = m.group(1), m.group(2)
        if re.match(r"[a-z]+:|#", target):
            return m.group(0)
        path, _, frag = target.partition("#")
        rel = (base / path).as_posix().lstrip("./") if path else src
        rel = re.sub(r"(^|/)[^/]+/\.\./", r"\1", rel)
        if rel in DOCS:
            return f"[{label}](/specs/{DOCS[rel][0]}{'#' + frag if frag else ''})"
        return f"[{label}]({REPO}{rel}{'#' + frag if frag else ''})"

    return re.sub(r"\[([^\]]+)\]\(([^)\s]+)\)", fix, text)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    keep = {f"{slug}.md" for slug, _ in DOCS.values()}
    for old in OUT.glob("*.md"):
        if old.name not in keep:
            old.unlink()
    for src, (slug, title) in DOCS.items():
        text = (SPECS / src).read_text()
        text = outside_code(relink(src, text), display)
        front = f"---\ntitle: {title!r}\nsource: {src!r}\n---\n\n"
        out = OUT / f"{slug}.md"
        if not out.exists() or out.read_text() != front + text:
            out.write_text(front + text)
            print(f"{src} -> src/specs/{slug}.md")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
# Historical copy of the cost-cap runner used for the Oct 22, 2026 tracking run.
# The deadline, model ids and rates are that run's values; edit them before reuse.
# It shells out to the agent CLIs you have installed and records each call's cost
# in cost-ledger.json, refusing any call that would cross a cap.
"""Hard $ caps for tracking-specs 2026-10-22: $2.00 per repo, $10.00 total. Deadline 16:00 CT.
Usage:
  capped.py codex <repo> <workdir> <prompt_file> <label>          (Sol 6.1: gpt-6.1-sol)
  capped.py claude <repo> <workdir> <prompt_file> <budget> <label> (Opus 5.5, read-only tools)
  capped.py status
Codex cost = estimate at assumed API list rates (ChatGPT plan, no metered bill).
Claude cost = Claude Code total_cost_usd (API-equivalent; Max plan).
"""
import glob, json, os, subprocess, sys, time, datetime
REPO_CAP, TOTAL_CAP = 2.00, 10.00
DEADLINE = datetime.datetime(2026, 10, 22, 16, 0)
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
LEDGER = os.path.join(ROOT, "cost-ledger.json"); COSTLOG = os.path.join(ROOT, "COST-LOG.md")
CODEX_MODEL = "gpt-6.1-sol"; CLAUDE_MODEL = "claude-opus-5-5"
CODEX_RATES = {"input": 2.50, "cached": 0.25, "output": 15.00}
def load(): return json.load(open(LEDGER)) if os.path.exists(LEDGER) else {"calls": []}
def tot(led, repo=None): return round(sum(c["usd"] for c in led["calls"] if repo is None or c["repo"] == repo), 4)
def record(repo, kind, label, usd, extra):
    led = load(); led["calls"].append({"at": datetime.datetime.now().isoformat(timespec="seconds"), "repo": repo,
        "kind": kind, "label": label, "usd": round(usd, 4), **extra}); json.dump(led, open(LEDGER, "w"), indent=2)
    line = f"{datetime.datetime.now():%Y-%m-%d %H:%M} CT | {repo} | {kind} {label} | ${usd:.4f} | repo ${tot(led,repo):.4f}/${REPO_CAP:.2f} | total ${tot(led):.4f}/${TOTAL_CAP:.2f}"
    open(COSTLOG, "a").write(line + "\n"); print("[cap] " + line, file=sys.stderr)
def room(repo):
    led = load(); return TOTAL_CAP - tot(led) if repo == "overhead" else min(REPO_CAP - tot(led, repo), TOTAL_CAP - tot(led))
def precheck(repo, need=0.0):
    if datetime.datetime.now() >= DEADLINE: sys.exit("[cap] ABORT: past 16:00 CT deadline")
    if room(repo) - need <= 0: sys.exit(f"[cap] ABORT: {repo} room ${room(repo):.4f} < need ${need:.2f}")
def codex_cost(u):
    i, c, o = u.get("input_tokens", 0), u.get("cached_input_tokens", 0), u.get("output_tokens", 0)
    return ((i - c) * CODEX_RATES["input"] + c * CODEX_RATES["cached"] + o * CODEX_RATES["output"]) / 1e6
def usage_of(path):
    u = None
    try:
        for line in open(path):
            if '"token_count"' in line:
                try: u = (json.loads(line)["payload"].get("info") or {}).get("total_token_usage") or u
                except Exception: pass
    except FileNotFoundError: pass
    return u or {}
def run_codex(repo, wd, pf, label):
    precheck(repo, 0.10); r0 = min(room(repo) - 0.05, float(os.environ.get("RUN_CAP", "99")))
    pat = os.path.expanduser("~/.codex/sessions/**/*.jsonl"); before = set(glob.glob(pat, recursive=True))
    log = open(os.path.join(ROOT, repo, f"codex-{label}.log"), "w")
    p = subprocess.Popen(["codex", "exec", "-m", CODEX_MODEL, "-s", "workspace-write", "-C", wd, "-"],
                         stdin=open(pf), stdout=log, stderr=subprocess.STDOUT)
    roll, usd, u, killed = None, 0.0, {}, False
    while p.poll() is None:
        time.sleep(5)
        if roll is None:
            new = set(glob.glob(pat, recursive=True)) - before
            roll = max(new, key=os.path.getmtime) if new else None
        if roll: u = usage_of(roll) or u; usd = codex_cost(u)
        if usd >= r0 or datetime.datetime.now() >= DEADLINE:
            p.kill(); killed = True; print(f"[cap] KILLED codex at ${usd:.4f}", file=sys.stderr); break
    p.wait()
    if roll: u = usage_of(roll) or u; usd = codex_cost(u)
    record(repo, "codex/" + CODEX_MODEL, label, usd, {"usage": u, "killed": killed, "exit": p.returncode})
    sys.exit(2 if killed else p.returncode)
def run_claude(repo, wd, pf, budget, label):
    budget = min(float(budget), room(repo) - 0.06); precheck(repo, 0.10)
    env = dict(os.environ); env.pop("ANTHROPIC_API_KEY", None)
    r = subprocess.run(["claude", "-p", "--model", "opus", "--output-format", "json", "--max-budget-usd", f"{budget:.2f}",
        "--permission-mode", "default", "--allowedTools", "Read,Grep,Glob"], cwd=wd, stdin=open(pf),
        capture_output=True, text=True, env=env)
    out = os.path.join(ROOT, repo, f"opus-{label}.json"); open(out, "w").write(r.stdout + ("\n" + r.stderr if r.stderr else ""))
    try: j = json.loads(r.stdout); usd = float(j.get("total_cost_usd") or 0); res = j.get("result", "")
    except Exception: usd, res = budget, ""
    open(os.path.join(ROOT, repo, f"opus-{label}.md"), "w").write(res or "")
    record(repo, "claude/" + CLAUDE_MODEL, label, usd, {"exit": r.returncode})
    print(res); sys.exit(r.returncode)
def run_lite(repo, pf, budget, label):
    """Opus with no tools and a one-line system prompt: the prompt file carries the diff inline."""
    budget = min(float(budget), room(repo) - 0.06); precheck(repo, 0.10)  # one Opus turn can overshoot --max-budget-usd by ~$0.05
    env = dict(os.environ); env.pop("ANTHROPIC_API_KEY", None)
    r = subprocess.run(["claude", "-p", "--model", "opus", "--output-format", "json", "--max-budget-usd", f"{budget:.2f}",
        "--system-prompt", "You are a senior code reviewer. Be terse and exact.", "--tools", "", "--strict-mcp-config",
        "--disable-slash-commands", "--setting-sources", ""], cwd="/tmp", stdin=open(pf), capture_output=True, text=True, env=env)
    os.makedirs(os.path.join(ROOT, repo), exist_ok=True)
    out = os.path.join(ROOT, repo, f"opus-{label}.json"); open(out, "w").write(r.stdout + ("\n" + r.stderr if r.stderr else ""))
    try: j = json.loads(r.stdout); usd = float(j.get("total_cost_usd") or 0); res = j.get("result", "") or j.get("subtype", "")
    except Exception: usd, res = budget, ""
    open(os.path.join(ROOT, repo, f"opus-{label}.md"), "w").write(res or "")
    record(repo, "claude-lite/" + CLAUDE_MODEL, label, usd, {"exit": r.returncode})
    print(res); sys.exit(r.returncode)

if __name__ == "__main__":
    a = sys.argv[1:]
    if not a: sys.exit(__doc__)
    if a[0] == "codex": run_codex(a[1], a[2], a[3], a[4])
    elif a[0] == "claude": run_claude(a[1], a[2], a[3], a[4], a[5])
    elif a[0] == "lite": run_lite(a[1], a[2], a[3], a[4])
    elif a[0] == "status":
        led = load(); print(json.dumps({r: tot(led, r) for r in sorted({c["repo"] for c in led["calls"]})} | {"total": tot(led)}))

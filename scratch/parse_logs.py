import json

log_path = "/Users/fahrifauzaan/.gemini/antigravity-ide/brain/9516d71e-baa8-4030-b570-b2c01405588f/.system_generated/logs/transcript.jsonl"

with open(log_path, 'r') as f:
    for i, line in enumerate(f):
        try:
            data = json.loads(line)
            if data.get('type') == 'BROWSER_SUBAGENT':
                print(f"=== BROWSER_SUBAGENT Step {data.get('step_index')} (Line {i+1}) ===")
                print(data.get('content'))
                print("*" * 80)
        except Exception as e:
            pass

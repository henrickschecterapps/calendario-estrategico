import re

with open('index-2.html', 'r') as f:
    lines = f.read().split('\n')

open_count = 0
for i in range(1735, 1781): # lines 1736 to 1781
    line = lines[i]
    opens = len(re.findall(r'<div\b[^>]*>', line))
    closes = len(re.findall(r'</div>', line))
    open_count += (opens - closes)
    if opens > 0 or closes > 0:
        print(f"Line {i+1}: +{opens} -{closes} | Total: {open_count} | {line.strip()}")

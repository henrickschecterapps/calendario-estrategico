import re

def count_tags(text, start_line, end_line):
    lines = text.split('\n')
    open_count = 0
    for i in range(start_line - 1, end_line):
        line = lines[i]
        open_count += len(re.findall(r'<div\b[^>]*>', line))
        open_count -= len(re.findall(r'</div>', line))
    return open_count

with open('index.html', 'r') as f:
    text = f.read()

# Let's find admin-layout in index.html
import re
lines = text.split('\n')
admin_layout_start = -1
admin_layout_end = -1
for i, line in enumerate(lines):
    if '<div class="admin-layout">' in line:
        admin_layout_start = i + 1
    if '</div><!-- /admin-layout -->' in line:
        admin_layout_end = i + 1

print(f"admin_layout_start: {admin_layout_start}")
print(f"admin_layout_end: {admin_layout_end}")

if admin_layout_start != -1 and admin_layout_end != -1:
    print("Divs left open:", count_tags(text, admin_layout_start, admin_layout_end))

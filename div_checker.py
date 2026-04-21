import re

def count_tags(text, start_line, end_line):
    lines = text.split('\n')
    open_count = 0
    for i in range(start_line - 1, end_line):
        line = lines[i]
        open_count += len(re.findall(r'<div\b[^>]*>', line))
        open_count -= len(re.findall(r'</div>', line))
    return open_count

with open('index-2.html', 'r') as f:
    text = f.read()

# admin-layout starts at 1030
# inner container starts at 1054: <div style="overflow:hidden; display:flex; flex-direction:column;">
print("Divs left open between 1054 and 1204 (start of eventos):", count_tags(text, 1054, 1203))
print("Divs left open between 1204 and 1222 (start of operacional):", count_tags(text, 1204, 1221))
print("Divs left open between 1222 and 1734 (end of operacional):", count_tags(text, 1222, 1734))
print("Divs left open between 1735 and 1780 (end of admin-layout):", count_tags(text, 1735, 1780))

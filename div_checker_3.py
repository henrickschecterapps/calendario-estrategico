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

print("Divs left open from 1030 to 1053:", count_tags(text, 1030, 1053))
print("Divs left open from 1054 to 1204:", count_tags(text, 1054, 1203))
print("Total open from 1030 to 1734:", count_tags(text, 1030, 1734))
print("Total open from 1735 to 1780:", count_tags(text, 1735, 1780))

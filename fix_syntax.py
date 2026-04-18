import re

def process(filename):
    with open(filename, 'r') as f:
        content = f.read()

    # The string to remove is exactly:
    stray = """
     // Reset button text
     if(document.getElementById('btn-save-estoque')) document.getElementById('btn-save-estoque').textContent = '+ Registrar no Almoxarifado';
     if(document.getElementById('btn-save-brinde')) document.getElementById('btn-save-brinde').textContent = '+ Adicionar';
     if(document.getElementById('btn-save-unif')) document.getElementById('btn-save-unif').textContent = '+ Adicionar';
     if(document.getElementById('btn-save-forn')) document.getElementById('btn-save-forn').textContent = '+ Adicionar';
     if(document.getElementById('btn-save-part')) document.getElementById('btn-save-part').textContent = '+ Salvar Participante';
     // Clear badges
     document.getElementById('drawer-title').innerHTML = '<i data-lucide="edit-3"></i> <span>Gestão Operacional</span>';
     if(typeof lucide !== 'undefined') lucide.createIcons();
  };
"""
    content = content.replace(stray, "")

    with open(filename, 'w') as f:
        f.write(content)

process('index.html')
process('index-2.html')

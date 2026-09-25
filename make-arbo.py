#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import html

# Dossiers et fichiers à exclure pour GitHub Pages
EXCLUDE_DIRS = { ".git", ".github"}

EXCLUDE_FILES = {".gitignore", ".gitattributes", "arbo.html"}

class FakeEntry:
    """Simule un objet DirEntry pour assurer la compatibilité avec le reste du script."""
    def __init__(self, name, base_path):
        self.name = name
        self.path = os.path.join(base_path, name)
    def is_dir(self):
        return os.path.isdir(self.path)
    def is_file(self):
        return os.path.isfile(self.path)

def build_tree(path):
    """Construit une structure arborescente (Compatible Python 3.4 / Windows XP)."""
    tree = {
        "name": os.path.basename(path) if path != "." else ".",
        "path": path,
        "folders": [],
        "files": []
    }

    # os.scandir n'existe pas en Python 3.4, on recrée la logique avec os.listdir
    try:
        filenames = os.listdir(path)
    except OSError:
        return tree

    # On crée une liste d'objets simulés
    entries = [FakeEntry(name, path) for name in filenames]
    
    # Tri équivalent à la fonction d'origine
    entries.sort(key=lambda e: (not e.is_dir(), e.name.lower()))

    for entry in entries:
        # exclusions GitHub Pages
        if entry.name in EXCLUDE_DIRS and entry.is_dir():
            continue
        if entry.name in EXCLUDE_FILES and entry.is_file():
            continue

        if entry.is_dir():
            tree["folders"].append(build_tree(entry.path))
        else:
            tree["files"].append({
                "name": entry.name,
                "path": entry.path
            })

    return tree


def build_ascii_html(node, prefix="", is_root=True):
    """Construit l'arborescence HTML avec classes folder/file/ascii."""
    out = ""

    # Racine
    if is_root:
        out += '<span class="folder">{}</span>\n'.format(html.escape(node["name"]))

    entries = node["folders"] + node["files"]
    total = len(entries)

    for i, entry in enumerate(entries):
        last = (i == total - 1)
        branch = "└── " if last else "├── "
        new_prefix = prefix + ("    " if last else "│   ")

        ascii_part = html.escape(prefix + branch)
        ascii_html = '<span class="ascii">{}</span>'.format(ascii_part)

        if "folders" in entry:
            out += (
                ascii_html +
                '<span class="folder">{}/</span>\n'.format(html.escape(entry["name"]))
            )
            out += build_ascii_html(entry, new_prefix, False)

        else:
            rel_path = os.path.relpath(entry["path"], ".").replace("\\", "/")
            name = html.escape(entry["name"])
            out += (
                ascii_html +
                '<a class="file" href="{0}">{1}</a><a class="file" href="{0}" download> [↓] </a>\n'.format(rel_path, name)
            )

    return out


def build_ascii_text(node, prefix="", is_root=True):
    out = ""

    # Racine
    if is_root:
        out += node["name"] + "\n"

    entries = node["folders"] + node["files"]
    total = len(entries)

    for i, entry in enumerate(entries):
        last = (i == total - 1)
        branch = "└── " if last else "├── "
        new_prefix = prefix + ("    " if last else "│   ")

        if "folders" in entry:
            out += prefix + branch + entry["name"] + "/\n"
            out += build_ascii_text(entry, new_prefix, False)
        else:
            out += prefix + branch + entry["name"] + "\n"

    return out


def count_items(tree):
    """Retourne (nb_dossiers, nb_fichiers) dans toute l'arbo."""
    folders = len(tree["folders"])
    files = len(tree["files"])

    for sub in tree["folders"]:
        f2, fi2 = count_items(sub)
        folders += f2
        files += fi2

    return folders, files


def generate_html(tree, nb_folders, nb_files):
    ascii_text = build_ascii_text(tree)

    return """<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Arborescence</title>
<link rel="icon" href="favicon.png" type="image/png">
<style>
body{{background:black;color:#f44;font-family:monospace;}}
pre.tree{{padding:5px;}}
.folder{{color:#f00;}}
.file{{color:#f44;text-decoration:none;}}
.file:hover{{text-decoration:underline;}}
.ascii{{color:#f44;}}
</style>
</head>
<body>
<p>Dossiers : {0}, Fichiers : {1}</p>
<pre class="tree">
{2}</pre>
<button id="copyarbo" style="background:#000;color:#ccc;border:none;cursor:pointer;">[Copier]</button>
<br><textarea wrap="off" id="arbo" style="width:100%;height:200px;box-sizing:border-box;background:#000;color:#ccc;border:2px groove #888;font-family:monospace;">
{3}</textarea>
<script>function copyFrom(id,btn){{var code=document.getElementById(id);var temp=document.createElement("textarea");temp.value=code.value;document.body.appendChild(temp);temp.select();try{{document.execCommand("copy");}}catch(err){{}}document.body.removeChild(temp);btn.focus();}}document.getElementById("copyarbo").onclick=function(e){{copyFrom("arbo",e.target);}};</script>
</body>
</html>
""".format(nb_folders, nb_files, build_ascii_html(tree), ascii_text)


def main():
    root_name = "interfaces-web/"   # Nom de la racine

    tree = build_tree(".")
    tree["name"] = root_name

    nb_folders, nb_files = count_items(tree)
    html_content = generate_html(tree, nb_folders, nb_files)

    with open("arbo.html", "w", encoding="utf-8") as f:
        f.write(html_content)

    print("Fichier généré : arbo.html")


if __name__ == "__main__":
    main()

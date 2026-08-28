#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import html

# Dossiers et fichiers à exclure pour GitHub Pages
EXCLUDE_DIRS = { ".git", ".github"}

EXCLUDE_FILES = {".gitignore", ".gitattributes", "arbo.html"}

def build_tree(path):
    """Construit une structure arborescente."""
    tree = {
        "name": os.path.basename(path) if path != "." else ".",
        "path": path,
        "folders": [],
        "files": []
    }

    with os.scandir(path) as it:
        for entry in sorted(it, key=lambda e: (not e.is_dir(), e.name.lower())):

            # exclusions GitHub Pages
            if entry.name in EXCLUDE_DIRS and entry.is_dir():
                continue
            if entry.name in EXCLUDE_FILES and entry.is_file():
                continue
            # if entry.name.startswith("."):
                # continue

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
        out += f'<span class="folder">{html.escape(node["name"])}</span>\n'

    entries = node["folders"] + node["files"]
    total = len(entries)

    for i, entry in enumerate(entries):
        last = (i == total - 1)
        branch = "└── " if last else "├── "
        new_prefix = prefix + ("    " if last else "│   ")

        ascii_part = html.escape(prefix + branch)
        ascii_html = f'<span class="ascii">{ascii_part}</span>'

        if "folders" in entry:
            out += (
                ascii_html +
                f'<span class="folder">{html.escape(entry["name"])}/</span>\n'
            )
            out += build_ascii_html(entry, new_prefix, False)

        else:
            rel_path = os.path.relpath(entry["path"], ".").replace("\\", "/")
            name = html.escape(entry["name"])
            out += (
                ascii_html +
                f'<a class="file" href="{rel_path}">{name}</a><a class="file" href="{rel_path}" download> [↓] </a>\n'
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

    return f"""<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Arborescence</title>
<style>
body{{background:black;color:#0f0;font-family:monospace;}}
pre.tree{{padding:5px;}}
.folder{{color:#4af;}}
.file{{color:#0f0;text-decoration:none;}}
.file:hover{{text-decoration:underline;}}
.ascii{{color:#0f0;}}
</style>
</head>
<body>
<p>Dossiers : {nb_folders}, Fichiers : {nb_files}</p>
<pre class="tree">
{build_ascii_html(tree)}</pre>
<button id="copyarbo" style="background:#000;color:#ccc;border:none;cursor:pointer;">[Copier]</button>
<br><textarea wrap="off" id="arbo" style="width:100%;height:200px;box-sizing:border-box;background:#000;color:#ccc;border:2px groove #808080;font-family:monospace;">
{ascii_text}</textarea>
<script>function copyFrom(id,btn){{var code=document.getElementById(id);var temp=document.createElement("textarea");temp.value=code.value;document.body.appendChild(temp);temp.select();try{{document.execCommand("copy");}}catch(err){{}}document.body.removeChild(temp);btn.focus();}}document.getElementById("copyarbo").onclick=function(e){{copyFrom("arbo",e.target);}};</script>
</body>
</html>
"""


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

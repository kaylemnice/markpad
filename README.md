# MarkPad

A markdown reader and editor for Mac. Opens any `.md` file and shows it formatted. All editing happens through toolbar buttons, no need for writing markdown syntax.

## Install

You need [Node.js](https://nodejs.org) installed. Then:

```bash
git clone https://github.com/kaylemnice/markpad.git
cd markpad
./install.sh
```

MarkPad ends up in your Applications folder.

To make it the default for `.md` files: right-click any `.md` file in Finder → Get Info → Open with: MarkPad → Change All.

## Using it

- Open files with the Open button, by dragging them onto the window, or by double-clicking them in Finder
- The sidebar shows your recent files and every markdown file in the current folder
- Format with the toolbar: headings, bold, italic, lists, checklists, tables, quotes, links, code
- File actions live in the ⋯ menu: Save As, Rename, Show in Finder, Move to Trash
- Prefer raw markdown? ⋯ → View raw Markdown

## Shortcuts

| Keys | Does |
|------|------|
| ⌘B | Bold |
| ⌘I | Italic |
| ⌘Z / ⇧⌘Z | Undo / Redo |
| ⌘N | New file |
| ⌘O | Open file |
| ⌘S | Save |
| ⇧⌘S | Save As |

## Run from source

```bash
npm install
npm start
```

MIT licensed.

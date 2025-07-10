Trosyn AI – Rich Text Editor Module Plan

**Editor Framework:** [Editor.js](https://editorjs.io)
**Purpose:** Embed a Notion-style, offline-first, block-based editor inside Trosyn AI
**Tech Fit:** Lightweight, structured JSON format, editable/extendable for custom blocks

---

### 🎯 Core Goals

| Area            | Description                                                               |
| --------------- | ------------------------------------------------------------------------- |
| ✅ UI Simplicity | Minimalist editor (like Notion, not like Word)                            |
| ✅ Offline-First | Fully functional without internet (Gemma 3N local AI runs all features) |
| ✅ Extendable    | Custom blocks to support AI operations, summary, merge, tagging, etc.     |
| ✅ Integratable  | Pluggable into Trosyn child apps (HR, Marketing, etc.)                    |

---

### 🛠️ Features to Build

#### 1. 📄 **Base Editor Integration (Editor.js)**

* Add Editor.js as the rich text editor
* Core blocks: paragraph, heading, checklist, table, image, code, quote
* Save as structured JSON locally
* Load saved JSON on page open

#### 2. 🧠 **AI-Powered Blocks & Commands**

AI runs locally using **Gemma 3N** embedded in the Trosyn AI offline agent.

| Feature                    | Description                                           |
| -------------------------- | ----------------------------------------------------- |
| ✍️ AI Suggestion Block     | Generate suggestions based on existing content        |
| 🔁 AI Rewrite Block        | Rewrites paragraph or summary in simpler tone         |
| 🧠 Summarize Note          | Auto-summary of entire note or section                |
| 🏷️ Smart Tags             | Extract and suggest keywords/tags                     |
| 🔗 Merge Similar Notes     | Detect similar notes, merge or suggest link           |
| 📎 Reference Block         | Pull in relevant docs/snippets from other departments |
| ✏️ Grammar/Spell Check     | Inline correction (local-only) using Gemma 3N         |
| ⏱️ Time/Date Reminder Tags | Parse and flag time references, add reminders         |

#### 3. 📦 **Custom Blocks**

You’ll create new Editor.js block plugins (JS modules) for:

* `ai-summary-block`
* `ai-rewrite-block`
* `ai-tag-block`
* `note-merge-block`
* `reference-injector`
* `comment-thread-block` (for team review)
* Optional: embed charts, files, tasks

#### 4. 🧩 Editor Actions / Sidebar Tools

| Tool                 | Action                                                      |
| -------------------- | ----------------------------------------------------------- |
| Merge notes          | Select 2+ notes and merge via AI                            |
| Find similar         | Auto-scan all saved JSON notes and suggest related ones     |
| Add tag              | AI-generated or manual                                      |
| Convert note to task | Turn paragraph into checklist/task item                     |
| Cross-reference      | Show matching content from other modules (e.g. Finance, HR) |

---

### ⚙️ Offline + Sync Requirements

* Save JSON block content to local storage or embedded SQLite
* Sync over LAN with central Trosyn Hub when online
* Encrypted local logs of edits
* Soft-lock editing when user is overdue on billing (offline enforcement logic)
* Avoids internet calls—Gemma 3.1B model runs all AI features

---

### 🧪 Editor Dev To-Do List

| Step | Task                                               |
| ---- | -------------------------------------------------- |
| 1    | Install Editor.js and basic blocks                 |
| 2    | Add local JSON save/load logic                     |
| 3    | Create wrapper plugin system for custom blocks     |
| 4    | Add `ai-summary-block` as proof of concept         |
| 5    | Integrate local Gemma inference calls per block    |
| 6    | Set up sidebar with note management tools          |
| 7    | Add merge, search, and cross-reference tools       |
| 8    | Enable sync with Trosyn LAN sync module            |
| 9    | Add soft-locks based on billing enforcement        |
| 10   | UX polish and block toolbar cleanup (Notion-style) |

---

### 🔐 Security and Control

* No external API calls
* AI runs fully on-device using embedded model
* Blocks can be restricted per department/user role
* All notes are stored encrypted and logged for audit

Here’s your full starter setup to give to the developer: file structure, plugin scaffold, and an example `ai-summary-block` that connects to the local Gemma AI. It's lightweight and built to slot into Trosyn’s frontend.

---

## 📁 Folder Structure – `editor/` module inside Trosyn App

```
/editor
├── index.html               # Optional: preview shell
├── main.js                  # Mount Editor.js and custom blocks
├── styles.css               # Editor styling
├── blocks/
│   ├── ai-summary-block.js  # Custom block: AI-powered summary
│   ├── ai-rewrite-block.js  # (To be added later)
│   ├── ai-tag-block.js      # (To be added later)
│   └── ... more blocks
├── utils/
│   ├── storage.js           # Load/save editor data
│   └── ai.js                # Local call to Gemma 3.1B
```

---

## 🧱 `main.js` – Set Up Editor.js With Custom Blocks

```js
import EditorJS from '@editorjs/editorjs'
import Header from '@editorjs/header'
import List from '@editorjs/list'
import Paragraph from '@editorjs/paragraph'

import AiSummaryBlock from './blocks/ai-summary-block.js'

const editor = new EditorJS({
  holder: 'editor',
  tools: {
    header: Header,
    list: List,
    paragraph: Paragraph,
    aiSummary: AiSummaryBlock
  },
  data: await loadEditorData() // Load from local storage or DB
})

// Save handler
function saveEditor() {
  editor.save().then((outputData) => {
    saveEditorData(outputData)
  }).catch((error) => {
    console.error('Save failed: ', error)
  })
}
```

---

## ⚙️ `blocks/ai-summary-block.js` – Custom Block with AI

```js
import { runGemmaSummary } from '../utils/ai.js'

export default class AiSummaryBlock {
  static get toolbox() {
    return {
      title: 'AI Summary',
      icon: '<svg>...</svg>' // Add icon or keep blank
    }
  }

  constructor({ data }) {
    this.data = data
    this.container = document.createElement('div')
    this.container.classList.add('ai-summary-block')
    this.container.innerHTML = `
      <textarea placeholder="Type text to summarize...">${this.data.text || ''}</textarea>
      <button>Summarize with AI</button>
      <div class="summary-output">${this.data.summary || ''}</div>
    `
    this.container.querySelector('button').addEventListener('click', async () => {
      const inputText = this.container.querySelector('textarea').value
      const summary = await runGemmaSummary(inputText)
      this.container.querySelector('.summary-output').textContent = summary
      this.data.summary = summary
    })
  }

  render() {
    return this.container
  }

  save() {
    return {
      text: this.container.querySelector('textarea').value,
      summary: this.container.querySelector('.summary-output').textContent
    }
  }
}
```

---

## 🤖 `utils/ai.js` – Offline Call to Gemma 3.1B

Assumes you already have a local agent set up that can take input and return a summary. You can run it via:

* Python subprocess
* Local server API call
* Node local function call

Basic example with fetch (you replace the logic):

```js
export async function runGemmaSummary(text) {
  const response = await fetch('http://localhost:11434/gemma-summary', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text })
  })
  const result = await response.json()
  return result.summary || 'No summary returned.'
}
```

---

## 🗂️ `utils/storage.js` – Save and Load JSON Locally

```js
export function saveEditorData(data) {
  localStorage.setItem('trosynEditor', JSON.stringify(data))
}

export async function loadEditorData() {
  const saved = localStorage.getItem('trosynEditor')
  return saved ? JSON.parse(saved) : null
}
```

---

## ✅ Next Plugin Ideas (Same Format)

| Plugin Name          | Purpose                      |
| -------------------- | ---------------------------- |
| `ai-rewrite-block`   | Rewrite text in simple terms |
| `ai-tag-block`       | Suggest tags or keywords     |
| `note-merge-block`   | Compare + merge notes        |
| `reference-injector` | Pull relevant cross-doc refs |

---

## 🛠️ Setup Instructions for Developer

1. Clone the editor folder into Trosyn frontend project
2. Install dependencies:

   ```bash
   npm install @editorjs/editorjs @editorjs/header @editorjs/list
   ```
3. Start local AI agent (Gemma 3.1B) with endpoint for summarization
4. Load the editor and test AI summary block
5. Expand with new custom blocks as needed

---
Here’s everything broken down into **three parts** as requested:

---

## ✅ 1. Sample HTML Shell with UI Loaded (`index.html`)

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Trosyn AI Editor</title>
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <div id="editor" style="max-width: 800px; margin: auto; padding: 20px;"></div>
  <button onclick="saveEditor()">💾 Save</button>

  <script type="module" src="main.js"></script>
</body>
</html>
```

---

## ✅ 2. Python Code to Call Gemma 3.1B Directly

Assuming you're using **Gemma 3.1B** with `transformers`, `llama-cpp`, or similar in your local environment.

### 🐍 Python File: `gemma_summary.py`

```python
import sys
import json
from transformers import AutoTokenizer, AutoModelForCausalLM, pipeline

# Load model once on startup
model_name = "google/gemma-3n-e2b"
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForCausalLM.from_pretrained(model_name)
summarizer = pipeline("summarization", model=model, tokenizer=tokenizer)

def summarize(text):
    result = summarizer(text, max_length=80, min_length=20, do_sample=False)
    return result[0]["summary_text"]

if __name__ == "__main__":
    input_json = sys.stdin.read()
    text = json.loads(input_json).get("text", "")
    summary = summarize(text)
    print(json.dumps({ "summary": summary }))
```

### 📥 Call from Node.js via `child_process`

In your `utils/ai.js`:

```js
import { spawn } from 'child_process'

export function runGemmaSummary(text) {
  return new Promise((resolve, reject) => {
    const py = spawn('python3', ['editor/utils/gemma_summary.py'])
    let result = ''
    py.stdout.on('data', (data) => (result += data.toString()))
    py.stderr.on('data', (err) => console.error(err.toString()))
    py.on('close', () => {
      try {
        const json = JSON.parse(result)
        resolve(json.summary)
      } catch (e) {
        reject('Invalid summary result')
      }
    })
    py.stdin.write(JSON.stringify({ text }))
    py.stdin.end()
  })
}
```

---

## ✅ 3. Electron Bundle Setup for Desktop Child Apps

You’ll package the editor into an **Electron app**, using your existing Trosyn desktop environment.

### 📁 Structure

```
/trosyn-electron
├── main.js             # Electron main process
├── preload.js          # Optional sandbox
├── index.html          # Loads Editor UI
├── editor/             # Everything we’ve built
│   └── ...
├── package.json
```

### ⚙️ `main.js`

```js
const { app, BrowserWindow } = require('electron')
const path = require('path')

function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })
  win.loadFile('index.html')
}

app.whenReady().then(createWindow)
```

### 🧩 `package.json`

```json
{
  "name": "trosyn-editor",
  "version": "1.0.0",
  "main": "main.js",
  "scripts": {
    "start": "electron ."
  },
  "dependencies": {
    "@editorjs/editorjs": "^2.29.1",
    "@editorjs/header": "^2.7.0",
    "@editorjs/list": "^1.8.0"
  },
  "devDependencies": {
    "electron": "^30.0.0"
  }
}
```

---

### 🛠️ To Run

```bash
npm install
npm run start
```

You now have a **desktop Trosyn Editor** app that:

* Works offline
* Uses Editor.js
* Talks to local Gemma 3.1B for AI-powered blocks
* Saves everything locally (you can extend to SQLite or file-based logs)

---

Here’s your full implementation plan for:

* ✅ Cross-platform packaging (DMG for macOS, EXE for Windows)
* ✅ SQLite local storage
* ✅ LAN sync to your Trosyn Hub backend

This setup completes your **offline-first, desktop-ready Trosyn AI Editor** system.

---

## ✅ 1. Cross-Platform Packaging (Electron → DMG / EXE)

You’ll use [`electron-builder`](https://www.electron.build/) to create distributable apps.

### 📦 Install

```bash
npm install --save-dev electron-builder
```

### 🧩 `package.json` updates

```json
{
  "name": "trosyn-editor",
  "version": "1.0.0",
  "main": "main.js",
  "build": {
    "appId": "com.trosyn.editor",
    "productName": "Trosyn Editor",
    "files": [
      "**/*"
    ],
    "mac": {
      "target": "dmg"
    },
    "win": {
      "target": "nsis"
    }
  },
  "scripts": {
    "start": "electron .",
    "dist": "electron-builder"
  }
}
```

### 🔨 To Build

```bash
npm run dist
```

Output:

* `dist/Trosyn Editor Setup.exe` (Windows)
* `dist/Trosyn Editor.dmg` (macOS)

No internet required—pure offline installers.

---

## ✅ 2. SQLite Local Note Storage

Use `better-sqlite3` for fast, lightweight storage.

### 📦 Install

```bash
npm install better-sqlite3
```

### 📁 Folder

```
/editor
  └── database/
      └── notes.db
```

### 🧠 `db.js` – Core API

```js
import Database from 'better-sqlite3'
const db = new Database('./editor/database/notes.db')

// Create table if not exists
db.exec(`
  CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY,
    title TEXT,
    content TEXT,
    updated_at TEXT
  );
`)

export function saveNote(id, title, content) {
  const stmt = db.prepare(`REPLACE INTO notes (id, title, content, updated_at) VALUES (?, ?, ?, ?)`)
  stmt.run(id, title, JSON.stringify(content), new Date().toISOString())
}

export function loadNote(id) {
  const row = db.prepare(`SELECT content FROM notes WHERE id = ?`).get(id)
  return row ? JSON.parse(row.content) : null
}

export function listNotes() {
  return db.prepare(`SELECT id, title, updated_at FROM notes ORDER BY updated_at DESC`).all()
}
```

You can wire this into `main.js` for Editor.js load/save logic instead of localStorage.

---

## ✅ 3. LAN Sync with Trosyn Hub

Assumes Hub exposes an HTTP API over local IP like `http://192.168.1.x:3000/api/sync`

### 🗂️ Sync Strategy

| Step           | Action                                     |
| -------------- | ------------------------------------------ |
| 🟢 When online | Try to ping Hub IP                         |
| 📥 Pull        | Check for newer notes (timestamp)          |
| 📤 Push        | Send unsynced local notes                  |
| 🔐 Secure      | Use local LAN token/secret or allowlisting |

### ⚙️ Sample `sync.js`

```js
import axios from 'axios'

const HUB_URL = 'http://192.168.1.100:3000/api/sync'

export async function syncToHub(note) {
  try {
    await axios.post(`${HUB_URL}/push`, { note })
  } catch (err) {
    console.error('Push failed', err.message)
  }
}

export async function pullFromHub() {
  try {
    const res = await axios.get(`${HUB_URL}/pull`)
    return res.data.notes || []
  } catch (err) {
    console.error('Pull failed', err.message)
    return []
  }
}
```

You can auto-trigger this on:

* App open
* Timer (e.g. every 10 mins)
* Manual "Sync Now" button

---

## 🔐 Billing Enforcement & Soft Locks

Use a local encrypted config (e.g., `license.db`) to:

* Track offline duration
* Trigger lock after X days without check-in
* Block editing but allow viewing
* Use secure local timer + hash check

This has already been outlined in earlier messages.

---

## 🧱 Final Structure Summary

```
/trosyn-editor
├── main.js              # Electron app shell
├── index.html
├── editor/
│   ├── main.js          # EditorJS logic
│   ├── blocks/          # Custom AI blocks
│   ├── utils/
│   │   ├── ai.js
│   │   ├── sync.js
│   │   └── db.js
│   └── database/
│       └── notes.db     # SQLite storage
├── package.json
```

---

Done. Here's what's now included in the working plan:

// ============================
// 1. LAN SYNC BACKEND (Node.js)
// ============================

// server.js
const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser')
const sqlite = require('better-sqlite3')

const app = express()
const db = new sqlite('./server/notes.db')

app.use(cors())
app.use(bodyParser.json())

// Create table if not exists
db.exec(`CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  title TEXT,
  content TEXT,
  updated_at TEXT
);`)

// GET all notes
app.get('/api/sync/pull', (req, res) => {
  const rows = db.prepare('SELECT * FROM notes ORDER BY updated_at DESC').all()
  res.json({ notes: rows })
})

// POST note (create/update)
app.post('/api/sync/push', (req, res) => {
  const { id, title, content, updated_at } = req.body.note
  const stmt = db.prepare('REPLACE INTO notes (id, title, content, updated_at) VALUES (?, ?, ?, ?)')
  stmt.run(id, title, JSON.stringify(content), updated_at)
  res.json({ status: 'ok' })
})

app.listen(3000, () => console.log('LAN Sync API running on port 3000'))


// ============================================
// 2. SQLITE MIGRATION FOR EXISTING JSON NOTES
// ============================================

// migrate.js
const fs = require('fs')
const path = require('path')
const sqlite = require('better-sqlite3')
const db = new sqlite('./server/notes.db')

const notesDir = './legacy-notes-json' // directory with .json files

const files = fs.readdirSync(notesDir)
files.forEach(file => {
  if (!file.endsWith('.json')) return
  const fullPath = path.join(notesDir, file)
  const data = JSON.parse(fs.readFileSync(fullPath, 'utf-8'))

  const id = file.replace('.json', '')
  const title = data.title || 'Untitled'
  const content = JSON.stringify(data.content || {})
  const updated_at = new Date().toISOString()

  db.prepare(`REPLACE INTO notes (id, title, content, updated_at) VALUES (?, ?, ?, ?)`) 
    .run(id, title, content, updated_at)
})

console.log('Migration complete')


// ====================================
// 3. AUTO-EXPORT TO MARKDOWN & PDF
// ====================================

// export.js
const { execSync } = require('child_process')
const markdownPdf = require('markdown-pdf')
const fs = require('fs')
const path = require('path')

function exportToMarkdown(note) {
  const md = `# ${note.title}\n\n` + note.content.blocks.map(block => {
    if (block.type === 'paragraph') return block.data.text
    if (block.type === 'header') return `${'#'.repeat(block.data.level)} ${block.data.text}`
    if (block.type === 'list') return block.data.items.map(i => `- ${i}`).join('\n')
    return ''
  }).join('\n\n')

  const filePath = `./exports/${note.id}.md`
  fs.writeFileSync(filePath, md)
  return filePath
}

function exportToPdf(mdPath) {
  const pdfPath = mdPath.replace('.md', '.pdf')
  markdownPdf().from(mdPath).to(pdfPath, () => {
    console.log('Exported to PDF:', pdfPath)
  })
}

// Example:
// const note = JSON.parse(fs.readFileSync('./note.json'))
// const mdPath = exportToMarkdown(note)
// exportToPdf(mdPath)


// ==============================
// 4. NOTE VERSIONING PER EDIT
// ==============================

// Add versioning table
// In server.js or separate migration file

db.exec(`CREATE TABLE IF NOT EXISTS note_versions (
  id TEXT,
  version_id TEXT PRIMARY KEY,
  content TEXT,
  saved_at TEXT
);`)

function saveNoteVersion(id, content) {
  const versionId = id + '-' + Date.now()
  const stmt = db.prepare('INSERT INTO note_versions (id, version_id, content, saved_at) VALUES (?, ?, ?, ?)')
  stmt.run(id, versionId, JSON.stringify(content), new Date().toISOString())
}

// Call this on every edit-save cycle
// saveNoteVersion(note.id, note.content)

// Retrieve versions for UI diff/history tools
// db.prepare('SELECT * FROM note_versions WHERE id = ? ORDER BY saved_at DESC').all(noteId)

---

## ✅ Delivered Features

| Feature                      | Included                                            |
| ---------------------------- | --------------------------------------------------- |
| **LAN Sync (Node.js)**       | ✅ Express API with push/pull routes                 |
| **SQLite Migration**         | ✅ Script to import legacy JSON files                |
| **Auto-export Markdown/PDF** | ✅ Export content blocks to `.md` and `.pdf`         |
| **Note Versioning**          | ✅ Store every edit as a new version with timestamps |

---

🔧 FastAPI Version (instead of Node.js)
If you prefer a Python-based backend for syncing and versioning:

Feature	Status
/sync/pull (GET)	Return all notes from SQLite
/sync/push (POST)	Accept and save note JSON
/versions/{note_id}	List all saved versions of a note
Optional /diff/{version_id}	Return differences vs latest

This keeps your stack consistent if you're running Gemma or Unstructured in Python already.

🧠 UI Components for Version / History
Can be React or Vue, for Electron or web:

Component	Purpose
VersionListSidebar	Lists all versions of current note
VersionPreviewModal	Preview a past version (read-only)
VersionDiffViewer	Shows side-by-side or inline diff
RestoreVersionButton	Replaces current note with selected version

Would hook into:

SQLite note_versions table

Editor.js load/save hooks

🧩 Optional Add-Ons
Feature	Benefit
Version auto-title	Store edited by, summary of change, etc.
Version tags (e.g., “final”)	Mark major milestones manually
JSON diff logic	Custom block-wise comparison, not raw text
Merge tool	Merge past version with current on block level

By default, Editor.js does not come with a table tool, but you can add that functionality using a plugin.

⸻

🔧 To enable table creation (for accountant or finance teams):
    1.    Install the Table plugin:

npm install @editorjs/table

    2.    Import and register it:

import EditorJS from '@editorjs/editorjs';
import Table from '@editorjs/table';

const editor = new EditorJS({
  holder: 'editorjs',
  tools: {
    table: Table,
    // other tools...
  },
});

    3.    Configure table options if needed:

tools: {
  table: {
    class: Table,
    inlineToolbar: true,
    config: {
      rows: 2,
      cols: 3,
    },
  },
}


⸻

✅ Once added:
    •    Teams can insert tables into documents
    •    Data is saved in JSON format
    •    You can render/export as HTML, Markdown, or custom PDF views

⸻

🧩 Offline Consideration:

Make sure the @editorjs/table plugin is:
    •    Installed via npm or bundled locally
    •    Not imported from a CDN

⸻

Summary:

You can enable table creation for the accountant/finance team. You just need to include the table plugin in your Editor.js config. It’s not part of the default build but easy to integrate.

 adding a table for the financial depertment
 
By default, Editor.js does not come with a table tool, but you can add that functionality using a plugin.

⸻

🔧 To enable table creation (for accountant or finance teams):
    1.    Install the Table plugin:

npm install @editorjs/table

    2.    Import and register it:

import EditorJS from '@editorjs/editorjs';
import Table from '@editorjs/table';

const editor = new EditorJS({
  holder: 'editorjs',
  tools: {
    table: Table,
    // other tools...
  },
});

    3.    Configure table options if needed:

tools: {
  table: {
    class: Table,
    inlineToolbar: true,
    config: {
      rows: 2,
      cols: 3,
    },
  },
}


⸻

✅ Once added:
    •    Teams can insert tables into documents
    •    Data is saved in JSON format
    •    You can render/export as HTML, Markdown, or custom PDF views

⸻

🧩 Offline Consideration:

Make sure the @editorjs/table plugin is:
    •    Installed via npm or bundled locally
    •    Not imported from a CDN

⸻

Summary:

You can enable table creation for the accountant/finance team. You just need to include the table plugin in your Editor.js config. It’s not part of the default build but easy to integrate.

Trosyn AI’s departmental use cases (Finance, HR, Marketing, Admin, etc.), here’s a breakdown of useful Editor.js tools to add per department — all can work offline if bundled correctly.

⸻

🔧 Recommended Editor.js Plugins by Department

Department    Need / Use Case    Editor.js Plugin    Offline Ready?
Finance    Tables for reports, figures    @editorjs/table    ✅ Yes
    Math formulas / budgets    editorjs-math (KaTeX-based)    ⚠️ Bundle KaTeX locally
HR    Checklists (onboarding, tasks)    @editorjs/checklist    ✅ Yes
    Templates (leave forms, evaluation)    Use saved blocks / versioning    ✅ Yes
Marketing    Image + text layouts    @editorjs/image, @editorjs/paragraph    ✅ Yes
    Embeds (optional if online access allowed)    @editorjs/embed    ❌ Online needed — skip or disable
    Links with previews    @editorjs/link    ⚠️ Needs metadata API — bundle fallback or remove
General Admin    Notes, lists, memos    @editorjs/list, @editorjs/delimiter    ✅ Yes
    File uploads    Custom plugin to store to disk    ✅ With local backend
All Teams    Markdown export    Use editorjs-parser or custom    ✅ Yes
    Spell check or summarize with AI    Use Gemma locally    ✅ Yes


⸻

📦 Essential Plugins to Bundle (Locally)

Plugin    npm Package / Source    Note
Paragraph    Built-in    Main content block
Header    @editorjs/header    Titles, subheadings
List    @editorjs/list    Bullet and numbered lists
Checklist    @editorjs/checklist    Task tracking
Table    @editorjs/table    Data tables
Delimiter    @editorjs/delimiter    Visual separators
Quote    @editorjs/quote    For citations or remarks
Image    @editorjs/image    Offline version needs local upload
Marker    @editorjs/marker    Highlight text
Warning    @editorjs/warning    Alerts or attention blocks


⸻

🚫 Plugins to Avoid (Offline Use)

Plugin    Reason
Embed    Depends on external services (YouTube, Twitter, etc.)
LinkTool    Requires online metadata fetching
Raw HTML    Risky if users inject unsafe code (sandbox it if needed)


⸻

🧠 Bonus: AI Features (via Gemma)

Feature    Department    Trigger or UI
Spell check    All    Button or live edit
Summarize notes    Admin, HR    Button on doc header
Auto-format minutes    Admin    Based on input pattern
Convert to PDF/Markdown    All    Export option


⸻

✅ Final Suggestions
    1.    Create per-role editor presets
    •    Finance editor pre-loads Table, Checklist
    •    Marketing gets Image, Quote, Header
    •    Admin gets List, Paragraph, Delimiter
    2.    Versioning and template support
    •    Allow saving reusable blocks/templates
    •    Auto-version edits for auditability
    3.    Local file/image storage backend
    •    Use Node.js or SQLite to store and retrieve assets

🔧 FastAPI Version (instead of Node.js)
If you prefer a Python-based backend for syncing and versioning:

Feature	Status
/sync/pull (GET)	Return all notes from SQLite
/sync/push (POST)	Accept and save note JSON
/versions/{note_id}	List all saved versions of a note
Optional /diff/{version_id}	Return differences vs latest

This keeps your stack consistent if you're running Gemma or Unstructured in Python already.

🧠 UI Components for Version / History
Can be React or Vue, for Electron or web:

Component	Purpose
VersionListSidebar	Lists all versions of current note
VersionPreviewModal	Preview a past version (read-only)
VersionDiffViewer	Shows side-by-side or inline diff
RestoreVersionButton	Replaces current note with selected version

Would hook into:

SQLite note_versions table

Editor.js load/save hooks

🧩 Optional Add-Ons
Feature	Benefit
Version auto-title	Store edited by, summary of change, etc.
Version tags (e.g., “final”)	Mark major milestones manually
JSON diff logic	Custom block-wise comparison, not raw text
Merge tool	Merge past version with current on block level



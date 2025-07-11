<template>
  <div class="app">
    <header class="app-header">
      <div class="app-title">Trosyn AI Editor</div>
      <div class="app-actions">
        <button class="btn" @click="saveDocument">Save</button>
        <button class="btn" @click="exportDocument">Export</button>
      </div>
    </header>
    
    <main class="editor-container">
      <div id="editor-js" class="editor"></div>
    </main>
    
    <footer class="app-footer">
      <div class="status-bar">
        <span v-if="isSaving" class="status-saving">Saving...</span>
        <span v-else class="status-saved">All changes saved</span>
      </div>
    </footer>
  </div>
</template>

<script lang="ts">
import { defineComponent, onMounted, ref } from 'vue'
import EditorJS from '@editorjs/editorjs'
import Header from '@editorjs/header'
import List from '@editorjs/list'
import Table from '@editorjs/table'
import Checklist from '@editorjs/checklist'
import Code from '@editorjs/code'
import Quote from '@editorjs/quote'

export default defineComponent({
  name: 'App',
  setup() {
    const isSaving = ref(false)
    let editor: EditorJS | null = null

    onMounted(() => {
      initializeEditor()
    })

    const initializeEditor = async () => {
      try {
        editor = new EditorJS({
          holder: 'editor-js',
          tools: {
            header: {
              class: Header,
              inlineToolbar: true,
              config: {
                placeholder: 'Enter a header',
                levels: [2, 3, 4],
                defaultLevel: 2
              }
            },
            list: {
              class: List,
              inlineToolbar: true,
            },
            table: {
              class: Table,
              inlineToolbar: true,
            },
            checklist: {
              class: Checklist,
              inlineToolbar: true,
            },
            code: {
              class: Code,
              inlineToolbar: true,
            },
            quote: {
              class: Quote,
              inlineToolbar: true,
            },
          },
          placeholder: 'Start writing your document here...',
          autofocus: true,
          onReady: () => {
            console.log('Editor.js is ready to work!')
          },
          onChange: async () => {
            // Auto-save logic can be implemented here
            console.log('Content changed')
          },
        })
      } catch (error) {
        console.error('Failed to initialize editor:', error)
      }
    }

    const saveDocument = async () => {
      if (!editor) return
      
      isSaving.value = true
      try {
        const output = await editor.save()
        console.log('Document saved:', output)
        // TODO: Implement actual save functionality
      } catch (error) {
        console.error('Error saving document:', error)
      } finally {
        isSaving.value = false
      }
    }

    const exportDocument = async () => {
      if (!editor) return
      
      try {
        const output = await editor.save()
        // TODO: Implement export functionality (PDF, HTML, etc.)
        console.log('Exporting document:', output)
      } catch (error) {
        console.error('Error exporting document:', error)
      }
    }

    return {
      isSaving,
      saveDocument,
      exportDocument,
    }
  }
})
</script>

<style>
:root {
  --primary-color: #4f46e5;
  --secondary-color: #f9fafb;
  --border-color: #e5e7eb;
  --text-color: #111827;
  --text-muted: #6b7280;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  color: var(--text-color);
  line-height: 1.5;
  background-color: #ffffff;
  overflow: hidden;
}

.app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1.5rem;
  border-bottom: 1px solid var(--border-color);
  background-color: #ffffff;
}

.app-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--primary-color);
}

.app-actions {
  display: flex;
  gap: 0.75rem;
}

.btn {
  padding: 0.5rem 1rem;
  border: 1px solid var(--border-color);
  border-radius: 0.375rem;
  background-color: #ffffff;
  color: var(--text-color);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn:hover {
  background-color: var(--secondary-color);
}

.btn:active {
  background-color: #f3f4f6;
}

.editor-container {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
}

.editor {
  max-width: 800px;
  margin: 0 auto;
  padding: 1.5rem;
  background-color: #ffffff;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.app-footer {
  padding: 0.75rem 1.5rem;
  border-top: 1px solid var(--border-color);
  background-color: #ffffff;
  font-size: 0.75rem;
  color: var(--text-muted);
}

.status-bar {
  display: flex;
  justify-content: flex-end;
}

.status-saving {
  color: #eab308; /* yellow-500 */
}

.status-saved {
  color: #10b981; /* emerald-500 */
}

/* Editor.js overrides */
.ce-block__content,
.ce-toolbar__content {
  max-width: none;
  margin: 0;
  padding: 0;
}

.ce-toolbar {
  left: -50px;
}

.ce-toolbar__plus,
.ce-toolbar__settings-btn {
  color: var(--text-muted);
}

.ce-toolbar__plus:hover,
.ce-toolbar__settings-btn:hover {
  background-color: var(--secondary-color);
}

.codex-editor__redactor {
  padding-bottom: 100px !important;
}
</style>

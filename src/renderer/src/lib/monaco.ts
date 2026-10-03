import * as monaco from 'monaco-editor'
import { loader } from '@monaco-editor/react'
import EditorWorker from 'monaco-editor/editor/editor.worker?worker'
import TsWorker from 'monaco-editor/language/typescript/ts.worker?worker'

self.MonacoEnvironment = {
  getWorker(_id: string, label: string) {
    if (label === 'typescript' || label === 'javascript') return new TsWorker()
    return new EditorWorker()
  }
}

loader.config({ monaco })

// Themes use a transparent background so the editor sits on the app's own surface.
monaco.editor.defineTheme('lh-dark', {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: 'comment', foreground: '6b6b74', fontStyle: 'italic' },
    { token: 'keyword', foreground: 'c792ea' },
    { token: 'string', foreground: 'a5d6a7' },
    { token: 'number', foreground: 'f5b83d' },
    { token: 'type', foreground: '82aaff' }
  ],
  colors: {
    'editor.background': '#00000000',
    'editorGutter.background': '#00000000',
    'editor.lineHighlightBackground': '#ffffff08',
    'editorLineNumber.foreground': '#4a4a52',
    'editorLineNumber.activeForeground': '#a1a1aa',
    'editorIndentGuide.background1': '#ffffff0d',
    'editor.selectionBackground': '#ffffff1f',
    'editorWidget.background': '#232328',
    'editorWidget.border': '#ffffff1a',
    'editorSuggestWidget.background': '#232328',
    'editorSuggestWidget.border': '#ffffff1a',
    'scrollbarSlider.background': '#ffffff14',
    'scrollbarSlider.hoverBackground': '#ffffff22',
    'editorSuggestWidget.selectedBackground': '#ffffff14',
    'editorSuggestWidget.highlightForeground': '#f5b83d',
    'list.activeSelectionBackground': '#ffffff14',
    'list.hoverBackground': '#ffffff0a',
    'list.focusOutline': '#00000000',
    'focusBorder': '#00000000'
  }
})

monaco.editor.defineTheme('lh-light', {
  base: 'vs',
  inherit: true,
  rules: [{ token: 'comment', foreground: '9a9aa3', fontStyle: 'italic' }],
  colors: {
    'editor.background': '#00000000',
    'editorGutter.background': '#00000000',
    'editor.lineHighlightBackground': '#0000000a',
    'editorLineNumber.foreground': '#c4c4cc',
    'editorLineNumber.activeForeground': '#5f5f68',
    'editorIndentGuide.background1': '#0000000d',
    'editorWidget.background': '#ffffff',
    'scrollbarSlider.background': '#00000014',
    'editorSuggestWidget.selectedBackground': '#0000000f',
    'list.activeSelectionBackground': '#0000000f',
    'list.focusOutline': '#00000000',
    'focusBorder': '#00000000'
  }
})

export { monaco }

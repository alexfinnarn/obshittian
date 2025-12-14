// CodeMirror editor setup
import { savePane } from './ui.js';
import { renderPreview } from './marked-config.js';

// Track auto-save timers per pane
const autoSaveTimers = {
    left: null,
    right: null
};

export function createEditor(CM, container, pane, state, elements, config = {}) {
    const { EditorView, basicSetup, markdown, markdownLanguage, yaml, EditorState, oneDark } = CM;
    const autoSaveDelay = config.autoSaveDelay;

    const updateListener = EditorView.updateListener.of((update) => {
        if (update.docChanged) {
            state[pane].isDirty = true;
            elements[pane].unsaved.style.display = 'inline';
            const text = update.state.doc.toString();
            renderPreview(text, elements[pane].preview);

            // Auto-save after inactivity
            if (autoSaveDelay && autoSaveDelay > 0) {
                if (autoSaveTimers[pane]) {
                    clearTimeout(autoSaveTimers[pane]);
                }
                autoSaveTimers[pane] = setTimeout(() => {
                    if (state[pane].isDirty && state[pane].fileHandle) {
                        savePane(pane, state, elements);
                    }
                }, autoSaveDelay);
            }
        }
    });

  return new EditorView({
      state: EditorState.create({
        doc: '',
        extensions: [
          basicSetup,
          markdown({
            base: markdownLanguage,
            codeLanguages: (info) => {
              if (info === 'yaml' || info === 'yml') {
                return yaml().language;
              }
              return null;
            }
          }),
          oneDark,
          updateListener,
          EditorView.lineWrapping,
          EditorView.theme({
            '&': {
              height: '100%',
              fontSize: '14px'
            },
            '.cm-scroller': {
              overflow: 'auto',
              fontFamily: "'SF Mono', 'Consolas', 'Monaco', monospace"
            },
            '.cm-content': {
              padding: '16px'
            },
            '.cm-gutters': {
              backgroundColor: '#1e1e1e',
              borderRight: '1px solid #333'
            }
          })
        ]
      }),
      parent: container
    });
}

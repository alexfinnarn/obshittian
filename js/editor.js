// CodeMirror editor setup
import { savePane } from './ui.js';
import { renderPreview } from './marked-config.js';
import { markActiveTabDirty, getActiveTab } from './tabs.js';

// Track auto-save timers per pane
const autoSaveTimers = {
    left: null,
    right: null
};

export function createEditor(CM, container, pane, state, elements, config = {}) {
    const {
        EditorView, EditorState, basicSetup, markdown, markdownLanguage, yaml, oneDark,
        keymap, indentWithTab, scrollPastEnd, rectangularSelection, dropCursor, closeBrackets
    } = CM;
    const autoSaveDelay = config.autoSaveDelay;

    const updateListener = EditorView.updateListener.of((update) => {
        if (update.docChanged) {
            const text = update.state.doc.toString();
            renderPreview(text, elements[pane].preview);

            if (pane === 'left') {
                // Left pane uses tabs - mark active tab as dirty
                markActiveTabDirty(state, elements);

                // Auto-save after inactivity
                if (autoSaveDelay && autoSaveDelay > 0) {
                    if (autoSaveTimers[pane]) {
                        clearTimeout(autoSaveTimers[pane]);
                    }
                    autoSaveTimers[pane] = setTimeout(() => {
                        const activeTab = getActiveTab(state);
                        if (activeTab && activeTab.isDirty) {
                            savePane(pane, state, elements);
                        }
                    }, autoSaveDelay);
                }
            } else {
                // Right pane uses single-file state
                state[pane].isDirty = true;
                if (elements[pane].unsaved) {
                    elements[pane].unsaved.style.display = 'inline';
                }

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
        }
    });

  return new EditorView({
      state: EditorState.create({
        doc: '',
        extensions: [
          basicSetup,
          keymap.of([indentWithTab]),
          closeBrackets(),
          scrollPastEnd(),
          rectangularSelection(),
          dropCursor(),
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

// CodeMirror editor setup

export function createEditor(CM, container, pane, state, elements) {
    const { EditorView, basicSetup, markdown, markdownLanguage, EditorState, oneDark } = CM;

    const updateListener = EditorView.updateListener.of((update) => {
        if (update.docChanged) {
            state[pane].isDirty = true;
            elements[pane].unsaved.style.display = 'inline';
            const text = update.state.doc.toString();
            elements[pane].preview.innerHTML = marked.parse(text);
        }
    });

  return new EditorView({
      state: EditorState.create({
        doc: '',
        extensions: [
          basicSetup,
          markdown({
            base: markdownLanguage
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

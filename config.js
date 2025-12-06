// Editor Configuration
// Edit these values to customize your editor experience

window.editorConfig = {
    // Folder name for daily notes (created under root directory)
    dailyNotesFolder: 'zzz_Daily Notes',

    // Automatically reopen the last used directory on page load
    // Set to false to always start with a blank screen
    autoOpenLastDirectory: true,

    // Auto-open today's daily note when opening a directory
    autoOpenTodayNote: true,

    // Keyboard shortcuts for navigating daily notes
    // Requires modifier + arrow key to change the calendar date and open the daily note
    dailyNoteNavigation: {
        enabled: true,
        // Modifier key required with arrow keys
        // Options: 'meta' (Cmd on Mac), 'ctrl', 'alt', 'shift'
        modifier: 'meta',
        // Arrow key actions:
        // left/right = previous/next day
        // up/down = previous/next week
    },

    // Remember and restore the last opened file in the left pane
    restoreLastOpenFile: true,

    // Remember and restore pane widths after resizing
    restorePaneWidth: true
};

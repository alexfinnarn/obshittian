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
    restorePaneWidth: true,

    // Default quick links (shown when no saved links exist)
    defaultQuickLinks: [
        { name: 'NWS', url: 'https://forecast.weather.gov/MapClick.php?lat=39.9103&lon=-82.7916&unit=0&lg=english&FcstType=graphical' },
        { name: 'Weather', url: 'https://www.wunderground.com/forecast/us/oh/pickerington' },
        { name: 'Gmail', url: 'https://mail.google.com/mail/u/0/#inbox' },
        { name: 'Proton', url: 'https://mail.proton.me/u/0/inbox' },
        { name: 'Bible', url: 'https://www.companionbiblecondensed.com/' },
        { name: 'Meetup', url: 'https://www.meetup.com/find/?source=EVENTS&eventType=inPerson&sortField=DATETIME&distance=twentyFiveMiles&location=us--oh--Brice' },
        { name: 'Cringe', url: 'https://cringe.com/' },
        { name: 'Cbus', url: 'https://www.experiencecolumbus.com/events/festivals-and-annual-events/' }
    ]
};

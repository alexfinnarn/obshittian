# Roll Up Monthly Notes

Create a summary of the previous month's daily notes.

## Instructions

1. Determine the previous month based on today's date
2. Find all daily notes in `zzz_Daily Notes/YYYY/MM/` for that month
3. Read each daily note file
4. Generate a rollup summary that includes:
   - **Key themes**: Topics or subjects that appeared multiple times
   - **Notable events**: Significant items, decisions, or milestones
   - **Recurring items**: Tasks or topics that came up repeatedly
   - **Action items**: Any outstanding todos or follow-ups mentioned
5. Create the output file at `Monthly Rollups/YYYY-MM.md` with frontmatter:
   ```yaml
   ---
   tags: monthly-rollup
   month: YYYY-MM
   sync: permanent
   ---
   ```
6. If the `Monthly Rollups` folder doesn't exist, create it

## Output Format

The rollup should be concise but comprehensive. Use headers to organize:
- Overview (1-2 sentence summary of the month)
- Key Themes
- Notable Events
- Recurring Items
- Open Items / Follow-ups

Skip any sections that have no content.

## Notes

- Only include daily notes that have content beyond the default template
- Use standard markdown links when referencing specific dates: `[2024-12-05](zzz_Daily Notes/2024/12/2024-12-05.md)`
- If no daily notes exist for the previous month, report that instead of creating an empty file

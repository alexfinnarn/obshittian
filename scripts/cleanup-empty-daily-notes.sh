#!/bin/bash

# Cleanup script to delete empty daily notes (44 bytes = just template header)
# Usage: ./cleanup-empty-daily-notes.sh [directory]
# If no directory specified, uses current directory

TARGET_DIR="${1:-.}"
BYTE_SIZE=44

echo "Searching for $BYTE_SIZE-byte daily note files in: $TARGET_DIR"
echo ""

# Find all files exactly 44 bytes and store in array
files=()
while IFS= read -r -d '' file; do
    files+=("$file")
done < <(find "$TARGET_DIR" -type f -name "*.md" -size ${BYTE_SIZE}c -print0)

if [ ${#files[@]} -eq 0 ]; then
    echo "No $BYTE_SIZE-byte .md files found."
    exit 0
fi

# Count files
count=${#files[@]}
echo "Found $count file(s):"
printf '%s\n' "${files[@]}"
echo ""

# Ask for confirmation
read -p "Delete these files? (y/N): " confirm

if [[ "$confirm" =~ ^[Yy]$ ]]; then
    for file in "${files[@]}"; do
        rm -v "$file"
    done
    echo ""
    echo "Deleted $count file(s)."
else
    echo "Aborted. No files deleted."
fi

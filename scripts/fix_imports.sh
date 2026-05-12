#!/bin/bash
# IQRA Import Fixer - بسم الله
# Removes .ts extensions from imports and normalizes aliases.

DIRECTORY="/Applications/iqra/src"

echo "🔍 Starting Batch Import Fix..."

# 1. Remove .ts and .js extensions from imports
find "$DIRECTORY" -type f -name "*.ts" -o -name "*.tsx" | xargs sed -i '' -E "s/from ['\"](.+)\.(ts|js)['\"]/from '\1'/g"

# 2. Fix broken relative aliases (e.g. ../#memory -> #memory)
find "$DIRECTORY" -type f -name "*.ts" -o -name "*.tsx" | xargs sed -i '' -E "s/from ['\"]\.+\/(#.+)/from '\1/g"

# 3. Fix explicit long paths to aliases
find "$DIRECTORY" -type f -name "*.ts" | xargs sed -i '' "s|\.\./\.\./\.\./\./lib/iqra/03-memory/memory|#memory/memory|g"
find "$DIRECTORY" -type f -name "*.ts" | xargs sed -i '' "s|\.\./\./lib/iqra/01-core/brain|#core/brain|g"

# 4. Fix missing member exports in common files
# (This is better done via code edits, but we can do some simple ones)

echo "✅ Import Fix Complete."

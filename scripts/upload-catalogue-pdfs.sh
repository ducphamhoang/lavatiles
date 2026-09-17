#!/usr/bin/env bash
#
# Uploads catalogue PDFs that exceed the 25 MiB static-asset limit into R2, so the
# Worker (worker/index.js) can serve them. Object keys mirror the site paths, so
# /assets/pdf/<name>.pdf keeps working unchanged.
#
# Prerequisites:
#   npx wrangler login
#   npx wrangler r2 bucket create lavatiles-catalogue-pdfs
#
# Usage: bash scripts/upload-catalogue-pdfs.sh [bucket-name]

set -euo pipefail

BUCKET="${1:-lavatiles-catalogue-pdfs}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

count=0
while IFS= read -r -d '' file; do
  echo "→ $file"
  npx wrangler r2 object put "$BUCKET/$file" --file "$file" \
    --content-type application/pdf --remote --force
  count=$((count + 1))
done < <(find assets/pdf -type f -name '*.pdf' -size +25M -print0)

echo "Uploaded $count catalogue PDF(s) to '$BUCKET'."

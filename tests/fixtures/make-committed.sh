#!/bin/sh
# One-time (macOS) generator for the small binary fixtures that are committed to git.
# Uses only tools that ship with macOS (sips) plus LibreOffice for Office/encrypted files.
set -e
cd "$(dirname "$0")"
SRC="/System/Library/Desktop Pictures/Mac Blue.heic"
SOFFICE=/Applications/LibreOffice.app/Contents/MacOS/soffice
sips -s format jpeg -s formatOptions 85 -z 800 1200 "$SRC" --out photo.jpg >/dev/null
sips -s format heic -z 600 900 "$SRC" --out iphone.heic >/dev/null
sips -s format gif -z 120 160 photo.jpg --out anim.gif >/dev/null
sips -s format avif -z 400 600 photo.jpg --out photo.avif >/dev/null 2>&1 || echo "sips cannot write AVIF on this macOS; skipped"
sips -s format jpeg -s formatOptions 70 -z 4000 6000 "$SRC" --out large-6000x4000.jpg >/dev/null
head -c 4096 /dev/urandom > corrupted.jpg
printf 'This is plain text, not a PDF.\n' > fake.pdf
printf 'KlipKit test document\n\nThis paragraph should become editable text in Word.\nSecond line with numbers 12345.\n' > doc.txt
"$SOFFICE" --headless --convert-to docx doc.txt >/dev/null 2>&1
"$SOFFICE" --headless --convert-to pdf doc.txt >/dev/null 2>&1 && mv doc.pdf text.pdf
"$SOFFICE" --headless --convert-to 'pdf:writer_pdf_Export:{"EncryptFile":{"type":"boolean","value":"true"},"DocumentOpenPassword":{"type":"string","value":"secret"}}' doc.txt >/dev/null 2>&1 && mv doc.pdf protected.pdf
rm -f doc.txt
ls -la

# style(hallmark F6): the privacy card's lock ring covered its label

## What and why
In the 3-column "Private by design" bento card the 104 px lock ring sat at the top-right (`top: 20px`) and covered the end of the "PRIVATE BY DESIGN" label at desktop widths. Same in the reference; fixed as an approved audit item.

## How
`.lockw` moves to `top: 56px`: below the label, level with the big "0".

## Evidence
- New e2e F6 at 1440 / 1100 / 390 px (ring and label rectangles don't intersect): failed at 1440, passes at all three.
- Before/after (local): `reports/ui/prs/f6-lock-ring.png`.

## Also
"bento cards don't grow when they scroll into view" now waits for `document.fonts.ready` before the first measurement: under heavy machine load (load average ~49) a late font swap changed the height and failed it once; 3/3 passes alone.

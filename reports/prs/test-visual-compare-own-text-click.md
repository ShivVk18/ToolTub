# test(visual): find tabs by their own text so "Yearly" actually gets clicked

## What and why
`clickText` matched only childless elements. The billing tab is `Yearly <b>save 30%</b>`, so nothing matched and neither page switched to yearly pricing (state o compared monthly with monthly).

## How
Match an element whose own text nodes contain the label, then click the nearest button/tab.

## Evidence
State o at 1920 light: both reference and app now show ₹2,499 per year.

## Checklist
- [x] One concern only (harness)

# test: close the §4 expected-value gaps (SQL indent, TypeScript compiles) and add a 1600×1200 photo fixture

Checked every row of §4 in `02_TOOLS_E2E_TEST_PROMPT.md` against the tests:
- **SQL Formatter.** The test never checked that `AND` is indented; it now asserts a newline plus indentation before `AND`.
- **JSON to TS.** The output was never compiled. The test now runs the TypeScript compiler on it (strict, no emit, with a value of type `Root`) and expects no errors.
- **Fixture.** `photo-1600x1200.png` (about 6 MB, photo-like) is added to the generated fixtures for the real image-compress and resize expected values. Those e2e tests come with their fixes (#68, #69); both found bugs.

Both new assertions pass on the current code; they lock the expected values in.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

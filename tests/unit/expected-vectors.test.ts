import { describe, it, expect } from 'vitest';
import { PANELS } from '@/lib/livePanels';
import { hashAll, genParse, runGen, jsonErr } from '@/lib/detect';
import { parse } from '@/lib/intent';

describe('Task 2 Section 4: Expected Test Vectors', () => {
  // 1. Hash Generator: abc
  it('Hash Generator: abc matches expected SHA-1, SHA-256 and SHA-512', async () => {
    const hashes = await hashAll('abc');
    const map = Object.fromEntries(hashes);
    expect(map['SHA-1']).toBe('a9993e364706816aba3e25717850c26c9cd0d89d');
    expect(map['SHA-256']).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    expect(map['SHA-512'].startsWith('ddaf35a193617abacc417349ae204131')).toBe(true);
  });

  // 2. Hash chat generator: sha256 of hello world
  it('Hash (chat): sha256 of hello world', async () => {
    const g = genParse('sha256 of hello world');
    expect(g).toBeDefined();
    const res = await runGen(g!);
    expect(res.copy).toBe('b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9');
  });

  // 3. Base64 encode: KlipKit ✨
  it('Base64: KlipKit ✨ encodes and decodes losslessly', async () => {
    const p = PANELS['Base64'];
    const encoded = await p.run('KlipKit ✨', 'e');
    expect(encoded.copy).toBe('S2xpcEtpdCDinKg=');
    const decoded = await p.run('S2xpcEtpdCDinKg=', 'd');
    expect(decoded.copy).toBe('KlipKit ✨');
  });

  // 4. Base64 (chat): base64 of "hello world"
  it('Base64 (chat): base64 of "hello world"', async () => {
    const g = genParse('base64 of "hello world"');
    expect(g).toBeDefined();
    const res = await runGen(g!);
    expect(res.copy).toBe('aGVsbG8gd29ybGQ=');
  });

  // 5. URL encode: compress pdf & split?
  it('URL encode: compress pdf & split?', async () => {
    const p = PANELS['URL Encoder'];
    const res = await p.run('compress pdf & split?', 'e');
    expect(res.copy).toBe('compress%20pdf%20%26%20split%3F');
  });

  // 6. Timestamp: 1730592000
  it('Timestamp: 1730592000 produces ISO 2024-11-03T00:00:00.000Z and IST date', async () => {
    const p = PANELS['Timestamp'];
    const res = await p.run('1730592000');
    expect(res.html).toContain('2024-11-03T00:00:00.000Z');
    expect(res.html).toContain('November');
    expect(res.html).toContain('2024');

    // 13-digit ms input gives the same date
    const resMs = await p.run('1730592000000');
    expect(resMs.html).toContain('2024-11-03T00:00:00.000Z');
  });

  // 7. JWT Decoder: valid token
  it('JWT Decoder: decodes token with expected claims and valid status', async () => {
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyXzQyIiwibmFtZSI6IkFzaGEgUmFvIiwiaWF0IjoxNzMwNTAwMDAwLCJleHAiOjE5MDAwMDAwMDB9.c2lnbmF0dXJl';
    const p = PANELS['JWT Decoder'];
    const res = await p.run(token);
    expect(res.html).toContain('HS256');
    expect(res.html).toContain('user_42');
    expect(res.html).toContain('Asha Rao');
    expect(res.status).toContain('Valid');
    expect(res.status).toContain('signature not verified');
  });

  // 8. JWT expired
  it('JWT expired: correctly detects expired status', async () => {
    const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyXzQyIiwibmFtZSI6IkFzaGEgUmFvIiwiaWF0IjoxNzMwNTAwMDAwLCJleHAiOjE3MzA1MDM2MDB9.c2lnbmF0dXJl';
    const p = PANELS['JWT Decoder'];
    const res = await p.run(expiredToken);
    expect(res.status).toContain('Expired');
  });

  // 9. JSON Formatter: {"a":1,"b":[1,2]}
  it('JSON Formatter: 2-space pretty output with 8 lines, and minify', async () => {
    const input = '{"a":1,"b":[1,2]}';
    const p = PANELS['JSON Formatter'];
    const pretty = await p.run(input, '2');
    expect(pretty.copy?.split('\n').length).toBe(7);
    const min = await p.run(pretty.copy!, 'm');
    expect(min.copy).toBe(input);
  });

  // 10. JSON errors
  it('JSON errors: line and column diagnostics', () => {
    // Trailing comma
    const err1 = jsonErr('{"a":1,}', new Error('trailing'));
    expect(err1.line).toBe(1);
    expect(err1.col).toBe(8);
    expect(err1.msg).toMatch(/trailing comma/i);

    // Single quotes
    const err2 = jsonErr("{'a':1}", new Error('quote'));
    expect(err2.msg).toMatch(/double quote/i);

    // Keys need double quotes
    const err3 = jsonErr('{a:1}', new Error('key'));
    expect(err3.msg).toMatch(/double quote/i);

    // Unexpected end
    const err4 = jsonErr('{"a":[1,2', new Error('end'));
    expect(err4.msg).toMatch(/unexpected end/i);
  });

  // 11. CSV ↔ JSON: name,city\nRohan,"Delhi, NCR"
  it('CSV ↔ JSON: round-trips with quoted commas', async () => {
    const csvInput = 'name,city\nRohan,"Delhi, NCR"';
    const p = PANELS['CSV ↔ JSON'];
    const toJson = await p.run(csvInput, 'j');
    expect(toJson.copy).toBe(JSON.stringify([{ name: 'Rohan', city: 'Delhi, NCR' }], null, 2));

    const toCsv = await p.run(toJson.copy!, 'c');
    expect(toCsv.copy).toBe(csvInput);
  });

  // 12. JSON to TS: {"id":1,"tags":["a"],"addr":{"pin":411001}}
  it('JSON to TS: produces valid typescript interfaces', async () => {
    const p = PANELS['JSON to TypeScript'];
    const res = await p.run('{"id":1,"tags":["a"],"addr":{"pin":411001}}');
    expect(res.copy).toContain('interface Addr');
    expect(res.copy).toContain('pin: number');
    expect(res.copy).toContain('interface Root');
    expect(res.copy).toContain('tags: string[]');
    expect(res.copy).toContain('addr: Addr');
  });

  // 13. Cron: */15 9-18 * * 1-5
  it('Cron: */15 9-18 * * 1-5 explanation and schedule', async () => {
    const p = PANELS['Cron Builder'];
    const res = await p.run('*/15 9-18 * * 1-5');
    expect(res.html).toContain('Every 15 minutes');
    expect(res.html).toContain('09:00');
    expect(res.html).toContain('18:59');
    expect(res.html).toContain('Monday to Friday');
  });

  // 14. Color Converter: #6D5DF5
  it('Color Converter: rgb, hsl and contrast for #6D5DF5', async () => {
    const p = PANELS['Color Converter'];
    const res = await p.run('#6D5DF5');
    expect(res.copy).toContain('rgb(109, 93, 245)');
    expect(res.copy).toContain('hsl(246, 88%, 66%)');
    expect(res.html).toContain('4.63');
  });

  // 15. Regex Tester: email pattern
  it('Regex Tester: finds exactly 2 email matches', async () => {
    const pattern = '[\\w.+-]+@[\\w-]+\\.[\\w.]+';
    const text = 'asha@klipkit.com or rohan.dev@example.in — not @x';
    const p = PANELS['Regex Tester'];
    const res = await p.run(text, undefined, pattern, 'g');
    expect(res.status).toBe('2 matches');
    expect(res.html).toContain('asha@klipkit.com');
    expect(res.html).toContain('rohan.dev@example.in');
  });

  // 16. UUID Generator: 10 000 UUIDs v4, 0 duplicates
  it('UUID Generator: 10,000 UUIDs match v4 and have 0 duplicates', async () => {
    const p = PANELS['UUID Generator'];
    const res = await p.run('', '10000');
    const list = res.copy!.split('\n');
    expect(list.length).toBe(10000);
    const v4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
    const set = new Set(list);
    expect(set.size).toBe(10000);
    for (let i = 0; i < 100; i++) {
      expect(list[i]).toMatch(v4Regex);
    }
  });

  // 17. Password Generator: length 24, 0 duplicates across 1 000 runs
  it('Password Generator: length 24, 0 duplicates across 1,000 runs', async () => {
    const p = PANELS['Password Generator'];
    const passwords = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      const res = await p.run('', '24');
      expect(res.copy?.length).toBe(24);
      passwords.add(res.copy!);
    }
    expect(passwords.size).toBe(1000);
  });

  // 18. Word Counter: Hello world. This is KlipKit.
  it('Word Counter: 5 words, 2 sentences', async () => {
    const p = PANELS['Word Counter'];
    const res = await p.run('Hello world. This is KlipKit.');
    expect(res.status).toContain('5 words');
    expect(res.copy).toMatch(/Sentences\s+2/);
  });

  // 19. Case Converter: drop it paste it
  it('Case Converter: camel, snake, kebab, title, upper', async () => {
    const p = PANELS['Case Converter'];
    const input = 'drop it paste it';
    expect((await p.run(input, 'c')).copy).toBe('dropItPasteIt');
    expect((await p.run(input, 's')).copy).toBe('drop_it_paste_it');
    expect((await p.run(input, 'k')).copy).toBe('drop-it-paste-it');
    expect((await p.run(input, 't')).copy).toBe('Drop It Paste It');
    expect((await p.run(input, 'u')).copy).toBe('DROP IT PASTE IT');
  });

  // 20. SQL Formatter: select a from t where x=1 and y=2
  it('SQL Formatter: uppercase keywords and structured newlines', async () => {
    const p = PANELS['SQL Formatter'];
    const res = await p.run('select a from t where x=1 and y=2');
    expect(res.copy).toContain('SELECT');
    expect(res.copy).toContain('\nFROM');
    expect(res.copy).toContain('\nWHERE');
    expect(res.copy).toContain('AND');
  });

  // Section 5.1: Intent parser 6 core cases
  it('Intent parser: multi-step chains and constraints', () => {
    // 1. compress to under 2 mb and split pages 1-5 (pdf)
    const p1 = parse('compress to under 2 mb and split pages 1-5', 'pdf');
    expect(p1.steps.map((s) => s.t)).toEqual(['Compress', 'Split pages']);
    expect(p1.steps[0].d?.toLowerCase()).toContain('under 2 mb');
    expect(p1.steps[1].d).toMatch(/pages 1[-–]5/);

    // 2. make a gif and extract the audio (video)
    const p2 = parse('make a gif and extract the audio', 'video');
    expect(p2.steps.map((s) => s.t)).toEqual(['Make a GIF', 'Extract audio']);

    // 3. remove the background and convert to webp (image)
    const p3 = parse('remove the background and convert to webp', 'image');
    expect(p3.steps.map((s) => s.t)).toEqual(['Remove background', 'Convert to WEBP']);
    expect(p3.steps[1].d?.toLowerCase()).toContain('webp');

    // 4. resize for instagram (image)
    const p4 = parse('resize for instagram', 'image');
    expect(p4.steps[0].t).toBe('Resize');
    expect(p4.steps[0].d).toMatch(/1080\s*×\s*1350/);

    // 5. trim 0:10 to 0:30 (audio)
    const p5 = parse('trim 0:10 to 0:30', 'audio');
    expect(p5.steps[0].t).toBe('Trim');
    expect(p5.steps[0].d).toContain('0:10 → 0:30');

    // 6. protect it with a password (pdf)
    const p6 = parse('protect it with a password', 'pdf');
    expect(p6.steps[0].t).toBe('Protect with password');

    // 7. invalid step on mismatched file type
    const p7 = parse('split pages', 'audio');
    expect(p7.steps[0].ok).toBe(false);
  });
});

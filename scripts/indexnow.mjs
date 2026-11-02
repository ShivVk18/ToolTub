// IndexNow ping (Bing, Yandex, Seznam…; Bing feeds Copilot). Run from YOUR server after each deploy:
//   INDEXNOW_KEY=xxxx node scripts/indexnow.mjs https://klipkit.com/compress-pdf https://klipkit.com/json-formatter
// The key file must be served at https://klipkit.com/<key>.txt containing the key (put it in /public).
const key = process.env.INDEXNOW_KEY;
const host = process.env.SITE_HOST ?? "klipkit.com";
const urls = process.argv.slice(2);
if (!key || !urls.length) {
  console.error("Usage: INDEXNOW_KEY=… node scripts/indexnow.mjs <url> [url…]");
  process.exit(1);
}
const res = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify({ host, key, keyLocation: `https://${host}/${key}.txt`, urlList: urls }),
});
console.log(`IndexNow: ${res.status} for ${urls.length} URL(s)`);

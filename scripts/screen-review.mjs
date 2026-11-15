import { copyFile, mkdir, writeFile } from "node:fs/promises";
const directory = "design/references/screen-review";
const screens = [
  ["home", "Overview"],
  ["activity", "The ledger"],
  ["unlabelled", "Unlabelled"],
  ["household", "Our home"],
  ["insights", "Patterns"],
  ["settings-appearance", "Appearance"],
  ["settings-personal", "Personal settings"],
  ["settings-backups", "Backups"],
  ["settings-account", "Account"],
  ["family-choices", "Connect your family", true],
  ["family-create", "Create a family", true],
  ["family-join", "Join a family", true],
  ["record-details", "Record details"],
  ["record-amount", "Amount entry", true, "record"],
  ["account-edit", "Account details", true, "account-edit"],
];
await mkdir(directory, { recursive: true });
const cards = [];
for (const theme of ["light", "dark"]) {
  for (const [slug, title, compact, source] of screens) {
    const name = `${slug}-${theme}.png`;
    await copyFile(
      `test-results/${source || "views-" + slug}-${theme}${compact ? "-320" : ""}.png`,
      `${directory}/${name}`,
    );
    cards.push(
      `<article data-mode="${theme}"><div class="caption"><h2>${title}</h2><span>${compact ? "320" : "390"} px</span></div><a href="${name}" target="_blank" rel="noopener" aria-label="Open ${title}, ${theme} theme"><img src="${name}" alt="County ${title} in ${theme} mode" loading="lazy"></a><a class="open" href="${name}" target="_blank" rel="noopener">Open full screen ↗</a></article>`,
    );
  }
}
await writeFile(
  `${directory}/index.html`,
  `<!doctype html><html lang="en" data-theme="light"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>County · Screen review</title><style>
*{box-sizing:border-box}html{--bg:#f5f5f5;--surface:#fff;--ink:#222426;--muted:#626562;--line:#ddded8;background:var(--bg);color:var(--ink);font-family:Inter,"Segoe UI",sans-serif}html[data-theme=dark]{--bg:#131416;--surface:#1e2023;--ink:#f5f5f5;--muted:#b9bcb8;--line:#3d4044}body{margin:0;padding:36px;max-width:1800px;margin-inline:auto}header{display:flex;align-items:center;justify-content:space-between;gap:24px;flex-wrap:wrap;margin-bottom:36px}h1{font-size:38px;letter-spacing:-.06em;margin:0}h1 span{color:#e65416}header p{font-size:15px;line-height:1.7;color:var(--muted);margin:12px 0 0}.switch{display:flex;gap:4px;padding:5px;border:1px solid var(--line);border-radius:99px}button{font-family:inherit;font-size:15px;font-weight:550;line-height:1.5;min-height:44px;padding:10px 22px;border:0;border-radius:99px;background:transparent;color:var(--ink);cursor:pointer}button[aria-pressed=true]{background:var(--ink);color:var(--surface)}main{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px}article{min-width:0;background:var(--surface);padding:18px;border:1px solid var(--line);border-radius:22px}.caption{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:18px}h2{font-size:18px;font-weight:550;letter-spacing:-.035em;margin:0}.caption>span{font-size:13px;color:var(--muted);white-space:nowrap}article img{display:block;width:100%;height:530px;object-fit:cover;object-position:top;border-radius:14px;border:1px solid var(--line)}.open{display:inline-block;font-size:14px;color:var(--ink);margin-top:18px;text-decoration:none;padding:8px 0}html[data-theme=light] [data-mode=dark],html[data-theme=dark] [data-mode=light]{display:none}@media(min-width:1500px){main{grid-template-columns:repeat(4,minmax(0,1fr))}}@media(max-width:1000px){main{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:650px){body{padding:22px}main{grid-template-columns:minmax(0,1fr)}h1{font-size:32px}}
</style></head><body><header><div><h1>county<span>.</span> Screen review</h1><p>Every main view, settings section and family setup flow.<br>Actual application screenshots with demonstration records.</p></div><div class="switch" role="group" aria-label="Theme"><button aria-pressed="true" data-theme="light">Light</button><button aria-pressed="false" data-theme="dark">Dark</button></div></header><main>${cards.join("")}</main><script>document.querySelectorAll('button[data-theme]').forEach(button=>button.addEventListener('click',()=>{document.documentElement.dataset.theme=button.dataset.theme;document.querySelectorAll('button[data-theme]').forEach(item=>item.setAttribute('aria-pressed',String(item===button)))}));</script></body></html>`,
);
console.log(`Saved ${cards.length} screenshots and ${directory}/index.html`);

/**
 * Fake pages and fake inputs, so each module can be developed on its own.
 *
 * Nobody has to wait for anyone else. Building the clutter remover does not need
 * the popup to exist, and building the popup does not need a real web page. Load
 * a fixture, call your module, compare with the expected output in DEV-GUIDE.md.
 */

/* ------------------------------------------------------------------ *
 * Fake pages
 * ------------------------------------------------------------------ */

/** An ordinary article. The normal case. */
export const ARTICLE_PAGE = `
<main id="content">
  <h1>Sleep and attention</h1>
  <nav><p>Home / Health / Sleep. This navigation text is long enough to qualify.</p></nav>
  <p id="lead">Researchers found that people who slept less than six hours performed
     worse on attention tasks<sup class="ref">[1]</sup> than people who slept eight.</p>
  <p id="body">The effect was strongest in the afternoon, and it did not disappear
     after a short nap. Prices for sleep clinics rose by 3% last quarter.</p>
  <p id="short">Short.</p>
  <aside><p>Sidebar promotion that is long enough to otherwise count as a block.</p></aside>
  <div class="ad-slot"><p>Advertisement text that is long enough to count as a block.</p></div>
  <ul><li>Sleep restriction reduced sustained attention in every measured group.</li></ul>
</main>`;

/**
 * Deliberately tricky class names. Half are advertisements and half are ordinary
 * content whose names merely contain the letters "ad". Nothing in the second
 * half may ever be hidden.
 */
export const ADS_PAGE = `
<main id="content">
  <h1>Testing the advertisement filter</h1>
  <p>The article body below is here so the extraction step has something to keep.</p>
  <p>A second paragraph, long enough to be treated as part of the article proper.</p>

  <div class="ad-slot"><span>Should be hidden: ad-slot</span></div>
  <div class="box banner-ad"><span>Should be hidden: banner-ad</span></div>
  <div class="advertisement"><span>Should be hidden: advertisement</span></div>
  <div class="sidebar-ad-unit"><span>Should be hidden: sidebar-ad-unit</span></div>
  <ins class="adsbygoogle"><span>Should be hidden: adsbygoogle</span></ins>
  <div data-ad="banner"><span>Should be hidden: data-ad</span></div>
  <div class="sponsored-block"><span>Should be hidden: sponsored-block</span></div>

  <div class="add-comment"><span>Must survive: add-comment</span></div>
  <div class="admin-bar"><span>Must survive: admin-bar</span></div>
  <div class="header-address"><span>Must survive: header-address</span></div>
  <div class="shadow-panel"><span>Must survive: shadow-panel</span></div>
  <div class="download-links"><span>Must survive: download-links</span></div>
  <div class="read-ahead"><span>Must survive: read-ahead</span></div>
  <div class="ad-form"><form><input type="text" /><span>Must survive: holds a control</span></form></div>
</main>`;

/** A sign-in page. Must never be adapted. */
export const LOGIN_PAGE = `
<main id="content">
  <h1>Sign in</h1>
  <p>Enter your details below to continue to your account dashboard today.</p>
  <form><input type="password" name="pw" /></form>
</main>`;

/** Almost no text. Adapting it would do nothing useful. */
export const THIN_PAGE = `
<main id="content">
  <p>Loading, please wait a moment while the page finishes assembling itself.</p>
</main>`;

/** The page sets its own inline styles. Reset must give these back untouched. */
export const STYLED_PAGE = `
<main id="content">
  <p id="a" style="font-size:22px">A paragraph the page itself made larger than normal.</p>
  <p id="b" style="color:rgb(180,20,20)">A paragraph the page itself coloured red here.</p>
  <p id="c" style="line-height:1.15">A paragraph the page itself set a tight line height on.</p>
</main>`;

/* ------------------------------------------------------------------ *
 * Fake inputs for modules that do not need a page
 * ------------------------------------------------------------------ */

export const ELIGIBILITY_INPUTS = [
  { name: 'ordinary article', input: { url: 'https://example.com/health/sleep', blockCount: 42, hasPasswordField: false } },
  { name: 'login path', input: { url: 'https://example.com/login', blockCount: 42, hasPasswordField: false } },
  { name: 'checkout path', input: { url: 'https://shop.example.com/checkout?step=2', blockCount: 42, hasPasswordField: false } },
  { name: 'password field present', input: { url: 'https://example.com/article', blockCount: 42, hasPasswordField: true } },
  { name: 'browser page', input: { url: 'chrome://settings', blockCount: 42, hasPasswordField: false } },
  { name: 'not a url', input: { url: 'not a url at all', blockCount: 42, hasPasswordField: false } },
  { name: 'too little text', input: { url: 'https://example.com/', blockCount: 2, hasPasswordField: false } },
];

/** Raw selection strings, as the browser reports them. */
export const SELECTION_SAMPLES = [
  { name: 'citation marker', raw: 'attention tasks[1] than people who slept eight.' },
  { name: 'two markers', raw: 'One claim[1] and another claim[12] in the same sentence.' },
  { name: 'ragged whitespace', raw: '  The effect   was\n strongest in the   afternoon.  ' },
  { name: 'too short', raw: 'Sleep.' },
  { name: 'nothing selected', raw: '' },
];

/** Option objects a preset might pass to an adaptation. */
export const ADAPTATION_OPTIONS = {
  fontSize: [
    { name: 'preset value', options: { scale: 1.25 } },
    { name: 'above the ceiling', options: { scale: 9 } },
    { name: 'below the floor', options: { scale: 0.1 } },
  ],
  lineSpacing: [
    { name: 'preset value', options: { lineHeight: 1.8, letterSpacingPx: 0.5 } },
    { name: 'above the ceiling', options: { lineHeight: 5, letterSpacingPx: 99 } },
  ],
  contrast: [
    { name: 'soft scheme', options: { preset: 'cream' } },
    { name: 'maximum', options: { preset: 'high' } },
    { name: 'dark', options: { preset: 'dark' } },
    { name: 'typo in a preset', options: { preset: 'creme' } },
  ],
};

/** Replies the background worker can send, for building the panel without a model. */
export const REWRITE_RESPONSES = {
  notConnected: { ok: false, text: null, blocked: false, reason: 'No rewriter is connected yet.', source: 'none' },
  success: { ok: true, text: 'People who slept under six hours did worse at paying attention.', blocked: false, source: 'on-device' },
  blocked: { ok: true, text: null, blocked: true, reason: 'The simpler version changed a number, so it was not shown.', source: 'on-device' },
  failed: { ok: false, text: null, blocked: false, reason: 'The model could not be loaded on this device.', source: 'none' },
};

/* ------------------------------------------------------------------ *
 * Helper
 * ------------------------------------------------------------------ */

/**
 * Puts a fake page into a real iframe and hands back its document, so extraction
 * and the adaptations run against real layout instead of a parsed string.
 * Call cleanup() when done.
 */
export function mountFixture(html: string): { document: Document; cleanup(): void } {
  const frame = document.createElement('iframe');
  frame.style.cssText = 'position:fixed;top:0;left:0;width:640px;height:400px;border:0;opacity:0.01;pointer-events:none';
  document.body.appendChild(frame);

  const doc = frame.contentDocument!;
  doc.open();
  doc.write(`<!doctype html><html><body style="font:16px/1.5 sans-serif;background:#fff;color:#202122">${html}</body></html>`);
  doc.close();

  return { document: doc, cleanup: () => frame.remove() };
}

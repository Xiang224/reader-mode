import { defineConfig } from 'wxt';

// https://wxt.dev/api/config.html
export default defineConfig({
  manifest: {
    name: 'Reader Mode',
    description: 'Adapts a web page to suit how you read, and puts it back in one click.',
    version: '0.1.0',

    // The popup only calls tabs.query({ active: true, currentWindow: true }) and
    // tabs.sendMessage, neither of which needs the "tabs" permission unless we
    // read a tab's url or title, and we do not.
    //
    // The broad grant in this extension is not in this list at all: it is the
    // content script's matches pattern in entrypoints/content.ts, which asks for
    // every http and https page. Narrowing that is a real decision to make
    // before anyone installs this outside the team.
    // The only listed permission is storage. It keeps the reader's chosen switches and values in this browser
    // profile only. It is not browser sync and does not send settings anywhere.
    permissions: ['storage'],
  },
});

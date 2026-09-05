// WXT 提供的 browser 对象。这里用它接收 Popup 发来的 message。
import { browser } from 'wxt/browser';

// ContentCommand 是 Popup 可以发来的三种指令：status、set-feature、reset-all。
// ContentResponse 是只有 status 指令才会收到的回复格式。
import type { ContentCommand, ContentResponse } from '../lib/messages';

// ReaderRuntime 是“这一张网页目前的 Reader Mode 状态”。
// Content 不自己实现字号、广告等功能，而是把工作交给它。
import { createReaderRuntime, type ReaderRuntime } from '../lib/readerRuntime';

/**
 * content.ts 是插件在“网页内部”的入口。
 *
 * 用户每打开一个普通网页，浏览器都会为该网页运行一次这里的 main()。
 * 它可以读写网页 DOM，所以真正改变字体、行距、广告显示状态的代码，最终都
 * 在这个环境里执行。
 *
 * 但 content.ts 本身只负责两件事：
 * 1. 建立并保存这一页自己的 ReaderRuntime；
 * 2. 接收 Popup 的命令，然后转交给 ReaderRuntime。
 *
 * 因此这里不会出现“怎么放大字号”之类的具体代码。这样以后新增功能时，通常
 * 不必碰 content.ts，功能可以在 lib/adaptations/ 里独立完成。
 */

declare global {
  interface Window {
    // 开发时方便在网页的 DevTools Console 输入 window.__readerMode 查看或
    // 手动调用 runtime。普通用户不会看到或用到它。
    __readerMode?: ReaderRuntime;
  }
}

export default defineContentScript({
  // 这表示 Content Script 会注入所有一般 http / https 网页。
  // 浏览器自己的内部页、扩展页等不会匹配，所以也不会运行这里。
  matches: ['*://*/*'],

  main() {
    // 每个标签页都有独立的 runtime。例如同时打开两个网站，就有两份互不
    // 影响的 context、已启用预设和已保存 style。
    const runtime = createReaderRuntime();

    // 开发辅助：把 runtime 暂时挂到网页 window 上，便于 Console 检查。
    window.__readerMode = runtime;

    // 这里不是不断检查 Popup 有没有动作，而是“注册一个回调”。
    // 浏览器只有在 Popup 真正 sendMessage 时，才会调用下面的函数。
    browser.runtime.onMessage.addListener((message: ContentCommand): Promise<ContentResponse> | void => {
      // message.type 决定这一次命令的目的。三种命令都来自 Popup。
      switch (message.type) {
        case 'reader:status':
          // Popup 刚打开时不知道网页之前是否已经被修改，所以 status 是唯一
          // 需要回传资料的命令。
          return runtime.status().then((snapshot) => ({ ok: true as const, ...snapshot })).catch((error: unknown) => ({
            ok: false as const,
            error: error instanceof Error ? error.message : 'Reader Mode status check failed.',
          }));

        case 'reader:set-feature':
          // Popup 只说“这一个功能目前要开还是关、参数是什么”。Runtime 先让
          // 这个功能 undo 自己，再在需要时 do 自己，并放进 FIFO 队列。
          // 此处不回传每个功能的结果。
          void runtime.setFeature(message.feature).catch(logCommandError);
          return;

        case 'reader:reset-all':
          // 全局 Reset 也进入同一条队列，排在已经到达的 do 任务之后。
          void runtime.resetAll().catch(logCommandError);
          return;

        default:
          // TypeScript 已经知道正常情况下只有上面三种命令；这里是额外保险。
          return;
      }
    });

    function logCommandError(error: unknown): void {
      // set-feature 不回传到 Popup，因此错误仅在开发时输出到 Console。
      // 这不会让网页崩掉，也不会阻止之后再尝试其他预设。
      console.warn(
        'Reader Mode command failed.',
        error instanceof Error ? error.message : String(error),
      );
    }
  },
});

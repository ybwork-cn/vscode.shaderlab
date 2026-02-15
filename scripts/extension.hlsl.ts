import * as vscode from 'vscode';
import { registerDocumentLinkProvider } from './shared.DocumentLinkProvider.js';
import { registerDocumentFormattingEditProvider } from './shared.FormattingEditProvider.js';
import { registerSymbolCache } from './shared.SymbolCache.js';

const activate = (context: vscode.ExtensionContext) => {
    // // 符号提供
    // registerDocumentSymbolProvider(context);
    // #include 跳转
    registerDocumentLinkProvider('hlsl', context);
    // 格式化
    registerDocumentFormattingEditProvider('hlsl', context);
    // // 定义跳转
    // registerDefinitionProvider(context);
    // // 自动完成
    // registerCompletionItemProvider(context);
    // // 悬停提示
    // registerHoverProvider(context);
    // // 工作区符号搜索
    // registerWorkspaceSymbolProvider(context);
    // 符号缓存
    registerSymbolCache(context);

    console.log('HLSL language support activated');
};

export { activate };

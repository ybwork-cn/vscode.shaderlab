import * as vscode from 'vscode';
import { registerDocumentSymbolProvider } from './hlsl.DocumentSymbolProvider.js';
import { registerDocumentLinkProvider } from './hlsl.DocumentLinkProvider.js';
import { registerDocumentFormattingEditProvider } from './hlsl.FormattingEditProvider.js';
import { registerDefinitionProvider } from './hlsl.DefinitionProvider.js';
import { registerCompletionItemProvider } from './hlsl.CompletionItemProvider.js';
import { registerHoverProvider } from './hlsl.HoverProvider.js';
import { registerWorkspaceSymbolProvider } from './shared.WorkspaceSymbolProvider.js';
import { registerSymbolCache } from './shared.SymbolCache.js';

const activate = (context: vscode.ExtensionContext) => {
    // // 符号提供
    // registerDocumentSymbolProvider(context);
    // // #include 跳转
    // registerDocumentLinkProvider(context);
    // 格式化
    registerDocumentFormattingEditProvider(context);
    // // 定义跳转
    // registerDefinitionProvider(context);
    // // 自动完成
    // registerCompletionItemProvider(context);
    // // 悬停提示
    // registerHoverProvider(context);
    // // 工作区符号搜索
    // registerWorkspaceSymbolProvider(context);
    // // 符号缓存
    // registerSymbolCache(context);                      

    console.log('HLSL language support activated');
}

export { activate };

import * as vscode from 'vscode';
import { documentSymbolProvider } from './hlsl.DocumentSymbolProvider.js';
import { hlslDocumentLinkProvider } from './hlsl.DocumentLinkProvider.js';
import { documentFormattingEditProvider } from './hlsl.FormattingEditProvider.js';
import { hlslDefinitionProvider } from './hlsl.DefinitionProvider.js';
import { hlslCompletionItemProvider } from './hlsl.CompletionItemProvider.js';
import { hlslHoverProvider } from './hlsl.HoverProvider.js';
import { workspaceSymbolProvider } from './shared.WorkspaceSymbolProvider.js';
import { symbolCache } from './shared.SymbolCache.js';

const activate = (context: vscode.ExtensionContext) => {
    // 注册清理逻辑
    // context.subscriptions.push(documentSymbolProvider);
    // context.subscriptions.push(hlslDocumentLinkProvider);      // #include 跳转
    context.subscriptions.push(documentFormattingEditProvider);// 格式化
    // context.subscriptions.push(hlslDefinitionProvider);        // 定义跳转
    // context.subscriptions.push(hlslCompletionItemProvider);    // 自动完成
    // context.subscriptions.push(hlslHoverProvider);             // 悬停提示
    // context.subscriptions.push(workspaceSymbolProvider);       // 工作区符号搜索
    // context.subscriptions.push(symbolCache);

    console.log('HLSL language support activated');
}

export { activate };


import * as vscode from 'vscode';
import { provideDocumentSymbols } from './hlsl.DocumentSymbolProvider';
import { hlslDocumentLinkProvider } from './hlsl.DocumentLinkProvider';
import { hlslFormattingEditProvider } from './hlsl.FormattingEditProvider';
import { hlslDefinitionProvider } from './hlsl.DefinitionProvider';
import { hlslCompletionItemProvider } from './hlsl.CompletionItemProvider';
import { hlslHoverProvider } from './hlsl.HoverProvider';
import { HlslSignatureHelpProvider } from './hlsl.SignatureHelpProvider';
import { workspaceSymbolProvider } from './shared.WorkspaceSymbolProvider';
import { symbolCache } from './shared.SymbolCache';

function activate(context: vscode.ExtensionContext) {
    // 注册文档符号提供程序
    const documentSymbolProvider = vscode.languages.registerDocumentSymbolProvider('hlsl',
        { provideDocumentSymbols }
    );

    // 注册签名帮助提供程序
    const signatureHelpProvider = vscode.languages.registerSignatureHelpProvider('hlsl',
        new HlslSignatureHelpProvider(),
        '(', ','
    );

    // 注册所有 HLSL Provider
    context.subscriptions.push(documentSymbolProvider);
    context.subscriptions.push(signatureHelpProvider);
    context.subscriptions.push(hlslDocumentLinkProvider);      // #include 跳转
    context.subscriptions.push(hlslFormattingEditProvider);    // 格式化
    context.subscriptions.push(hlslDefinitionProvider);        // 定义跳转
    context.subscriptions.push(hlslCompletionItemProvider);    // 自动完成
    context.subscriptions.push(hlslHoverProvider);             // 悬停提示
    context.subscriptions.push(workspaceSymbolProvider);       // 工作区符号搜索

    // 注册符号缓存的清理
    context.subscriptions.push({
        dispose: () => symbolCache.dispose()
    });

    console.log('HLSL language support activated');
}

export { activate };

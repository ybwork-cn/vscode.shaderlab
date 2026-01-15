import * as vscode from 'vscode';
import { documentSymbolProvider } from './hlsl.DocumentSymbolProvider.js';

const activate = (context: vscode.ExtensionContext) => {
    // 注册清理逻辑
    context.subscriptions.push(documentSymbolProvider);
    console.log('HLSL language support activated');
}

export { activate };

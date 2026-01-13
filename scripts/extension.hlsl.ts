
import * as vscode from 'vscode';
import { documentSymbolProvider } from './hlsl.DocumentSymbolProvider.js';

function activate(context: vscode.ExtensionContext) {
    // 注册所有 HLSL Provider
    context.subscriptions.push(documentSymbolProvider);
    console.log('HLSL language support activated');
}

export { activate };

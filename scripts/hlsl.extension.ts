
import * as vscode from 'vscode';
import { provideDocumentSymbols } from './hlsl.DocumentSymbolProvider.js';

function activate(context: vscode.ExtensionContext) {
    // 定义文档符号工具
    const documentSymbolProvider = vscode.languages.registerDocumentSymbolProvider('hlsl',
        { provideDocumentSymbols }
    );

    context.subscriptions.push(documentSymbolProvider);
}

export { activate };

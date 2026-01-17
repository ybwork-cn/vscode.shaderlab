import * as vscode from 'vscode';
import { provideDocumentFormattingEdits } from './shared.CodeFormatter.js';

/**
 * 格式化工具
 */
const registerDocumentFormattingEditProvider = (context: vscode.ExtensionContext) => {
    const provider = vscode.languages.registerDocumentFormattingEditProvider('shaderlab',
        { provideDocumentFormattingEdits }
    );
    context.subscriptions.push(provider);
}

export { registerDocumentFormattingEditProvider }

import * as vscode from 'vscode';
import { provideDocumentFormattingEdits } from './shared.CodeFormatter.js';


/**
 * 注册格式化提供程序
 * @param context 
 */
const registerDocumentFormattingEditProvider = (context: vscode.ExtensionContext) => {
    const hlslDocumentFormattingEditProvider = vscode.languages.registerDocumentFormattingEditProvider('hlsl',
        { provideDocumentFormattingEdits }
    );

    context.subscriptions.push(hlslDocumentFormattingEditProvider);
}

export { registerDocumentFormattingEditProvider };

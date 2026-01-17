import * as vscode from 'vscode';

import { registerDocumentSemanticTokensProvider } from './shaderlab.SemanticTokensProvider.js';
import { registerDocumentFormattingEditProvider } from './shaderlab.FormattingEditProvider.js';
import { registerDefinitionProvider } from './shaderlab.DefinitionProvider.js';
import { registerDocumentSymbolProvider } from './shaderlab.DocumentSymbolProvider.js';
import { registerHoverProvider } from './shaderlab.HoverProvider.js';
import { registerCompletionItemProvider } from './shaderlab.CompletionItemProvider.js';

const registerActivateCommand = (context: vscode.ExtensionContext) => {
    const activateCommand = vscode.commands.registerCommand('ybwork-shaderlab.activate', () => {
        vscode.window.showInformationMessage('Beautify ShaderLab 已手动激活！');
    });

    context.subscriptions.push(activateCommand);
}

const registerFormatCommand = (context: vscode.ExtensionContext): void => {
    const formatCommand = vscode.commands.registerCommand('ybwork-shaderlab.format', () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('没有活动的编辑器，无法格式化文档！');
            return;
        }

        const document = editor.document;
        if (document.languageId !== 'shaderlab') {
            vscode.window.showErrorMessage(`当前文档语言为 ${document.languageId}， 不是 shaderlab，无法格式化！`);
            return;
        }

        vscode.commands.executeCommand('editor.action.formatDocument').then(() => {
            vscode.window.showInformationMessage('shaderlab 文档已格式化！');
        });
    });

    context.subscriptions.push(formatCommand);
}

const activate = (context: vscode.ExtensionContext) => {
    // 注册文档符号提供程序
    registerDocumentSymbolProvider(context);
    // 注册格式化提供程序
    registerDocumentFormattingEditProvider(context);
    // 注册语义标记提供程序
    registerDocumentSemanticTokensProvider(context);
    // 注册代码完成提供程序
    registerCompletionItemProvider(context);
    // 注册悬停提供程序
    registerHoverProvider(context);
    // 注册转到定义提供程序
    registerDefinitionProvider(context);
    // 注册激活命令
    registerActivateCommand(context);
    // 注册格式化命令
    registerFormatCommand(context);

    console.log('shaderlab language support activated');
}

export { activate }

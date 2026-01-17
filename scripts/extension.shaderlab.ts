import * as vscode from 'vscode';

import { documentSemanticTokensProvider } from './shaderlab.SemanticTokensProvider.js';
import { documentFormattingEditProvider } from './shaderlab.FormattingEditProvider.js';
import { definitionProvider } from './shaderlab.DefinitionProvider.js';
import { documentSymbolProvider } from './shaderlab.DocumentSymbolProvider.js';
import { hoverProvider } from './shaderlab.HoverProvider.js';
import { completionItemProvider } from './shaderlab.CompletionItemProvider.js';
import {
    diagnosticCollection,
    textChangedEvent
} from './shaderlab.diagnosticProvider.js';

const activate = (context: vscode.ExtensionContext) => {

    const activateCommand = vscode.commands.registerCommand('ybwork-shaderlab.activate', () => {
        vscode.window.showInformationMessage('Beautify ShaderLab 已手动激活！');
    });

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

    // 注册清理逻辑
    // 注册文档符号提供程序
    context.subscriptions.push(documentSymbolProvider);
    // 注册格式化提供程序
    context.subscriptions.push(documentFormattingEditProvider);
    // 注册语义标记提供程序
    context.subscriptions.push(documentSemanticTokensProvider);
    // 注册代码完成提供程序
    context.subscriptions.push(completionItemProvider);
    // 注册悬停提供程序
    context.subscriptions.push(hoverProvider);
    // 注册转到定义提供程序
    context.subscriptions.push(definitionProvider);
    // 注册激活命令
    context.subscriptions.push(activateCommand);
    // 注册格式化命令
    context.subscriptions.push(formatCommand);
    // 注册诊断集合监听器
    context.subscriptions.push(diagnosticCollection);
    // 注册文档变化监听器
    context.subscriptions.push(textChangedEvent);

    console.log('shaderlab language support activated');
}

export { activate }

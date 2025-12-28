import * as vscode from 'vscode';
import * as hlsl from './hlsl.extension.js';

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

function activate(context: vscode.ExtensionContext) {

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "Beautify ShaderLab" is now active!');

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
    // TODO:注册文档变化监听器
    // context.subscriptions.push(textChangedEvent);
    hlsl.activate(context);
}

// this method is called when your extension is deactivated
function deactivate() {
    console.log('您的扩展"Beautify ShaderLab"已被释放！');
}

export {
    activate,
    deactivate
};

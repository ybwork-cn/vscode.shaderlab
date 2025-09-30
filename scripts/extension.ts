import * as vscode from 'vscode';
import * as hlsl from './hlsl.extension.js';

import { SemanticTokensProvider, tokenLegend } from './shaderlab.SemanticTokensProvider.js';
import { provideDocumentFormattingEdits } from './shaderlab.FormattingEditProvider.js';
import { provideDefinition } from './shaderlab.DefinitionProvider.js';
import { provideDocumentSymbols } from './shaderlab.DocumentSymbolProvider.js';
import { provideHover } from './shaderlab.HoverProvider.js';
import * as $ from './$.js';

function activate(context: vscode.ExtensionContext) {

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "Beautify ShaderLab" is now active!');

    // 格式化工具
    const documentFormattingEditProvider = vscode.languages.registerDocumentFormattingEditProvider('ShaderLab',
        { provideDocumentFormattingEdits }
    );

    // 语义标记提供程序(关键字高亮)
    const documentSemanticTokensProvider = vscode.languages.registerDocumentSemanticTokensProvider('ShaderLab',
        new SemanticTokensProvider(),
        tokenLegend
    );

    // 代码完成工具
    const completionItemProvider = vscode.languages.registerCompletionItemProvider('ShaderLab', {
        provideCompletionItems,
        resolveCompletionItem: (item, token) => null
    }, '.');

    // 定义文档符号工具
    const documentSymbolProvider = vscode.languages.registerDocumentSymbolProvider('ShaderLab',
        { provideDocumentSymbols }
    );

    const hoverProvider = vscode.languages.registerHoverProvider('ShaderLab',
        { provideHover }
    );

    // 转到定义工具
    const definitionProvider = vscode.languages.registerDefinitionProvider('ShaderLab',
        { provideDefinition }
    );

    context.subscriptions.push(documentFormattingEditProvider);
    context.subscriptions.push(documentSemanticTokensProvider);
    context.subscriptions.push(completionItemProvider);
    context.subscriptions.push(documentSymbolProvider);
    context.subscriptions.push(hoverProvider);
    context.subscriptions.push(definitionProvider);
    hlsl.activate(context);
}

// this method is called when your extension is deactivated
function deactivate() {
    console.log('您的扩展"Beautify ShaderLab"已被释放！');
}

function getDocumentSymbols(document: vscode.TextDocument) {
    return vscode.commands.executeCommand<vscode.DocumentSymbol[]>('vscode.executeDocumentSymbolProvider', document.uri);
}

/**
 * 当前shader中的结构体的引用调用其字段时，弹出候选词，如：
 * struct v2f
 * {
 *   float4 pos : SV_POSITION;
 * };
 *
 * v2f v;
 * 当敲下"v."时，自动弹出候选词pos
 */
function provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList<vscode.CompletionItem>> {
    const line = document.lineAt(position);
    // 只截取到光标位置为止，防止一些特殊情况
    let lineText = line.text.substring(0, position.character);
    lineText = $.replace(lineText, /\s*/g, () => '');
    if (lineText.endsWith('.')) {
        lineText = lineText.substring(0, lineText.length - 1);
        var definition = document.getText(new vscode.Range(new vscode.Position(0, 0), position));
        var reg = new RegExp('([a-zA-Z_][a-zA-Z0-9_]*) +' + lineText, 'gm');
        var end = Array.from(definition.matchAll(reg)).pop();
        const word = end[1];
        return getDocumentSymbols(document).then<vscode.CompletionItem[]>(symbols => {
            let target = symbols.find(symbol => symbol.name === word);
            var fields = target.children;

            return fields.map(field => {
                // vscode.CompletionItemKind 表示提示的类型
                var label: vscode.CompletionItemLabel = {
                    label: field.name,
                    description: field.detail
                };
                return new vscode.CompletionItem(label, vscode.CompletionItemKind.Field);
            });
        });
    }
    return [];
}

export {
    activate,
    deactivate
};

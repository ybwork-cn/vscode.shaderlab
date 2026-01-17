import * as vscode from 'vscode';
import $ from './$.js';

const getDocumentSymbols = (document: vscode.TextDocument) => {
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
const provideCompletionItems = (document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList<vscode.CompletionItem>> => {
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

/**
 * 代码完成工具
 * @param context 
 */
const registerCompletionItemProvider = (context: vscode.ExtensionContext): void => {
    const provider = vscode.languages.registerCompletionItemProvider('shaderlab', {
        provideCompletionItems,
        resolveCompletionItem: (item, token) => null
    }, '.');
    context.subscriptions.push(provider);
}

export { registerCompletionItemProvider };

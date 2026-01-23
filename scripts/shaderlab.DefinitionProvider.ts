
import * as vscode from 'vscode';
import { symbolCache } from './shared.SymbolCache.js';

/**
 * 转到定义
 * 快速查看-速览定义
 * Provide the definition of the symbol at the given position and document.
 * @param document The document in which the command was invoked.
 * @param position The position at which the command was invoked.
 * @param token A cancellation token.
 * @return A definition or a thenable that resolves to such. The lack of a result can be
 * signaled by returning `undefined` or `null`.
 */
const provideDefinition = async (document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): Promise<vscode.DefinitionLink[]> => {
    const cached = await symbolCache.getCachedSymbols(document);
    const symbolStack = cached.getSymbolStack(position);
    const target = nextSymbol(document, symbolStack, position);
    if (target != null)
        return [target];

    // TODO: 通过include跨文件定义查找
    return null;
}

const nextSymbol = (document: vscode.TextDocument, symbolStack: readonly vscode.DocumentSymbol[], position: vscode.Position): vscode.DefinitionLink => {
    // 当前光标下的单词
    const word = document.getText(document.getWordRangeAtPosition(position));
    // 倒序，由内而外查找定义
    for (let index = symbolStack.length - 1; index >= 0; index--) {
        const symbol = symbolStack[index];
        let target = symbol.children.find(symbol => symbol.name === word);
        if (target != null) {
            return {
                targetUri: document.uri,
                targetRange: target.range,
                targetSelectionRange: target.selectionRange,
            };
        }
        target = symbol.children.find(symbol => symbol.name === "CGINCLUDE");
        target = target?.children.find(symbol => symbol.name === word);
        if (target != null) {
            return {
                targetUri: document.uri,
                targetRange: target.range,
                targetSelectionRange: target.selectionRange,
            };
        }
    }
    return null;
}

/**
 * 转到定义工具
 */
const registerDefinitionProvider = (context: vscode.ExtensionContext) => {
    const provider = vscode.languages.registerDefinitionProvider('shaderlab',
        { provideDefinition }
    );
    context.subscriptions.push(provider);
}

export { registerDefinitionProvider };

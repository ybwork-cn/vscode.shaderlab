
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
    const results: vscode.DefinitionLink[] = [];

    // 当前光标下的单词
    const word = document.getText(document.getWordRangeAtPosition(position));
    const cached = await symbolCache.getCachedDocument(document);
    const symbolStack = cached.getSymbolStack(position);
    const target = nextSymbol(document.uri, word, symbolStack);
    if (target) {
        results.push(target);
    }

    // 通过include跨文件定义查找
    // include时，只处理文档顶级符号
    await cached.foreachIncludeRecursion(token, document => {
        const symbols = document.symbols.filter(symbol => symbol.name === word);
        symbols.forEach(symbol => {
            results.push({
                targetUri: document.document.uri,
                targetRange: symbol.range,
                targetSelectionRange: symbol.selectionRange,
            });
        });
        return false; // 继续查找
    });
    return results;
}

const nextSymbol = (uri: vscode.Uri, word: string, symbolStack: readonly vscode.DocumentSymbol[]): vscode.DefinitionLink => {
    // 倒序，由内而外查找定义
    for (let index = symbolStack.length - 1; index >= 0; index--) {
        const symbol = symbolStack[index];
        let target = symbol.children.find(symbol => symbol.name === word);
        if (target != null) {
            return {
                targetUri: uri,
                targetRange: target.range,
                targetSelectionRange: target.selectionRange,
            };
        }
        target = symbol.children.find(symbol => symbol.name === "CGINCLUDE");
        target = target?.children.find(symbol => symbol.name === word);
        if (target != null) {
            return {
                targetUri: uri,
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

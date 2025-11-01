
import * as vscode from 'vscode';
import * as fs from 'fs';
import { getDocumentSymbols, getSymbolStack } from './shaderlab.DocumentStructure';

interface DocumentSymbolInfo {
    symbol: vscode.DocumentSymbol
    document: vscode.TextDocument
}

function getSymbolDefine(document: vscode.TextDocument, name: string, temp: DocumentSymbolInfo[]): vscode.ProviderResult<DocumentSymbolInfo[]> {
    return getDocumentSymbols(document)
        .then(_symbols => {
            const result: DocumentSymbolInfo[] = [...temp];
            for (const symbol of _symbols) {
                if (symbol.name == name || symbol.kind == vscode.SymbolKind.Module)
                    result.push({ symbol, document });
            }
            return result;
        }).then(symbols => {
            if (symbols.length == 0)
                return null;
            for (const _symbol of symbols) {
                if (_symbol.symbol.kind != vscode.SymbolKind.Module)
                    return [_symbol];
            }

            const last = symbols.pop();
            const path = vscode.workspace.getConfiguration().get('Unity CGIncludes Path');
            return vscode.workspace.openTextDocument(path + "/" + last.symbol.name).then(doc => {
                return getSymbolDefine(doc, name, symbols);
            });
        });
}

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
export function provideDefinition(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): vscode.ProviderResult<vscode.DefinitionLink[]> {
    return getDocumentSymbols(document).then<vscode.LocationLink[]>(symbols => {
        for (const symbol of symbols) {
            const symbolStack = getSymbolStack(symbol, position);
            const target = nextSymbol(document, symbolStack, position);
            if (target != null)
                return [target];
        }

        const path = vscode.workspace.getConfiguration().get<string>('Unity CGIncludes Path');
        if (!fs.existsSync(path))
            return null;
        return vscode.workspace.openTextDocument(path + "/UnityCG.cginc")
            .then(doc => {
                return getSymbolDefine(doc, document.getText(document.getWordRangeAtPosition(position)), []);
            })
            .then<vscode.DefinitionLink[]>(symbolInfos => {
                const result: vscode.DefinitionLink[] = [];
                for (const symbolInfo of symbolInfos) {
                    result.push({
                        targetUri: symbolInfo.document.uri,
                        targetRange: symbolInfo.symbol.range,
                        targetSelectionRange: symbolInfo.symbol.selectionRange,
                    });
                }
                return result;
            });
    });
}

function nextSymbol(document: vscode.TextDocument, symbolStack: vscode.DocumentSymbol[], position: vscode.Position): vscode.DefinitionLink {
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


import * as vscode from 'vscode';
import { findSymbolsBySymbolKind, getDocumentSymbols, getSymbolStack } from './shaderlab.DocumentStructure.js';

// 定义语义标记的规则
const tokenLegend = new vscode.SemanticTokensLegend([
    'namespace',    // 表示命名空间。
    'type',         // 表示类型。
    'class',        // 表示类。
    'enum',         // 表示枚举。
    'interface',    // 表示接口。
    'struct',       // 表示结构体。
    'typeParameter',// 表示类型参数。
    'parameter',    // 表示参数。
    'variable',     // 表示变量。
    'property',     // 表示属性。
    'enumMember',   // 表示枚举成员。
    'event',        // 表示事件。
    'function',     // 表示函数。
    'method',       // 表示方法。
    'macro',        // 表示宏。
    'keyword',      // 表示关键字。
    'modifier',     // 表示修饰符。
    'comment',      // 表示注释。
    'string',       // 表示字符串。
    'number',       // 表示数字。
], [
    'declaration',  // 用于声明语法元素，如函数、类、变量等。
    'definition',   // 用于定义语法元素，如函数、类、变量的定义位置。
    'readonly',     // 表示标记的语法元素是只读的。
    'static',       // 表示标记的语法元素是静态的。
    'async',        // 表示标记的语法元素是异步的。
    'deprecated',   // 表示标记的语法元素已被弃用。
    'abstract',     // 表示标记的语法元素是抽象的。
    'optional',     // 表示标记的语法元素是可选的。
    'private',      // 表示标记的语法元素是私有的。
    'protected',    // 表示标记的语法元素是受保护的。
    'public',       // 表示标记的语法元素是公共的。
]);

function SemanticTokens_Type(document: vscode.TextDocument, tokensBuilder: vscode.SemanticTokensBuilder, range: vscode.Range) {
    const text = document.getText(range);
    if (text.match(/^((fixed|float|int|half)([1-4](x[1-4])?)?)$/)) {
        tokensBuilder.push(range, 'macro');
    }
    else if (text.match(/^sampler2D$/)) {
        tokensBuilder.push(range, 'type');
    }
    else {
        const symbolStack = getSymbolStack(rootSymbol, range.start);
        const target = nextSymbol(document, symbolStack, range.start);
        target && tokensBuilder.push(range, 'struct');
    }
}

function nextSymbol(document: vscode.TextDocument, symbolStack: vscode.DocumentSymbol[], position: vscode.Position): vscode.DocumentSymbol {
    const word = document.getText(document.getWordRangeAtPosition(position));
    for (let index = symbolStack.length - 1; index >= 0; index--) {
        const symbol = symbolStack[index];
        let target = symbol.children.find(symbol => symbol.name === word && symbol.kind == vscode.SymbolKind.Class);
        if (target != null) {
            return target;
        }
    }
    return null;
}

function SemanticTokens_Function(document: vscode.TextDocument, tokensBuilder: vscode.SemanticTokensBuilder, symbol: vscode.DocumentSymbol) {
    for (const child of symbol.children) {
        if (child.kind == vscode.SymbolKind.Variable) {
            SemanticTokens_Type(document, tokensBuilder, document.getWordRangeAtPosition(child.range.start));
            tokensBuilder.push(document.getWordRangeAtPosition(child.selectionRange.start), 'variable');
        }
    }
}

function SemanticTokens_CGPROGRAM(document: vscode.TextDocument, tokensBuilder: vscode.SemanticTokensBuilder, symbol: vscode.DocumentSymbol) {
    const symbolvars = symbol.children.filter(s => s.kind == vscode.SymbolKind.Variable);
    for (const symbolvar of symbolvars) {
        SemanticTokens_Type(document, tokensBuilder, document.getWordRangeAtPosition(symbolvar.range.start));
        tokensBuilder.push(symbolvar.selectionRange, 'variable');
    }

    const symbolFunctions = symbol.children.filter(s => s.kind == vscode.SymbolKind.Method);
    for (const symbolFunction of symbolFunctions) {
        SemanticTokens_Function(document, tokensBuilder, symbolFunction);
    }
}

let rootSymbol: vscode.DocumentSymbol;
// 定义语义标记提供程序
class SemanticTokensProvider implements vscode.DocumentSemanticTokensProvider {
    provideDocumentSemanticTokens(document: vscode.TextDocument): vscode.ProviderResult<vscode.SemanticTokens> {
        return getDocumentSymbols(document).then(symbols => {
            if (symbols.length > 0)
                rootSymbol = symbols[0];
            symbols = findSymbolsBySymbolKind(symbols, ['CGPROGRAM', 'CGINCLUDE', 'HLSLPROGRAM', 'HLSLINCLUDE'], vscode.SymbolKind.Null);
            const tokensBuilder = new vscode.SemanticTokensBuilder(tokenLegend);
            for (const symbol of symbols) {
                SemanticTokens_CGPROGRAM(document, tokensBuilder, symbol);
            }
            return tokensBuilder.build();
        });
    }
}

export { SemanticTokensProvider, tokenLegend };

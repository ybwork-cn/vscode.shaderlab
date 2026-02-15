
import * as vscode from 'vscode';
import { symbolCache } from './shared.SymbolCache.js';

enum tokenType {
    type = 'type',          // 表示类型。
    class = 'class',        // 表示类。
    struct = 'struct',      // 表示结构体。
    parameter = 'parameter',// 表示参数。
    variable = 'variable',  // 表示变量。
    property = 'property',  // 表示属性。
    method = 'method',      // 表示方法。
    macro = 'macro',        // 表示宏。
    modifier = 'modifier',  // 表示修饰符。
}

// 定义语义标记的规则
const tokenLegend = new vscode.SemanticTokensLegend(
    Object.keys(tokenType).filter(k => isNaN(Number(k))), [
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

interface FindInfo {
    document: vscode.TextDocument;
    tokensBuilder: vscode.SemanticTokensBuilder;
    rootSymbols: readonly vscode.DocumentSymbol[];
}

const SemanticTokens_CGPROGRAM = (info: FindInfo) => {
    // 处理本级符号，字段、结构体、变量
    for (const symbol of info.rootSymbols) {
        if (symbol.kind === vscode.SymbolKind.Field) {
            SemanticTokens_Type(info.document, info.tokensBuilder, symbol.range.start);
            info.tokensBuilder.push(symbol.selectionRange, tokenType.property);
        }
        else if (symbol.kind === vscode.SymbolKind.Struct) {
            info.tokensBuilder.push(info.document.getWordRangeAtPosition(symbol.range.start), 'macro');
            info.tokensBuilder.push(symbol.selectionRange, tokenType.struct);
        }
        else if (symbol.kind === vscode.SymbolKind.Variable) {
            SemanticTokens_Type(info.document, info.tokensBuilder, symbol.range.start);
            info.tokensBuilder.push(symbol.selectionRange, tokenType.variable);
        }
    }

    // 处理嵌套的符号
    for (const symbol of info.rootSymbols) {
        SemanticTokens_CGPROGRAM({
            document: info.document,
            tokensBuilder: info.tokensBuilder,
            rootSymbols: symbol.children
        });
    }
};

const SemanticTokens_Type = (
    document: vscode.TextDocument,
    tokensBuilder: vscode.SemanticTokensBuilder,
    position: vscode.Position
) => {
    const typeRange = document.getWordRangeAtPosition(position);
    const typeText = document.getText(typeRange);
    if (typeText.match(/^((fixed|float|int|half)([1-4](x[1-4])?)?)$/)) {
        tokensBuilder.push(typeRange, tokenType.macro);
    }
    else if (typeText.match(/^sampler2D$/)) {
        tokensBuilder.push(typeRange, tokenType.type);
    }
    else {
        tokensBuilder.push(typeRange, tokenType.struct);
    }
};

// 定义语义标记提供程序
class SemanticTokensProvider implements vscode.DocumentSemanticTokensProvider {
    async provideDocumentSemanticTokens(document: vscode.TextDocument): Promise<vscode.SemanticTokens> {
        const cached = await symbolCache.getCachedDocument(document);
        const tokensBuilder = new vscode.SemanticTokensBuilder(tokenLegend);
        SemanticTokens_CGPROGRAM({
            document,
            tokensBuilder,
            rootSymbols: cached.exportedSymbols,
        });
        return tokensBuilder.build();
    }
}

/**
 * 语义标记提供程序(关键字高亮)
 * @param context
 */
const registerDocumentSemanticTokensProvider = (context: vscode.ExtensionContext) => {
    const documentSemanticTokensProvider = vscode.languages.registerDocumentSemanticTokensProvider('shaderlab',
        new SemanticTokensProvider(),
        tokenLegend
    );
    context.subscriptions.push(documentSemanticTokensProvider);
};
export { registerDocumentSemanticTokensProvider };

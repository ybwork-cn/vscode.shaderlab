
import * as vscode from 'vscode';
import { documentStructureUtils } from './shaderlab.DocumentStructure';

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

function SemanticTokens_CGPROGRAM(document: vscode.TextDocument, tokensBuilder: vscode.SemanticTokensBuilder, symbol: vscode.DocumentSymbol) {
    const symbols = documentStructureUtils.findAllSymbols(symbol);
    SemanticTokens_Structs(document, tokensBuilder, symbols);
    SemanticTokens_Fields(document, tokensBuilder, symbols);
    SemanticTokens_Variables(document, tokensBuilder, symbols);
}

function SemanticTokens_Structs(document: vscode.TextDocument, tokensBuilder: vscode.SemanticTokensBuilder, symbols: vscode.DocumentSymbol[]) {
    symbols = documentStructureUtils.findSymbolsBySymbolKind(symbols, [vscode.SymbolKind.Struct]);
    for (const symbol of symbols) {
        tokensBuilder.push(document.getWordRangeAtPosition(symbol.range.start), 'macro');
        tokensBuilder.push(symbol.selectionRange, tokenType.struct);
    }
}

function SemanticTokens_Variables(document: vscode.TextDocument, tokensBuilder: vscode.SemanticTokensBuilder, symbols: vscode.DocumentSymbol[]) {
    symbols = documentStructureUtils.findSymbolsBySymbolKind(symbols, [vscode.SymbolKind.Variable]);
    for (const symbol of symbols) {
        SemanticTokens_Type(document, tokensBuilder, symbol.range.start);
        tokensBuilder.push(symbol.selectionRange, tokenType.variable);
    }
}

function SemanticTokens_Fields(document: vscode.TextDocument, tokensBuilder: vscode.SemanticTokensBuilder, symbols: vscode.DocumentSymbol[]) {
    symbols = documentStructureUtils.findSymbolsBySymbolKind(symbols, [vscode.SymbolKind.Field]);
    for (const symbol of symbols) {
        SemanticTokens_Type(document, tokensBuilder, symbol.range.start);
        tokensBuilder.push(symbol.selectionRange, tokenType.property);
    }
}

function SemanticTokens_Type(
    document: vscode.TextDocument,
    tokensBuilder: vscode.SemanticTokensBuilder,
    position: vscode.Position
) {
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
}

// 定义语义标记提供程序
class SemanticTokensProvider implements vscode.DocumentSemanticTokensProvider {
    provideDocumentSemanticTokens(document: vscode.TextDocument): vscode.ProviderResult<vscode.SemanticTokens> {
        return documentStructureUtils
            .getDocumentSymbols(document)
            .then(symbols => {
                if (symbols.length == 0)
                    return null;
                const tokensBuilder = new vscode.SemanticTokensBuilder(tokenLegend);
                const cgScriptSymbols = documentStructureUtils.findSymbolsByName(symbols, ['CGPROGRAM', 'CGINCLUDE', 'HLSLPROGRAM', 'HLSLINCLUDE']);
                for (const symbol of cgScriptSymbols) {
                SemanticTokens_CGPROGRAM(document, tokensBuilder, symbol);
            }
            return tokensBuilder.build();
        });
    }
}

// 语义标记提供程序(关键字高亮)
const documentSemanticTokensProvider = vscode.languages.registerDocumentSemanticTokensProvider('shaderlab',
    new SemanticTokensProvider(),
    tokenLegend
);

export { documentSemanticTokensProvider };

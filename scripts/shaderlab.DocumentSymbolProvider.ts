
import * as vscode from 'vscode';
import {
    BracketInfo,
    documentStructureUtils
} from './shared.DocumentStructure.js';
import {
    SemanticTokenInfo,
    SemanticTokens_Script,
    createRangeFromOffsets,
    createSelectionRangeFromMatch
} from './shared.DocumentSymbolProvider.js';

const SemanticTokens_Pass = (tokenInfo: SemanticTokenInfo, parentSymbol: vscode.DocumentSymbol, bracketInfo: BracketInfo) => {
    if (tokenInfo.token.isCancellationRequested)
        return;
    const { document } = tokenInfo;
    const text = bracketInfo.text;

    let matchStart = /CGPROGRAM|CGINCLUDE/ig.exec(text);
    let matchEnd = /ENDCG/ig.exec(text);
    if (matchStart == null || matchEnd == null) {
        matchStart = /HLSLPROGRAM|HLSLINCLUDE/ig.exec(text);
        matchEnd = /ENDHLSL/ig.exec(text);
    }
    if (matchStart == null || matchEnd == null)
        return;

    const startPosition = document.positionAt(matchStart.index + bracketInfo.start);
    for (const child of parentSymbol.children) {
        if (startPosition.compareTo(child.range.start) >= 0 && startPosition.compareTo(child.range.end) <= 0)
            return;
    }

    if (matchStart.length > 0 && matchEnd.length > 0) {
        const selectionRange = createSelectionRangeFromMatch(tokenInfo, bracketInfo.start, matchStart.index, matchStart[0].length);

        const range = createRangeFromOffsets(
            tokenInfo,
            matchStart.index + bracketInfo.start,
            matchEnd.index + matchEnd[0].length + bracketInfo.start
        );

        const node = new vscode.DocumentSymbol(matchStart[0].toUpperCase(), '', vscode.SymbolKind.Package, range, selectionRange);
        parentSymbol.children.push(node);

        const start = matchStart[0].length + matchStart.index + bracketInfo.start;
        const end = matchEnd.index + bracketInfo.start;
        const bracket = new BracketInfo(document, start, null);
        bracket.set_end(end);
        bracket.children.push(...bracketInfo.children);
        SemanticTokens_Script(tokenInfo, node, bracket);
    }
};

const SemanticTokens_SubShader = (tokenInfo: SemanticTokenInfo, parentSymbol: vscode.DocumentSymbol, bracketInfo: BracketInfo) => {
    if (tokenInfo.token.isCancellationRequested)
        return;
    const text = bracketInfo.text;
    let match: RegExpExecArray;
    const regex = /(Pass)\s*{/ig;
    while ((match = regex.exec(text))) {
        const selectionRange = createSelectionRangeFromMatch(tokenInfo, bracketInfo.start, match.index, match[1].length);

        const end = match[0].length - 1 + match.index + bracketInfo.start;
        const bracket = bracketInfo.children.find(item => item.start == end);
        const range = createRangeFromOffsets(tokenInfo, match.index + bracketInfo.start, bracket.end);

        const node = new vscode.DocumentSymbol(match[1], '', vscode.SymbolKind.Package, range, selectionRange);
        parentSymbol.children.push(node);

        SemanticTokens_Pass(tokenInfo, node, bracket);
    }
    SemanticTokens_Pass(tokenInfo, parentSymbol, bracketInfo);
};

const SemanticTokens_Properties = (tokenInfo: SemanticTokenInfo, parentSymbol: vscode.DocumentSymbol, bracketInfo: BracketInfo) => {
    if (tokenInfo.token.isCancellationRequested)
        return;
    const text = bracketInfo.text;
    let match: RegExpExecArray;
    // _MainTex ("Texture", 2D) = "white" {}
    // _Radius ("Radius", Range(0,10)) = 1.0
    const regex = /(\w+)\s*\(".*?"\s*,\s*(.+?)\)\s*(?:=\s*.*)$/mg;
    while ((match = regex.exec(text))) {
        const selectionRange = createSelectionRangeFromMatch(tokenInfo, bracketInfo.start, match.index, match[1].length);

        const range = createRangeFromOffsets(
            tokenInfo,
            match.index + bracketInfo.start,
            match.index + bracketInfo.start + match[0].length
        );

        const node = new vscode.DocumentSymbol(match[1], match[2], vscode.SymbolKind.Property, range, selectionRange);
        parentSymbol.children.push(node);
    }
};

const SemanticTokens_Shader = (tokenInfo: SemanticTokenInfo, parentSymbol: vscode.DocumentSymbol, bracketInfo: BracketInfo) => {
    if (tokenInfo.token.isCancellationRequested)
        return;
    const text = bracketInfo.text;
    let match: RegExpExecArray;
    if ((match = /(Properties)\s*{/ig.exec(text))) {
        const selectionRange = createSelectionRangeFromMatch(tokenInfo, bracketInfo.start, match.index, match[1].length);

        const end = match[0].length - 1 + match.index + bracketInfo.start;
        const bracket = bracketInfo.children.find(item => item.start == end);
        const range = createRangeFromOffsets(tokenInfo, match.index + bracketInfo.start, bracket.end);

        const node = new vscode.DocumentSymbol('Properties', '', vscode.SymbolKind.Package, range, selectionRange);
        parentSymbol.children.push(node);

        SemanticTokens_Properties(tokenInfo, node, bracket);
    }
    const regex = /(SubShader)\s*{/ig;
    while ((match = regex.exec(text))) {
        if (tokenInfo.token.isCancellationRequested)
            return;
        const selectionRange = createSelectionRangeFromMatch(tokenInfo, bracketInfo.start, match.index, match[1].length);

        const end = match[0].length - 1 + match.index + bracketInfo.start;
        const bracket = bracketInfo.children.find(item => item.start == end);
        const range = createRangeFromOffsets(tokenInfo, match.index + bracketInfo.start, bracket.end);

        const node = new vscode.DocumentSymbol('SubShader', '', vscode.SymbolKind.Package, range, selectionRange);
        parentSymbol.children.push(node);

        SemanticTokens_SubShader(tokenInfo, node, bracket);
    }
};

const SemanticTokens_Root = (document: vscode.TextDocument, bracketInfo: BracketInfo, token: vscode.CancellationToken): vscode.DocumentSymbol => {
    if (token.isCancellationRequested)
        return null;
    const text = bracketInfo.text;
    let match: RegExpExecArray;
    if ((match = /(Shader)\s*(".*?")\s*{/ig.exec(text))) {
        const tokenInfo: SemanticTokenInfo = { document, token };
        const selectionRange = createSelectionRangeFromMatch(tokenInfo, bracketInfo.start, match.index, match[1].length);

        const end = match[0].length - 1 + match.index + bracketInfo.start;
        const bracket = bracketInfo.children.find(item => item.start == end);
        const range = createRangeFromOffsets(tokenInfo, match.index + bracketInfo.start, bracket.end);

        const rootSymbol = new vscode.DocumentSymbol('Shader', match[2], vscode.SymbolKind.File, range, selectionRange);
        SemanticTokens_Shader(tokenInfo, rootSymbol, bracket);
        return rootSymbol;
    }
    return null;
};

/**
 * 提供文档中所有符号信息
 * Provide symbol information for the given document.
 * @param document The document in which the command was invoked.
 * @param token A cancellation token.
 * @return An array of document highlights or a thenable that resolves to such. The lack of a result can be
 * signaled by returning `undefined`, `null`, or an empty array.
*/
const provideDocumentSymbols = (document: vscode.TextDocument, token: vscode.CancellationToken): vscode.ProviderResult<vscode.SymbolInformation[] | vscode.DocumentSymbol[]> => {
    const rootBracket = documentStructureUtils.getRootBracket(document, token);
    const documentStructure = SemanticTokens_Root(document, rootBracket, token);
    return [documentStructure];
};

/**
 * 定义文档符号工具提供程序
 * @param context
 */
const registerDocumentSymbolProvider = (context: vscode.ExtensionContext) => {
    const provider = vscode.languages.registerDocumentSymbolProvider('shaderlab',
        { provideDocumentSymbols }
    );
    context.subscriptions.push(provider);
};

export { registerDocumentSymbolProvider };

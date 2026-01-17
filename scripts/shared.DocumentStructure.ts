import * as vscode from 'vscode';

class BracketInfo {
    readonly document: vscode.TextDocument;
    readonly start: number
    private _end: number
    get end() { return this._end; }
    readonly bracketType?: '()' | '{}'
    readonly children?: BracketInfo[];
    constructor(document: vscode.TextDocument, start: number, bracketType: '()' | '{}' | null) {
        this.document = document;
        this.start = start;
        this._end = document.getText().length;
        this.bracketType = bracketType;
        this.children = [];
    }
    set_end(value: number) { this._end = value; }
    get text() {
        const range = new vscode.Range(this.document.positionAt(this.start), this.document.positionAt(this.end));
        return this.document.getText(range);
    }
}

/**
 * 判断字符串代表的类型(基本类型、结构体、找不到定义)
 * @param root
 * @param position
 * @param label
 * @returns
 */
const isType = (root: vscode.DocumentSymbol, position: vscode.Position, label: string): 'baseType' | 'struct' | false => {
    if (/^((float|fixed|int|half)[2-4]?)|sampler2D$/.test(label))
        return 'baseType';
    const stack: vscode.DocumentSymbol[] = [];

    let head = root;
    while (head != null) {
        stack.push(head);
        head = head.children.find(item => item.range.start.compareTo(position) <= 0 && position.compareTo(item.range.end) <= 0);
    }

    while (stack.length > 0) {
        const last = stack.pop();
        const struct = last.children.find(item => item.kind == vscode.SymbolKind.Struct && item.name == label);
        if (struct != null)
            return 'struct';
    }
    return false;
}

/**
 * 获取所有成对的括号
 * @param text
 * @param start
 * @param root
 * @param brackets
 * @returns 结束位置
 */
const getBrackets = (text: string, start: number, root: BracketInfo, brackets: { key: '{' | '(', index: number }[], token: vscode.CancellationToken): number => {
    let index = start;
    for (; index < text.length; index++) {
        // 请求取消，立即返回
        if (token.isCancellationRequested)
            return index;

        if (text[index] == '{') {
            brackets.push({ key: "{", index });
            const current = new BracketInfo(root.document, index, '{}');
            root.children.push(current);
            index = getBrackets(text, index + 1, current, brackets, token);
        }
        else if (text[index] == '(') {
            brackets.push({ key: '(', index });
            const current = new BracketInfo(root.document, index, '()');
            root.children.push(current);
            index = getBrackets(text, index + 1, current, brackets, token);
        }
        else if (text[index] == '}') {
            if (brackets.length == 0)
                break;
            const last = brackets.pop();
            if (last.key != '{')
                break;
            root.set_end(index + 1);
            return index;
        }
        else if (text[index] == ')') {
            if (brackets.length == 0)
                break;
            const last = brackets.pop();
            if (last.key != '(')
                break;
            root.set_end(index + 1);
            return index;
        }
    }
    return index;
}

const getDocumentSymbols = (document: vscode.TextDocument): Thenable<vscode.DocumentSymbol[]> => {
    return vscode.commands.executeCommand<vscode.DocumentSymbol[]>('vscode.executeDocumentSymbolProvider', document.uri);
}

const findAllSymbols = (symbol: vscode.DocumentSymbol): vscode.DocumentSymbol[] => {
    const result: vscode.DocumentSymbol[] = [];
    result.push(symbol);
    for (const child of symbol.children) {
        result.push(...findAllSymbols(child));
    }
    return result;
}

const findSymbolsBySymbolKind = (symbols: vscode.DocumentSymbol[], kinds: vscode.SymbolKind[]): vscode.DocumentSymbol[] => {
    const result: vscode.DocumentSymbol[] = [];
    for (const symbol of symbols) {
        if (kinds.includes(symbol.kind))
            result.push(symbol);
        result.push(...findSymbolsBySymbolKind(symbol.children, kinds));
    }
    return result;
}

const findSymbolsByName = (symbols: vscode.DocumentSymbol[], names: string[]): vscode.DocumentSymbol[] => {
    const result: vscode.DocumentSymbol[] = [];
    for (const symbol of symbols) {
        if (names.indexOf(symbol.name) >= 0)
            result.push(symbol);
        result.push(...findSymbolsByName(symbol.children, names));
    }
    return result;
}

const symbolContainsPosition = (symbol: vscode.DocumentSymbol, position: vscode.Position): boolean => {
    return symbol.range.start.compareTo(position) <= 0 && symbol.range.end.compareTo(position) >= 0;
}

const getSymbolStack = (symbol: vscode.DocumentSymbol, position: vscode.Position): vscode.DocumentSymbol[] => {
    if (symbol == null)
        return [];

    if (!symbolContainsPosition(symbol, position))
        return [];

    for (const child of symbol.children) {
        if (symbolContainsPosition(child, position))
            return [symbol, ...getSymbolStack(child, position)];
    }
    return [symbol];
}

const documentStructureUtils = {
    getDocumentSymbols,
    isType,
    findAllSymbols,
    getRootBracket(document: vscode.TextDocument, token: vscode.CancellationToken): BracketInfo {
        const text = document.getText();
        const rootBracket = new BracketInfo(document, 0, null);
        getBrackets(text, 0, rootBracket, [], token);
        return rootBracket;
    },
    getSymbolStack,
    findSymbolsBySymbolKind,
    findSymbolsByName,
}

export {
    BracketInfo,
    documentStructureUtils,
}


import * as vscode from 'vscode';

export interface BracketInfo {
    start: number
    end: number
    bracketType?: '()' | '{}'
    children?: BracketInfo[]
}

/**
 * 判断字符串代表的类型(基本类型、结构体、找不到定义)
 * @param root
 * @param position
 * @param label
 * @returns
 */
export function isType(root: vscode.DocumentSymbol, position: vscode.Position, label: string): 'baseType' | 'struct' | false {
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
        const struct = last.children.find(item => item.kind == vscode.SymbolKind.Class && item.name == label);
        if (struct != null)
            return 'struct';
    }
    return false;
}

/**
 * 获取指定括号对包含的所有文字
 * @param document
 * @param bracket
 * @returns
 */
export function getDocumentText(document: vscode.TextDocument, bracket: BracketInfo) {
    const range = new vscode.Range(document.positionAt(bracket.start), document.positionAt(bracket.end));
    return document.getText(range);
}

/**
 * 获取所有成对的括号
 * @param text
 * @param start
 * @param root
 * @param brackets
 * @returns
 */
export function getBrackets(text: string, start: number, root: BracketInfo, brackets: { key: '{' | '}' | '(' | ')', index: number }[]) {
    let index = start;
    for (; index < text.length; index++) {
        if (text[index] == '{') {
            brackets.push({ key: "{", index });
            const current: BracketInfo = { start: index, end: text.length, bracketType: '{}', children: [] };
            root.children.push(current);
            index = getBrackets(text, index + 1, current, brackets);
        }
        else if (text[index] == '(') {
            brackets.push({ key: '(', index });
            const current: BracketInfo = { start: index, end: text.length, bracketType: '()', children: [] };
            root.children.push(current);
            index = getBrackets(text, index + 1, current, brackets);
        }
        else if (text[index] == '}') {
            if (brackets.length == 0)
                break;
            const last = brackets.pop();
            if (last.key != '{')
                break;
            root.end = index + 1;
            return index;
        }
        else if (text[index] == ')') {
            if (brackets.length == 0)
                break;
            const last = brackets.pop();
            if (last.key != '(')
                break;
            root.end = index + 1;
            return index;
        }
    }
    return index;
}

export function getDocumentSymbols(document: vscode.TextDocument): Thenable<vscode.DocumentSymbol[]> {
    return vscode.commands.executeCommand<vscode.DocumentSymbol[]>('vscode.executeDocumentSymbolProvider', document.uri);
}

export function findAllSymbols(symbol: vscode.DocumentSymbol): vscode.DocumentSymbol[] {
    const result: vscode.DocumentSymbol[] = [];
    result.push(symbol);
    for (const child of symbol.children) {
        result.push(...findAllSymbols(child));
    }
    return result;
}

export function findSymbolsBySymbolKind(symbols: vscode.DocumentSymbol[], kinds: vscode.SymbolKind[]): vscode.DocumentSymbol[] {
    const result: vscode.DocumentSymbol[] = [];
    for (const symbol of symbols) {
        if (kinds.includes(symbol.kind))
            result.push(symbol);
        result.push(...findSymbolsBySymbolKind(symbol.children, kinds));
    }
    return result;
}

export function findSymbolsByName(symbols: vscode.DocumentSymbol[], names: string[]): vscode.DocumentSymbol[] {
    const result: vscode.DocumentSymbol[] = [];
    for (const symbol of symbols) {
        if (names.indexOf(symbol.name) >= 0)
            result.push(symbol);
        result.push(...findSymbolsByName(symbol.children, names));
    }
    return result;
}

function symbolContainsPosition(symbol: vscode.DocumentSymbol, position: vscode.Position): boolean {
    return symbol.range.start.compareTo(position) <= 0 && symbol.range.end.compareTo(position) >= 0;
}

export function getSymbolStack(symbol: vscode.DocumentSymbol, position: vscode.Position): vscode.DocumentSymbol[] {
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

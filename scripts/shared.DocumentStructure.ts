import * as vscode from 'vscode';

class BracketInfo {
    readonly document: vscode.TextDocument;
    readonly start: number;
    private _end: number;
    get end() { return this._end; }
    readonly bracketType?: '()' | '{}';
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
};

const findAllSymbols = (symbols: readonly vscode.DocumentSymbol[]): readonly vscode.DocumentSymbol[] => {
    const result: vscode.DocumentSymbol[] = [];
    result.push(...symbols);
    for (const symbol of symbols) {
        result.push(...findAllSymbols(symbol.children));
    }
    return result;
};

const documentStructureUtils = {
    findAllSymbols,
    getRootBracket(document: vscode.TextDocument, token: vscode.CancellationToken): BracketInfo {
        const text = document.getText();
        const rootBracket = new BracketInfo(document, 0, null);
        getBrackets(text, 0, rootBracket, [], token);
        return rootBracket;
    },
};

export {
    BracketInfo,
    documentStructureUtils,
};

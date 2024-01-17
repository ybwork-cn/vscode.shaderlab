
import * as vscode from 'vscode';
// import { BracketInfo, getDocumentText, isType } from './shaderlab.DocumentStructure.js';

// function SemanticTokens_variable(document: vscode.TextDocument, root: vscode.DocumentSymbol, rangeIndex: BracketInfo) {
//     const text = getDocumentText(document, rangeIndex);
//     let match: RegExpExecArray;

//     let regex_para = /(\w+)\s+(\w+(?:\[\d+\])?)\s*=/g;
//     while ((match = regex_para.exec(text))) {
//         const startPosition = document.positionAt(match.index + rangeIndex.start);
//         let _exit = false;
//         for (const child of root.children) {
//             if (startPosition.compareTo(child.range.start) >= 0 && startPosition.compareTo(child.range.end) <= 0) {
//                 _exit = true;
//                 break;
//             }
//         }
//         if (_exit)
//             continue;

//         const selectionRange = new vscode.Range(
//             document.positionAt(match.index + match[0].indexOf(match[2]) + rangeIndex.start),
//             document.positionAt(match.index + match[0].indexOf(match[2]) + match[2].length + rangeIndex.start));

//         const range = new vscode.Range(
//             document.positionAt(match.index + rangeIndex.start),
//             document.positionAt(match.index + rangeIndex.start + match[0].indexOf(match[2]) + match[2].length));

//         // 防止 return x;
//         if (isType(rootShaderSymbol, range.start, match[1])) {
//             const name = /^\w+/.exec(match[2])[0];
//             let detail = match[1];

//             let arrayMatch: RegExpExecArray;
//             if (arrayMatch = /\[\d+\]/g.exec(match[2]))
//                 detail += arrayMatch[0];

//             const node = new vscode.DocumentSymbol(name, detail, vscode.SymbolKind.Variable, range, selectionRange);
//             root.children.push(node);
//         }
//     }

//     regex_para = /(\w+)\s+(\w+(?:\[\d+\])?)\s*;/g;
//     while ((match = regex_para.exec(text))) {

//         let startPosition = document.positionAt(match.index + rangeIndex.start);
//         let _exit = false;
//         for (const child of root.children) {
//             if (startPosition.compareTo(child.range.start) >= 0 && startPosition.compareTo(child.range.end) <= 0) {
//                 _exit = true;
//                 break;
//             }
//         }
//         if (_exit)
//             continue;

//         const selectionRange = new vscode.Range(
//             document.positionAt(match.index + match[0].indexOf(match[2]) + rangeIndex.start),
//             document.positionAt(match.index + match[0].indexOf(match[2]) + match[2].length + rangeIndex.start));

//         const range = new vscode.Range(
//             document.positionAt(match.index + rangeIndex.start),
//             document.positionAt(match.index + rangeIndex.start + match[0].length));

//         // 防止 return x;
//         if (isType(rootShaderSymbol, range.start, match[1])) {
//             const name = /^\w+/.exec(match[2])[0];
//             let detail = match[1];

//             let arrayMatch: RegExpExecArray;
//             if (arrayMatch = /\[\d+\]/g.exec(match[2]))
//                 detail += arrayMatch[0];

//             const node = new vscode.DocumentSymbol(name, detail, vscode.SymbolKind.Variable, range, selectionRange);
//             root.children.push(node);
//         }
//     }
// }

// function SemanticTokens_params(document: vscode.TextDocument, root: vscode.DocumentSymbol, rangeIndex: BracketInfo) {
//     const text = getDocumentText(document, rangeIndex);
//     let match: RegExpExecArray;

//     const regex_para = /(\w+)\s+(\w+)$/mg;
//     while ((match = regex_para.exec(text))) {
//         let selectionRange = new vscode.Range(
//             document.positionAt(rangeIndex.start + match.index + match[0].indexOf(match[2], match[1].length)),
//             document.positionAt(rangeIndex.start + match.index + match[0].indexOf(match[2], match[1].length) + match[2].length));

//         let range = new vscode.Range(
//             document.positionAt(match.index + rangeIndex.start),
//             document.positionAt(match.index + rangeIndex.start + match[0].length));

//         let node = new vscode.DocumentSymbol(match[2], match[1], vscode.SymbolKind.Variable, range, selectionRange);
//         root.children.push(node);
//     }
// }

// function SemanticTokens_Struct(document: vscode.TextDocument, root: vscode.DocumentSymbol, rangeIndex: BracketInfo) {
//     const text = getDocumentText(document, rangeIndex);
//     let match: RegExpExecArray;

//     const regex_field = /(\w+)\s+(\S+)\s*:\s*(\w+).*?$/mg;
//     while ((match = regex_field.exec(text))) {
//         const selectionRange = new vscode.Range(
//             document.positionAt(rangeIndex.start + match.index + match[0].indexOf(match[2])),
//             document.positionAt(rangeIndex.start + match.index + match[0].indexOf(match[2]) + match[2].match(/\w+/)[0].length));

//         const range = new vscode.Range(
//             document.positionAt(match.index + rangeIndex.start),
//             document.positionAt(match.index + rangeIndex.start + match[0].length));

//         const name = /^\w+/.exec(match[2])[0];
//         let detail = match[1];

//         let arrayMatch: RegExpExecArray;
//         if (arrayMatch = /\[\d+\]/g.exec(match[2]))
//             detail += arrayMatch[0];

//         const node = new vscode.DocumentSymbol(name, detail, vscode.SymbolKind.Variable, range, selectionRange);
//         root.children.push(node);
//     }
// }

// let rootShaderSymbol: vscode.DocumentSymbol;
function SemanticTokens_Root(document: vscode.TextDocument): vscode.DocumentSymbol[] {
    const text = document.getText();
    let match: RegExpExecArray;
    let symbols: vscode.DocumentSymbol[] = [];

    const regex_struct = /struct\s*(\w+)\s*{/g;
    while (match = regex_struct.exec(text)) {
        let selectionRange = new vscode.Range(
            document.positionAt(match.index),
            document.positionAt(match.index + match[0].length));

        let node = new vscode.DocumentSymbol(match[1], '', vscode.SymbolKind.Class, selectionRange, selectionRange);
        symbols.push(node);
    }

    const regex_function = /(\w+)\s+(\w+)\s*\(((\s*in\s+)?\s*\w+\s+\w+\s*)?(,(\s*in\s+)?\s*\w+\s+\w+\s*)*\)/g;
    while (match = regex_function.exec(text)) {
        let selectionRange = new vscode.Range(
            document.positionAt(match.index),
            document.positionAt(match.index + match[0].length));

        let node = new vscode.DocumentSymbol(match[2], match[1], vscode.SymbolKind.Method, selectionRange, selectionRange);
        symbols.push(node);
    }

    const regex_define = /\#define\s+(\w+).*$/mg;
    while (match = regex_define.exec(text)) {
        let selectionRange = new vscode.Range(
            document.positionAt(match.index),
            document.positionAt(match.index + match[0].length));

        let node = new vscode.DocumentSymbol(match[1], '', vscode.SymbolKind.Constant, selectionRange, selectionRange);
        symbols.push(node);
    }

    const regex_include = /\#include\s+"(\w+\.cginc)"/mg;
    while (match = regex_include.exec(text)) {
        let selectionRange = new vscode.Range(
            document.positionAt(match.index),
            document.positionAt(match.index + match[0].length));

        let node = new vscode.DocumentSymbol(match[1], '', vscode.SymbolKind.Module, selectionRange, selectionRange);
        symbols.push(node);
    }

    return symbols;
}

/**
 * 定义文档符号
 * Provide symbol information for the given document.
 * @param document The document in which the command was invoked.
 * @param token A cancellation token.
 * @return An array of document highlights or a thenable that resolves to such. The lack of a result can be
 * signaled by returning `undefined`, `null`, or an empty array.
 */
function provideDocumentSymbols(document: vscode.TextDocument, token: vscode.CancellationToken): vscode.DocumentSymbol[] {
    return SemanticTokens_Root(document);
}

export { provideDocumentSymbols };

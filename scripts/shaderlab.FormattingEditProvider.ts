import * as vscode from 'vscode';
import { formatCode } from './shared.CodeFormatter.js';

/**
 * Provide formatting edits for a whole document.
 * @param document The document in which the command was invoked.
 * @param options Options controlling formatting.
 * @param token A cancellation token.
 * @return A set of text edits or a thenable that resolves to such. The lack of a result can be
 * signaled by returning `undefined`, `null`, or an empty array.
 */
const provideDocumentFormattingEdits = (document: vscode.TextDocument, options: vscode.FormattingOptions, token: vscode.CancellationToken): vscode.ProviderResult<vscode.TextEdit[]> => {
    const fullRange = new vscode.Range(
        document.positionAt(0),
        document.positionAt(document.getText().length)
    );

    const newText = formatCode(document.getText(), options.tabSize);
    const edit = new vscode.TextEdit(fullRange, newText);

    return [edit];
};

// 格式化工具
const documentFormattingEditProvider = vscode.languages.registerDocumentFormattingEditProvider('shaderlab',
    { provideDocumentFormattingEdits }
);

export { documentFormattingEditProvider };

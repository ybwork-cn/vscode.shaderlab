import * as vscode from 'vscode';
import { provideDocumentFormattingEdits } from './shared.CodeFormatter.js';

// 格式化工具
const documentFormattingEditProvider = vscode.languages.registerDocumentFormattingEditProvider('hlsl',
    { provideDocumentFormattingEdits }
);

export { documentFormattingEditProvider };

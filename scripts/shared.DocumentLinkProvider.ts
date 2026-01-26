import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

// TODO: 从/Packages/xxx 路径映射到 Unity Package 目录
// TODO: 从/Library/PackageCache/xxx 路径映射到 Unity Package 目录

/**
 * 解析 #include 路径，返回实际文件 URI
 * 搜索顺序：
 * 1. 相对于当前文件
 * 2. 工作区根目录
 */
const resolveIncludePath = (document: vscode.TextDocument, includePath: string): vscode.Uri | null => {
    // 1. 相对于当前文件目录
    const docDir = path.dirname(document.uri.fsPath);
    const relativePath = path.join(docDir, includePath);
    if (fs.existsSync(relativePath)) {
        return vscode.Uri.file(relativePath);
    }

    // 2. 工作区根目录
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders) {
        for (const folder of workspaceFolders) {
            const workspacePath = path.join(folder.uri.fsPath, includePath);
            if (fs.existsSync(workspacePath)) {
                return vscode.Uri.file(workspacePath);
            }
        }
    }

    return null;
}

/**
 * 提供文档链接（#include 可点击跳转）
 */
const provideDocumentLinks = (document: vscode.TextDocument, token: vscode.CancellationToken): vscode.DocumentLink[] => {
    const links: vscode.DocumentLink[] = [];
    const text = document.getText();

    // 匹配 #include "xxx"
    // 不匹配 "//" 注释中的 include
    const regex = /(?<!\/\/.*)#include\s+"([^"]+)"/g;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
        if (token.isCancellationRequested)
            break;

        const includePath = match[1];
        const fullMatch = match[0];
        const matchStart = match.index;

        // 计算 includePath 在匹配中的位置
        const pathStart = matchStart + fullMatch.indexOf(includePath);
        const pathEnd = pathStart + includePath.length;

        const startPos = document.positionAt(pathStart);
        const endPos = document.positionAt(pathEnd);
        const range = new vscode.Range(startPos, endPos);

        // 解析路径
        const resolvedUri = resolveIncludePath(document, includePath);
        if (resolvedUri) {
            links.push(new vscode.DocumentLink(range, resolvedUri));
        }
        else {
            // 创建带提示的链接
            const link = new vscode.DocumentLink(range);
            link.tooltip = `无法找到文件: ${includePath}`;
            links.push(link);
        }
    }

    return links;
}

/**
 * 解析链接（当用户点击时调用）
 */
const resolveDocumentLink = (link: vscode.DocumentLink, token: vscode.CancellationToken): vscode.DocumentLink => {
    return link;
}

const provider: vscode.DocumentLinkProvider = {
    provideDocumentLinks,
    resolveDocumentLink,
};

export { provider };

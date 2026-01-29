import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

/**
 * 解析 Unity Package 路径
 * 尝试映射 Packages/xxx 到:
 * 1. <ProjectRoot>/Packages/xxx
 * 2. <ProjectRoot>/Library/PackageCache/xxx@ver
 */
const resolveUnityPackagePath = (projectRoot: string, includePath: string): string | null => {
    // Normalize slashes
    includePath = includePath.replace(/\\/g, '/');

    if (!includePath.startsWith("Packages/")) {
        return null;
    }

    // Split: Packages / packageName / ...rest
    const parts = includePath.split('/');
    if (parts.length < 3) {
        return null;
    }

    const packageName = parts[1];
    const restPath = parts.slice(2).join(path.sep); // Use system separator for fs operations

    // 1. Check embedded packages: <ProjectRoot>/Packages/<packageName>
    const embeddedPath = path.join(projectRoot, 'Packages', packageName, restPath);
    if (fs.existsSync(embeddedPath)) {
        return embeddedPath;
    }

    // 2. Check cache: <ProjectRoot>/Library/PackageCache/<packageName>@<version>
    const packageCacheDir = path.join(projectRoot, 'Library', 'PackageCache');
    if (fs.existsSync(packageCacheDir)) {
        try {
            const entries = fs.readdirSync(packageCacheDir);
            // Match folder name starting with "packageName@"
            // e.g. "com.unity.render-pipelines.universal@10.0.0"
            const matchEntry = entries.find(entry => entry.startsWith(packageName + '@'));
            if (matchEntry) {
                const cachedPath = path.join(packageCacheDir, matchEntry, restPath);
                if (fs.existsSync(cachedPath)) {
                    return cachedPath;
                }
            }
        } catch (e) {
            console.error(e);
        }
    }

    return null;
}

/**
 * 解析 #include 路径，返回实际文件 URI
 * 搜索顺序：
 * 1. 相对于当前文件
 * 2. 工作区根目录
 * 3. Unity Packages
 */
const resolveIncludePath = (document: vscode.TextDocument, includePath: string): vscode.Uri | null => {
    // 1. 相对于当前文件目录
    const docDir = path.dirname(document.uri.fsPath);
    const relativePath = path.join(docDir, includePath);
    if (fs.existsSync(relativePath)) {
        return vscode.Uri.file(relativePath);
    }

    // 遍历所有工作区文件夹
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders) {
        for (const folder of workspaceFolders) {
            const folderPath = folder.uri.fsPath;

            // 2. 工作区根目录
            const workspacePath = path.join(folderPath, includePath);
            if (fs.existsSync(workspacePath)) {
                return vscode.Uri.file(workspacePath);
            }

            // 3. Unity Packages 路径映射
            if (includePath.startsWith("Packages/")) {
                const unityPath = resolveUnityPackagePath(folderPath, includePath);
                if (unityPath) {
                    return vscode.Uri.file(unityPath);
                }
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

    // 遍历每一行，查找 #include 语句
    for (let i = 0; i < document.lineCount; i++) {
        if (token.isCancellationRequested) {
            break;
        }

        const line = document.lineAt(i);
        let text = line.text;

        // 排除 // 注释
        const commentIndex = text.indexOf('//');
        if (commentIndex !== -1) {
            text = text.substring(0, commentIndex);
        }

        const regex = /#include\s+"([^"]+)"/g;
        let match: RegExpExecArray | null;
        while ((match = regex.exec(text)) !== null) {
            const includePath = match[1];
            const fullMatch = match[0];

            // 计算 includePath 在行内的位置
            const pathStart = match.index + fullMatch.indexOf(includePath);
            const pathEnd = pathStart + includePath.length;

            const range = new vscode.Range(i, pathStart, i, pathEnd);

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

/**
 * 注册 DocumentLinkProvider
 * @param context
 */
const registerDocumentLinkProvider = (selector: vscode.DocumentSelector, context: vscode.ExtensionContext) => {
    const shaderlabDocumentLinkProvider = vscode.languages.registerDocumentLinkProvider(
        selector,
        provider
    );

    context.subscriptions.push(shaderlabDocumentLinkProvider);
}

export { registerDocumentLinkProvider };

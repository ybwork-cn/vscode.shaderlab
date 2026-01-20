import * as vscode from 'vscode';
import { symbolCache } from './shared.SymbolCache.js';
import {
    HLSL_ALL_FUNCTIONS,
    findFunctionByName,
    createFunctionHover,
    HLSL_ALL_SEMANTICS,
} from './hlsl.Builtins.js';

/**
 * 从符号定义位置提取 /// 注释
 * 向上查找连续的 /// 注释行
 */
const extractDocComment = (document: vscode.TextDocument, symbolStartLine: number): string | null => {
    const comments: string[] = [];
    let lineNum = symbolStartLine - 1;

    // 向上查找连续的 /// 注释行
    while (lineNum >= 0) {
        const lineText = document.lineAt(lineNum).text.trim();

        // 检查是否是 /// 注释
        if (lineText.startsWith('///')) {
            // 提取注释内容（去掉 /// 前缀）
            let commentText = lineText.substring(3).trim();
            comments.unshift(commentText);
            lineNum--;
        }
        // 检查是否是空行（允许注释块之间有空行）
        else if (lineText === '') {
            // 检查上一行是否还有 /// 注释
            if (lineNum > 0 && document.lineAt(lineNum - 1).text.trim().startsWith('///')) {
                lineNum--;
            } else {
                break;
            }
        }
        // 检查是否是 /** */ 风格的注释
        else if (lineText.endsWith('*/')) {
            // 查找 /** 开始
            let blockComment: string[] = [];
            while (lineNum >= 0) {
                const blockLine = document.lineAt(lineNum).text;
                blockComment.unshift(blockLine);
                if (blockLine.includes('/**') || blockLine.includes('/*')) {
                    break;
                }
                lineNum--;
            }
            // 解析块注释
            const fullComment = blockComment.join('\n');
            const cleanedComment = fullComment
                .replace(/\/\*\*?/g, '')
                .replace(/\*\//g, '')
                .split('\n')
                .map(line => line.trim().replace(/^\*\s?/, ''))
                .filter(line => line.length > 0)
                .join('\n');
            if (cleanedComment) {
                comments.unshift(cleanedComment);
            }
            break;
        }
        else {
            break;
        }
    }

    return comments.length > 0 ? comments.join('\n') : null;
}

/**
 * 获取符号定义的完整文本（用于 hover 显示）
 */
const getSymbolDefinitionText = (
    document: vscode.TextDocument,
    symbol: vscode.DocumentSymbol
): string => {
    const startLine = symbol.range.start.line;
    const lineText = document.lineAt(startLine).text;

    switch (symbol.kind) {
        case vscode.SymbolKind.Function:
        case vscode.SymbolKind.Method:
            // 函数：获取函数签名（到 { 之前）
            let funcText = '';
            let line = startLine;
            while (line < document.lineCount) {
                const text = document.lineAt(line).text;
                funcText += text + '\n';
                if (text.includes('{')) {
                    // 截取到 { 之前
                    funcText = funcText.split('{')[0].trim();
                    break;
                }
                line++;
            }
            return funcText || lineText;

        case vscode.SymbolKind.Struct:
            // 结构体：只显示 struct Name
            return `struct ${symbol.name}`;

        case vscode.SymbolKind.Variable:
        case vscode.SymbolKind.Field:
            // 变量/字段：显示类型和名称
            if (symbol.detail) {
                return `${symbol.detail} ${symbol.name};`;
            }
            // 尝试从行文本提取
            const varMatch = lineText.match(/(\w+(?:\s*<[^>]+>)?)\s+(\w+)/);
            if (varMatch) {
                return `${varMatch[1]} ${varMatch[2]};`;
            }
            return lineText.trim();

        case vscode.SymbolKind.Constant:
            // 宏定义
            return lineText.trim();

        default:
            return lineText.trim();
    }
}

/**
 * 检查位置是否在语义位置（: 后面的语义名称）
 */
const getSemanticAtPosition = (document: vscode.TextDocument, position: vscode.Position): string | null => {
    const line = document.lineAt(position.line).text;
    const wordRange = document.getWordRangeAtPosition(position);
    if (!wordRange) return null;

    const word = document.getText(wordRange);

    // 检查这个词前面是否有冒号（语义格式：: SEMANTIC）
    const textBefore = line.substring(0, wordRange.start.character);
    if (textBefore.match(/:\s*$/)) {
        // 检查是否是已知语义
        const semantic = HLSL_ALL_SEMANTICS.find(s =>
            s.name.toLowerCase() === word.toLowerCase() ||
            s.name.replace(/\d+$/, '').toLowerCase() === word.replace(/\d+$/, '').toLowerCase()
        );
        if (semantic) {
            return word;
        }
    }

    return null;
}

/**
 * 在文件链中查找符号定义和注释
 */
const findSymbolWithComment = async (
    document: vscode.TextDocument,
    word: string,
    token: vscode.CancellationToken
): Promise<{ symbol: vscode.DocumentSymbol; document: vscode.TextDocument; comment: string | null } | null> => {
    const cached = await symbolCache.getCachedSymbols(document);
    const found = await cached.findSymbolRecursionAsync(word, token)
    if (found) {
        const comment = extractDocComment(found.document, found.symbol.range.start.line);
        return { symbol: found.symbol, document, comment };
    }

    return null;
}

/**
 * HLSL Hover Provider
 */
class HlslHoverProvider implements vscode.HoverProvider {
    async provideHover(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken
    ): Promise<vscode.Hover | null> {
        // 1. 如果在 #include 路径上，显示文件路径信息
        const cached = await symbolCache.getCachedSymbols(document);
        for (const include of cached.includes) {
            if (include.range.contains(position)) {
                const hoverMessage = new vscode.MarkdownString();
                hoverMessage.appendMarkdown(`**Include File**\n\n`);

                if (include.target) {
                    hoverMessage.appendMarkdown(`\n📁 ${include.target.fsPath}`);
                } else {
                    hoverMessage.appendMarkdown(`\n⚠️ ${include.tooltip}`);
                }

                return new vscode.Hover(hoverMessage);
            }
        }

        // 获取光标下的单词
        const wordRange = document.getWordRangeAtPosition(position);
        if (!wordRange) {
            return null;
        }
        const word = document.getText(wordRange);
        if (!word) {
            return null;
        }

        // 2. 检查是否是语义
        const semantic = getSemanticAtPosition(document, position);
        if (semantic) {
            const semanticDef = HLSL_ALL_SEMANTICS.find(s =>
                s.name.toLowerCase() === semantic.toLowerCase() ||
                s.name.replace(/\d+$/, '').toLowerCase() === semantic.replace(/\d+$/, '').toLowerCase()
            );
            if (semanticDef) {
                const hoverMessage = new vscode.MarkdownString();
                hoverMessage.appendMarkdown(`**Semantic**: \`${semanticDef.name}\`\n\n`);
                hoverMessage.appendMarkdown(`${semanticDef.description}\n\n`);
                hoverMessage.appendMarkdown(`*Stage*: ${semanticDef.stage}`);
                return new vscode.Hover(hoverMessage);
            }
        }

        // 3. 检查是否是内置函数
        const builtinFunc = findFunctionByName(word);
        if (builtinFunc) {
            return createFunctionHover(builtinFunc);
        }

        // 4. 在文档符号中查找定义（包括 #include 链）
        const symbolInfo = await findSymbolWithComment(document, word, token);
        if (symbolInfo) {
            const { symbol, document: symbolDoc, comment } = symbolInfo;
            const hoverMessage = new vscode.MarkdownString();

            // 获取定义文本
            const defText = getSymbolDefinitionText(symbolDoc, symbol);
            hoverMessage.appendCodeblock(defText, 'hlsl');

            // 添加注释
            if (comment) {
                hoverMessage.appendMarkdown(`\n---\n${comment}`);
            }

            // 如果定义来自其他文件，显示文件路径
            if (symbolDoc.uri.fsPath !== document.uri.fsPath) {
                const relativePath = vscode.workspace.asRelativePath(symbolDoc.uri);
                hoverMessage.appendMarkdown(`\n\n*Defined in: ${relativePath}*`);
            }

            return new vscode.Hover(hoverMessage);
        }

        // 5. 尝试在工作区中查找
        const workspaceResult = await symbolCache.findSymbolInWorkspace(word);
        if (workspaceResult) {
            const comment = extractDocComment(workspaceResult.document, workspaceResult.symbol.range.start.line);

            const hoverMessage = new vscode.MarkdownString();
            const defText = getSymbolDefinitionText(workspaceResult.document, workspaceResult.symbol);
            hoverMessage.appendCodeblock(defText, 'hlsl');

            if (comment) {
                hoverMessage.appendMarkdown(`\n---\n${comment}`);
            }

            const relativePath = vscode.workspace.asRelativePath(workspaceResult.document.uri);
            hoverMessage.appendMarkdown(`\n\n*Defined in: ${relativePath}*`);

            return new vscode.Hover(hoverMessage);
        }

        return null;
    }
}

/**
 * 注册 HLSL Hover Provider
 * @param context 
 */
const registerHoverProvider = (context: vscode.ExtensionContext) => {
    const hlslHoverProvider = vscode.languages.registerHoverProvider(
        'hlsl',
        new HlslHoverProvider()
    );

    context.subscriptions.push(hlslHoverProvider);
}

export { registerHoverProvider }

import * as vscode from 'vscode';
import { symbolCache } from './shared.SymbolCache.js';
import { parseIncludes, findDefinitionInFileChain } from './hlsl.DefinitionProvider.js';
import { resolveIncludePath } from './hlsl.DocumentLinkProvider.js';
import {
    HLSL_ALL_FUNCTIONS,
    findFunctionByName,
    createFunctionHover,
    HLSL_ALL_SEMANTICS,
    HLSL_ALL_KEYWORDS,
} from './shared.HlslBuiltins.js';

/**
 * 从符号定义位置提取 // 注释
 * 向上查找连续的 // 注释行
 */
function extractDocComment(document: vscode.TextDocument, symbolStartLine: number): string | null {
    const comments: string[] = [];
    let lineNum = symbolStartLine - 1;

    // 向上查找连续的 // 注释行（不允许有空行，遇到空行结束）
    while (lineNum >= 0) {
        const rawLine = document.lineAt(lineNum).text;
        const lineText = rawLine.trim();

        // 单行注释 //
        if (lineText.startsWith('//')) {
            // 提取注释内容（去掉 // 前缀及前导空白）
            const commentText = rawLine.replace(/^\s*\/\/\s?/, '').trim();
            comments.unshift(commentText);
            lineNum--;
            continue;
        }

        // 遇到空行则结束（不允许空行间隔）
        if (lineText === '') {
            break;
        }

        // 块注释 /** ... */（必须直接相邻）
        if (lineText.endsWith('*/')) {
            const blockCommentLines: string[] = [];
            while (lineNum >= 0) {
                const blockLineRaw = document.lineAt(lineNum).text;
                blockCommentLines.unshift(blockLineRaw);
                if (blockLineRaw.includes('/**') || blockLineRaw.includes('/*')) {
                    break;
                }
                lineNum--;
            }
            const fullComment = blockCommentLines.join('\n');
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

        // 其它非注释行，结束
        break;
    }

    return comments.length > 0 ? comments.join('\n') : null;
}

/**
 * 获取符号定义的完整文本（用于 hover 显示）
 */
function getSymbolDefinitionText(
    document: vscode.TextDocument,
    symbol: vscode.DocumentSymbol
): string {
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
 * 检查位置是否在 #include 指令上
 */
function isOnIncludePath(document: vscode.TextDocument, position: vscode.Position): boolean {
    const line = document.lineAt(position.line).text;
    return /^\s*#include\s+["<]/.test(line);
}

/**
 * 检查位置是否在语义位置（: 后面的语义名称）
 */
function getSemanticAtPosition(document: vscode.TextDocument, position: vscode.Position): string | null {
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
async function findSymbolWithComment(
    document: vscode.TextDocument,
    word: string,
    visited: Set<string> = new Set()
): Promise<{ symbol: vscode.DocumentSymbol; document: vscode.TextDocument; comment: string | null } | null> {
    const filePath = document.uri.fsPath;
    if (visited.has(filePath)) {
        return null;
    }
    visited.add(filePath);

    // 在当前文件中查找
    const symbols = await symbolCache.getSymbols(document);
    const found = symbolCache.findSymbolByName(symbols, word);
    if (found) {
        const comment = extractDocComment(document, found.range.start.line);
        return { symbol: found, document, comment };
    }

    // 在 #include 文件中查找
    const includes = parseIncludes(document);
    for (const includePath of includes) {
        const resolvedUri = resolveIncludePath(document, includePath);
        if (resolvedUri) {
            try {
                const includeDoc = await vscode.workspace.openTextDocument(resolvedUri);
                const result = await findSymbolWithComment(includeDoc, word, visited);
                if (result) {
                    return result;
                }
            } catch (e) {
                // 忽略无法打开的文件
            }
        }
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
        if (isOnIncludePath(document, position)) {
            const line = document.lineAt(position.line).text;
            const match = line.match(/#include\s+["<]([^"'>]+)["'>]/);
            if (match) {
                const includePath = match[1];
                const resolvedUri = resolveIncludePath(document, includePath);
                
                const hoverMessage = new vscode.MarkdownString();
                hoverMessage.appendMarkdown(`**Include File**\n\n`);
                hoverMessage.appendCodeblock(`#include "${includePath}"`, 'hlsl');
                
                if (resolvedUri) {
                    hoverMessage.appendMarkdown(`\n📁 ${resolvedUri.fsPath}`);
                } else {
                    hoverMessage.appendMarkdown(`\n⚠️ 无法解析文件路径`);
                }
                
                return new vscode.Hover(hoverMessage);
            }
            return null;
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

        // 过滤所有 isHlslType
        if (HLSL_ALL_KEYWORDS.includes(word)) {
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
        const symbolInfo = await findSymbolWithComment(document, word);
        if (symbolInfo) {
            const { symbol, document: symbolDoc, comment } = symbolInfo;
            const hoverMessage = new vscode.MarkdownString();
            
            // 添加标题行 (优化显示)
            let header = '';
            switch (symbol.kind) {
                case vscode.SymbolKind.Function:
                case vscode.SymbolKind.Method:
                    header = `$(symbol-function) **Function** \`${symbol.name}\``;
                    break;
                case vscode.SymbolKind.Struct:
                    header = `$(symbol-structure) **Struct** \`${symbol.name}\``;
                    break;
                case vscode.SymbolKind.Variable:
                case vscode.SymbolKind.Field:
                    header = `$(symbol-variable) **Variable** \`${symbol.name}\``;
                    break;
                case vscode.SymbolKind.Constant:
                    header = `$(symbol-constant) **Macro** \`${symbol.name}\``;
                    break;
                default:
                    header = `$(symbol-misc) **${symbol.name}**`;
            }
            hoverMessage.appendMarkdown(`${header}\n\n`);

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
                hoverMessage.appendMarkdown(`\n\n*Defined in: [${relativePath}](${symbolDoc.uri})*`);
            }
            
            return new vscode.Hover(hoverMessage);
        }

        // 5. 尝试在工作区中查找
        const workspaceResult = await symbolCache.findSymbolInWorkspace(word);
        if (workspaceResult) {
            const symbolDoc = await vscode.workspace.openTextDocument(workspaceResult.uri);
            const comment = extractDocComment(symbolDoc, workspaceResult.symbol.range.start.line);
            
            const hoverMessage = new vscode.MarkdownString();

             // 添加标题行 (优化显示)
             let header = '';
             switch (workspaceResult.symbol.kind) {
                 case vscode.SymbolKind.Function:
                 case vscode.SymbolKind.Method:
                     header = `$(symbol-function) **Function** \`${workspaceResult.symbol.name}\``;
                     break;
                 case vscode.SymbolKind.Struct:
                     header = `$(symbol-structure) **Struct** \`${workspaceResult.symbol.name}\``;
                     break;
                 case vscode.SymbolKind.Variable:
                 case vscode.SymbolKind.Field:
                     header = `$(symbol-variable) **Variable** \`${workspaceResult.symbol.name}\``;
                     break;
                 case vscode.SymbolKind.Constant:
                     header = `$(symbol-constant) **Macro** \`${workspaceResult.symbol.name}\``;
                     break;
                 default:
                     header = `$(symbol-misc) **${workspaceResult.symbol.name}**`;
             }
             hoverMessage.appendMarkdown(`${header}\n\n`);

            const defText = getSymbolDefinitionText(symbolDoc, workspaceResult.symbol);
            hoverMessage.appendCodeblock(defText, 'hlsl');
            
            if (comment) {
                hoverMessage.appendMarkdown(`\n---\n${comment}`);
            }
            
            const relativePath = vscode.workspace.asRelativePath(workspaceResult.uri);
            hoverMessage.appendMarkdown(`\n\n*Defined in: [${relativePath}](${workspaceResult.uri})*`);
            
            return new vscode.Hover(hoverMessage);
        }

        return null;
    }
}

// 注册 HLSL Hover Provider
const hlslHoverProvider = vscode.languages.registerHoverProvider(
    'hlsl',
    new HlslHoverProvider()
);

export { hlslHoverProvider, HlslHoverProvider, extractDocComment };


import * as vscode from 'vscode';
import { symbolCache } from './shared.SymbolCache.js';
import { parseIncludes } from './hlsl.DefinitionProvider.js';
import { resolveIncludePath } from './hlsl.DocumentLinkProvider.js';
import { HLSL_ALL_FUNCTIONS, findFunctionByName } from './shared.HlslBuiltins.js';

/**
 * Helper to find all function symbols (including overloads) in the file or its includes
 */
async function findAllFunctionSymbols(
    document: vscode.TextDocument,
    funcName: string,
    visited: Set<string> = new Set()
): Promise<Array<{ symbol: vscode.DocumentSymbol; uri: vscode.Uri }>> {
    const results: Array<{ symbol: vscode.DocumentSymbol; uri: vscode.Uri }> = [];
    const filePath = document.uri.fsPath;
    
    if (visited.has(filePath)) {
        return results;
    }
    visited.add(filePath);

    // Check current file - find ALL matching symbols
    const symbols = await symbolCache.getSymbols(document);
    const found = symbolCache.findAllSymbolsByName(symbols, funcName);
    for (const sym of found) {
        if (sym.kind === vscode.SymbolKind.Function || sym.kind === vscode.SymbolKind.Method) {
            results.push({ symbol: sym, uri: document.uri });
        }
    }

    // Check includes
    const includes = parseIncludes(document);
    for (const includePath of includes) {
        const resolvedUri = resolveIncludePath(document, includePath);
        if (resolvedUri) {
            try {
                const includeDoc = await vscode.workspace.openTextDocument(resolvedUri);
                const includeResults = await findAllFunctionSymbols(includeDoc, funcName, visited);
                results.push(...includeResults);
            } catch (e) {
                // Ignore
            }
        }
    }
    return results;
}

export class HlslSignatureHelpProvider implements vscode.SignatureHelpProvider {
    async provideSignatureHelp(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.SignatureHelpContext
    ): Promise<vscode.SignatureHelp | null> {
        
        // Backward walk to find the function call
        // We need to count balanced parentheses to find the start of the argument list
        let offset = document.offsetAt(position);
        const text = document.getText();
        
        let depth = 0;
        let paramIndex = 0;
        let funcEndIndex = -1;

        // Scan backwards
        for (let i = offset - 1; i >= 0; i--) {
            const char = text[i];
            
            if (char === ')') {
                depth++;
            } else if (char === '(') {
                if (depth > 0) {
                    depth--;
                } else {
                    // Found the opening parenthesis of the call
                    funcEndIndex = i;
                    break;
                }
            } else if (char === ',' && depth === 0) {
                paramIndex++;
            }
        }

        if (funcEndIndex === -1) {
            return null;
        }

        // Extract function name before the '('
        const prefix = text.substring(0, funcEndIndex).trimEnd();
        const funcNameMatch = prefix.match(/[\w\d_]+$/);
        if (!funcNameMatch) {
            return null;
        }
        const funcName = funcNameMatch[0];

        const help = new vscode.SignatureHelp();
        help.activeParameter = paramIndex;
        help.activeSignature = 0;

        // 1. Check Built-in Functions
        const builtin = findFunctionByName(funcName);
        if (builtin) {
            const sig = new vscode.SignatureInformation(
                builtin.signature || builtin.name, 
                new vscode.MarkdownString(builtin.description)
            );
            
            if (builtin.signature) {
                // Simple parsing of parameters from string signature
                const paramContent = builtin.signature.substring(builtin.signature.indexOf('(') + 1, builtin.signature.lastIndexOf(')'));
                if (paramContent) {
                    const params = paramContent.split(',').map(p => p.trim());
                    sig.parameters = params.map(p => new vscode.ParameterInformation(p));
                }
            }
            
            help.signatures.push(sig);
            return help;
        }

        // 2. Check User Functions (Local & Includes) - supports overloads (include source uri)
        const userFuncs = await findAllFunctionSymbols(document, funcName);
        if (userFuncs.length > 0) {
            for (const entry of userFuncs) {
                const userFunc = entry.symbol;
                const sourceUri = entry.uri;

                // Collect parameter symbols
                const params = (userFunc.children || []).filter(c => c.kind === vscode.SymbolKind.Variable);
                const paramLabels = params.map(p => p.name || (p.detail || 'param')).join(', ');

                // Build a distinct label: prefer detail if it looks like a signature, otherwise synthesize one
                const label = (typeof userFunc.detail === 'string' && userFunc.detail.includes('('))
                    ? userFunc.detail
                    : `${userFunc.name}(${paramLabels})`;

                // Build documentation with code block and defined-in path
                const doc = new vscode.MarkdownString();
                doc.appendCodeblock(label, 'hlsl');
                try {
                    doc.appendMarkdown(`\n\n*Defined in: ${vscode.workspace.asRelativePath(sourceUri)}*`);
                } catch (e) {
                    // ignore if path formatting fails
                }

                const sig = new vscode.SignatureInformation(label, doc);

                // Parameters: use parameter name as label, detail as documentation
                sig.parameters = params.map(p => new vscode.ParameterInformation(
                    p.name || (p.detail || ''),
                    p.detail || ''
                ));

                help.signatures.push(sig);
            }

            // Deduplicate signatures by label
            const uniq = new Map<string, vscode.SignatureInformation>();
            for (const s of help.signatures) {
                const key = typeof s.label === 'string' ? s.label : String(s.label);
                if (!uniq.has(key)) uniq.set(key, s);
            }
            help.signatures = Array.from(uniq.values());

            // Choose best signature based on current parameter index (prefer one with enough parameters)
            const bestIdx = help.signatures.findIndex(s => (s.parameters?.length ?? 0) > paramIndex);
            help.activeSignature = bestIdx >= 0 ? bestIdx : 0;
            help.activeParameter = paramIndex;

            return help;
        }

        return null;
    }
}

import * as vscode from 'vscode';
import { provider } from "./shared.DocumentLinkProvider";

/**
 * 注册 DocumentLinkProvider
 * @param context
 */
const registerDocumentLinkProvider = (context: vscode.ExtensionContext) => {
    const shaderlabDocumentLinkProvider = vscode.languages.registerDocumentLinkProvider(
        'shaderlab',
        provider
    );

    context.subscriptions.push(shaderlabDocumentLinkProvider);
}

export { registerDocumentLinkProvider };

import { createSourceFile, forEachChild, isVariableDeclaration, isCallExpression, isPropertyAccessExpression, isIdentifier, ScriptTarget } from 'typescript';

export const getContextFromContent = (fileContent: string): string[] => {
    const sourceFile = createSourceFile('tempFile.ts', fileContent, ScriptTarget.Latest, true);

    const contextNames: string[] = [];

    // Recursive function to walk through the AST
    const visitNode = (node: any) => {
        try {
            if (isVariableDeclaration(node) && node.initializer && isCallExpression(node.initializer)) {
                let functionName = '';
                let objectName = '';

                if (isPropertyAccessExpression(node.initializer.expression)) {
                    functionName = node.initializer.expression.name?.text || '';
                    objectName = node.initializer.expression.expression?.getText() || '';
                } else if (isIdentifier(node.initializer.expression)) {
                    functionName = node.initializer.expression.text;
                }

                if (
                    functionName === 'createContext' &&
                    (objectName === 'Taon' || objectName === '')
                ) {
                    if (node.name && isIdentifier(node.name)) {
                        contextNames.push(node.name.text);
                    }
                }
            }

            forEachChild(node, visitNode);
        } catch (error) {
            console.error('Error processing node:', error);
        }
    };

    try {
        forEachChild(sourceFile, visitNode);
    } catch (error) {
        console.error('Error traversing AST:', error);
    }

    return contextNames;
};

// Usage Example:
const fileContent = `
import {taon} from 'taon';
const TaonPortsContext = createContext(() => ({ }));

var AppContext = Taon.createContext(() => ({ }));

var TempContext = Taon.createContext(() => ({  }));
`;
const contexts = getContextFromContent(fileContent);
console.log(contexts);

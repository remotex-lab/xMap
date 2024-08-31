/**
 * Import will remove at compile time
 */

import type { HighlightSchemeInterface, HighlightNodeSegmentInterface } from '@components/interfaces/highlighter.interface';

/**
 * Imports
 */

import * as ts from 'typescript';
import { SyntaxKind } from 'typescript';

/**
 * An enum containing ANSI escape sequences for various colors.
 *
 * This enum is primarily intended for terminal output and won't work directly in JavaScript for web development.
 * It defines color codes for various colors and a reset code to return to
 * the default text color.
 *
 * @example
 * ```typescript
 * console.log(`${Colors.red}This the text will be red in the terminal.${Colors.reset}`);
 * ```
 *
 * This functionality is limited to terminal environments.
 * Consider alternative methods
 * for color highlighting in web development contexts, such as CSS classes.
 */

export const enum Colors {
    reset = '\x1b[0m',
    gray = '\x1b[38;5;243m',
    darkGray = '\x1b[38;5;238m',
    lightCoral = '\x1b[38;5;203m',
    lightOrange = '\x1b[38;5;215m',
    oliveGreen = '\x1b[38;5;149m',
    burntOrange = '\x1b[38;5;208m',
    lightGoldenrodYellow = '\x1b[38;5;221m',
    lightYellow = '\x1b[38;5;230m',
    canaryYellow = '\x1b[38;5;227m',
    deepOrange = '\x1b[38;5;166m',
    lightGray = '\x1b[38;5;252m',
    brightPink = '\x1b[38;5;197m'
}

/**
 * Default color scheme for semantic highlighting.
 * This scheme uses red color for all code elements.
 *
 * @example
 * const scheme = defaultScheme;
 * console.log(scheme.typeColor); // Outputs: the red color code
 */


const defaultScheme: HighlightSchemeInterface = {
    enumColor: Colors.burntOrange,
    typeColor: Colors.lightGoldenrodYellow,
    classColor: Colors.lightOrange,
    stringColor: Colors.oliveGreen,
    keywordColor: Colors.lightCoral,
    commentColor: Colors.darkGray,
    functionColor: Colors.lightOrange,
    variableColor: Colors.burntOrange,
    interfaceColor: Colors.lightGoldenrodYellow,
    parameterColor: Colors.deepOrange,
    getAccessorColor: Colors.lightYellow,
    numericLiteralColor: Colors.lightGray,
    methodSignatureColor: Colors.burntOrange,
    regularExpressionColor: Colors.oliveGreen,
    propertyAssignmentColor: Colors.canaryYellow,
    propertyAccessExpressionColor: Colors.lightYellow,
    expressionWithTypeArgumentsColor: Colors.lightOrange
};

/**
 * Class responsible for applying semantic highlighting to a source code string based on a given color scheme.
 *
 * @class
 *
 * @param sourceFile - The TypeScript AST node representing the source file.
 * @param code - The source code string to be highlighted.
 * @param schema - The color scheme used for highlighting different elements in the code.
 *
 * const highlighter = new CodeHighlighter(sourceFile, code, schema);
 */

export class CodeHighlighter {

    /**
     * A Map of segments where the key is a combination of start and end positions,
     * and the value is an object containing the color and reset code.
     * This structure ensures unique segments and allows for fast lookups and updates.
     *
     * @example
     * this.segments = new Map([
     *   ['0-10', { start: 1, end: 11, color: '\x1b[31m', reset: '\x1b[0m' }],
     *   ['11-20', { start: 12, end: 20, color: '\x1b[32m', reset: '\x1b[0m' }]
     * ]);
     */

    private segments: Map<string, HighlightNodeSegmentInterface> = new Map();

    /**
     * Creates an instance of the CodeHighlighter class.
     *
     * @param sourceFile - The TypeScript AST node representing the source file.
     * @param code - The source code string to be highlighted.
     * @param schema - The color scheme used for highlighting different elements in the code.
     */

    constructor(private sourceFile: ts.Node, private code: string, private schema: HighlightSchemeInterface) {
    }

    /**
     * Parses a TypeScript AST node and processes its comments to identify segments that need highlighting.
     *
     * @param node - The TypeScript AST node to be parsed.
     */

    parseNode(node: ts.Node): void {
        this.processComments(node);
        this.processKeywords(node);
        this.processNode(node);
    }

    /**
     * Generates a string with highlighted code segments based on the provided color scheme.
     *
     * This method processes the stored segments, applies the appropriate colors to each segment,
     * and returns the resulting highlighted code as a single string.
     *
     * @returns The highlighted code as a string, with ANSI color codes applied to the segments.
     */

    highlight(): string {
        let previousSegmentEnd = 0;
        let parent: HighlightNodeSegmentInterface | undefined;

        const result: Array<string> = [];
        const segments = Array.from(
            this.segments.values()
        ).sort((a, b) => a.start - b.start || a.end - b.end);

        segments.forEach((segment) => {
            if (parent && segment.start < parent.end) {
                const lastSegment = result.pop();
                if (!lastSegment) return;

                const source = this.getSegmentSource(segment.start, segment.end);
                const combinedSource = `${ segment.color }${ source }${ parent.color }`;
                result.push(lastSegment.replace(source, combinedSource));

                return;
            }

            result.push(this.getSegmentSource(previousSegmentEnd, segment.start));
            result.push(`${ segment.color }${ this.getSegmentSource(segment.start, segment.end) }${ segment.reset }`);
            previousSegmentEnd = segment.end;
            parent = segment;
        });

        return result.join('') + this.getSegmentSource(previousSegmentEnd);
    }

    /**
     * Extracts a substring from the code based on the specified start and end positions.
     *
     * This method is used to retrieve the source code segment that corresponds to the
     * given start and end positions. It is primarily used for highlighting specific
     * segments of the code.
     *
     * @param start - The starting index of the segment to be extracted.
     * @param end - The ending index of the segment to be extracted.
     * @returns The extracted substring from the code.
     */

    private getSegmentSource(start: number, end?: number): string {
        return this.code.slice(start, end);
    }

    /**
     * Adds a new segment to the list of segments to be highlighted.
     * The segment is defined by its start and end positions, the color to apply, and an optional reset code.
     *
     * @param start - The starting index of the segment in the code string.
     * @param end - The ending index of the segment in the code string.
     * @param color - The color code to apply to the segment.
     * @param reset - The color reset code to apply after the segment, Defaults to the reset code defined in `Colors.reset`.
     */

    private addSegment(start: number, end: number, color: string, reset: string = Colors.reset) {
        const key = `${ start }-${ end }`;
        this.segments.set(key, { start, end, color, reset });
    }

    /**
     * Processes comments within a TypeScript AST node and adds segments for highlighting.
     * Extracts trailing and leading comments from the node and adds them as segments using the color defined in `this.colorSchema.comments`.
     *
     * @param node - The TypeScript AST node whose comments are to be processed.
     */

    private processComments(node: ts.Node): void {
        const comments = [
            ...ts.getTrailingCommentRanges(this.sourceFile.getFullText(), node.getFullStart()) || [],
            ...ts.getLeadingCommentRanges(this.sourceFile.getFullText(), node.getFullStart()) || []
        ];

        comments.forEach(comment => this.addSegment(comment.pos, comment.end, this.schema.commentColor));
    }

    /**
     * Processes the keywords within a TypeScript AST node and adds them as segments for highlighting.
     *
     * This method identifies potential keyword tokens within the provided node and adds them to the
     * list of segments with the color defined in `this.schema.keywordColor`.
     * The method considers the current node, its first token, and its last token to determine if they should be highlighted
     * as keywords.
     *
     * The method checks if the node's kind falls within the range of keyword kinds defined by TypeScript.
     * If the node or any of its tokens are identified as keywords, a segment is added to `this.segments`
     * with the start and end positions of the node and the specified color for keywords.
     *
     * @param  node - The TypeScript AST node to be processed for keywords.
     */

    private processKeywords(node: ts.Node): void {
        if ([
            SyntaxKind.NullKeyword,
            SyntaxKind.VoidKeyword,
            SyntaxKind.StringKeyword,
            SyntaxKind.NumberKeyword,
            SyntaxKind.BooleanKeyword,
            SyntaxKind.UndefinedKeyword
        ].includes(node.kind)) {
            return this.addSegment(node.getStart(), node.getEnd(), this.schema.typeColor);
        }

        if (node && node.kind >= ts.SyntaxKind.FirstKeyword && node.kind <= ts.SyntaxKind.LastKeyword) {
            this.addSegment(node.getStart(), node.getEnd(), this.schema.keywordColor);
        }
    }

    /**
     * Processes identifiers within a TypeScript AST node and adds them as segments for highlighting
     * based on the node's parent type.
     *
     * This method determines the appropriate color for an identifier based on its parent node's kind.
     * If the parent node matches one of the specified kinds, the identifier is highlighted with a cyan color.
     * Supported parent kinds include various declarations, expressions, and signatures.
     *
     * @param node - The TypeScript AST node representing the identifier to be processed.
     */

    private processIdentifier(node: ts.Node): void {
        const end = node.getEnd();
        const start = node.getStart();

        switch (node.parent.kind) {
            case ts.SyntaxKind.EnumMember:
                return this.addSegment(start, end, this.schema.enumColor);
            case ts.SyntaxKind.CallExpression:
            case ts.SyntaxKind.EnumDeclaration:
            case ts.SyntaxKind.PropertySignature:
            case ts.SyntaxKind.ModuleDeclaration:
                return this.addSegment(start, end, this.schema.variableColor);
            case ts.SyntaxKind.InterfaceDeclaration:
                return this.addSegment(start, end, this.schema.interfaceColor);
            case ts.SyntaxKind.GetAccessor:
                return this.addSegment(start, end, this.schema.getAccessorColor);
            case ts.SyntaxKind.PropertyAssignment:
                return this.addSegment(start, end, this.schema.propertyAssignmentColor);
            case ts.SyntaxKind.MethodSignature:
                return this.addSegment(start, end, this.schema.methodSignatureColor);
            case ts.SyntaxKind.MethodDeclaration:
            case ts.SyntaxKind.FunctionDeclaration:
                return this.addSegment(start, end, this.schema.functionColor);
            case ts.SyntaxKind.ClassDeclaration:
                return this.addSegment(start, end, this.schema.classColor);
            case ts.SyntaxKind.Parameter:
                return this.addSegment(start, end, this.schema.parameterColor);
            case ts.SyntaxKind.VariableDeclaration:
                return this.addSegment(start, end, this.schema.variableColor);
            case ts.SyntaxKind.PropertyDeclaration:
                return this.addSegment(start, end, this.schema.variableColor);
            case ts.SyntaxKind.PropertyAccessExpression: {
                if (node.parent.getChildAt(0).getText() === node.getText()) {
                    return this.addSegment(start, end, this.schema.variableColor);
                }

                return this.addSegment(start, end, this.schema.propertyAccessExpressionColor);
            }
            case ts.SyntaxKind.ExpressionWithTypeArguments:
                return this.addSegment(start, end, this.schema.expressionWithTypeArgumentsColor);
            case ts.SyntaxKind.BreakStatement:
            case ts.SyntaxKind.ShorthandPropertyAssignment:
            case ts.SyntaxKind.BindingElement:
                return this.addSegment(start, end, this.schema.variableColor);
            case ts.SyntaxKind.BinaryExpression:
            case ts.SyntaxKind.SwitchStatement:
            case ts.SyntaxKind.TemplateSpan:
                return this.addSegment(start, end, this.schema.variableColor);
            case ts.SyntaxKind.TypeReference:
            case ts.SyntaxKind.TypeAliasDeclaration:
                return this.addSegment(start, end, this.schema.typeColor);
            case ts.SyntaxKind.NewExpression:
                return this.addSegment(start, end, this.schema.variableColor);
        }
    }

    /**
     * Processes a TypeScript template expression and adds segments for highlighting its literal parts.
     *
     * This method adds a segment for the head of the template expression with the color specified in `this.schema.stringColor`.
     * It also processes each template span within the expression, adding
     * segments for each span's literal part.
     *
     * @param templateExpression - The TypeScript template expression to be processed.
     */

    private processTemplateExpression(templateExpression: ts.TemplateExpression): void {
        const start = templateExpression.head.getStart();
        const end = templateExpression.head.getEnd();
        this.addSegment(start, end, this.schema.stringColor);

        templateExpression.templateSpans.forEach(span => {
            const spanStart = span.literal.getStart();
            const spanEnd = span.literal.getEnd();
            this.addSegment(spanStart, spanEnd, this.schema.stringColor);
        });
    }

    /**
     * Processes a TypeScript AST node and adds segments for highlighting based on the node's kind.
     *
     * This method identifies the kind of the node and determines the appropriate color for highlighting.
     * It handles various node kinds including string literals, regular expressions, template expressions, and identifiers.
     * Specific methods are invoked for more complex node kinds, such as template expressions and identifiers.
     *
     * @param  node - The TypeScript AST node to be processed.
     */

    private processNode(node: ts.Node): void {
        const start = node.getStart();
        const end = node.getEnd();

        switch (node.kind) {
            case ts.SyntaxKind.TypeParameter:
                return this.addSegment(start, start + (node as ts.TypeParameterDeclaration).name.text.length, this.schema.typeColor);
            case ts.SyntaxKind.TypeReference:
                return this.addSegment(start, end, this.schema.typeColor);
            case ts.SyntaxKind.StringLiteral:
            case ts.SyntaxKind.NoSubstitutionTemplateLiteral:
                return this.addSegment(start, end, this.schema.stringColor);
            case ts.SyntaxKind.RegularExpressionLiteral:
                return this.addSegment(start, end, this.schema.regularExpressionColor);
            case ts.SyntaxKind.TemplateExpression:
                return this.processTemplateExpression(node as ts.TemplateExpression);
            case ts.SyntaxKind.Identifier:
                return this.processIdentifier(node);
            case ts.SyntaxKind.BigIntLiteral:
            case ts.SyntaxKind.NumericLiteral:
                return this.addSegment(start, end, this.schema.numericLiteralColor);
        }
    }
}

/**
 * Applies semantic highlighting to the provided code string using the specified color scheme.
 *
 * @param code - The source code to be highlighted.
 * @param schema - An optional partial schema defining the color styles for various code elements.
 *                 Defaults to an empty object, which means no specific highlighting will be applied.
 *
 * @returns A string with the code elements wrapped in the appropriate color styles as specified by the schema.
 *
 * @example
 * const code = 'const x: number = 42;';
 * const schema = {
 *   keywordColor: '\x1b[34m', // Blue
 *   stringColor: '\x1b[32m',  // Green
 *   numberColor: '\x1b[31m',  // Red
 *   reset: '\x1b[0m'          // Reset
 * };
 * const highlightedCode = highlightCode(code, schema);
 * console.log(highlightedCode);
 */

export function highlightCode(code: string, schema: Partial<HighlightSchemeInterface> = {}) {
    const sourceFile = ts.createSourceFile('temp.ts', code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    const codeHighlighter = new CodeHighlighter(sourceFile, code, Object.assign(defaultScheme, schema));

    function walk(node: ts.Node): void {
        codeHighlighter.parseNode(node);

        for (let i = 0; i < node.getChildCount(); i++) {
            walk(node.getChildAt(i));
        }
    } ts.forEachChild(sourceFile, walk);

    return codeHighlighter.highlight();
}

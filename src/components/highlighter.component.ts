/**
 * Export interfaces
 */

export type { HighlightSchemeInterface, HighlightNodeSegmentInterface } from '@components/interfaces/highlighter-component.interface';

/**
 * Import will remove at compile time
 */

import type { HighlightSchemeInterface, HighlightNodeSegmentInterface } from '@components/interfaces/highlighter-component.interface';

/**
 * Imports
 */

import * as ts from 'typescript';
import { SyntaxKind } from 'typescript';

/**
 * An enum containing ANSI escape sequences for various colors.
 *
 * @remarks
 * This enum is primarily intended for terminal output and won't work directly in JavaScript for web development.
 * It defines color codes for various colors and a reset code to return to the default text color.
 *
 * @example
 * ```ts
 * console.log(`${ Colors.red }This text will be red in the terminal.${ Colors.reset }`);
 * ```
 *
 * @see Colors.reset
 *
 * @since 1.0.0
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
 *
 * @remarks
 * This scheme defines colors for different code elements to be used for syntax highlighting.
 *
 * @example
 * ```ts
 * const scheme = defaultScheme;
 * console.log(scheme.typeColor); // Outputs: the color code for types
 * ```
 *
 * @see HighlightSchemeInterface
 * @see Colors
 *
 * @since 1.0.0
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
 * @remarks
 * Processes TypeScript AST nodes and applies color formatting to different code elements
 * according to the provided color scheme.
 *
 * @example
 * ```ts
 * const sourceFile = ts.createSourceFile('example.ts', code, ts.ScriptTarget.Latest);
 * const highlighter = new CodeHighlighter(sourceFile, code, customScheme);
 * highlighter.parseNode(sourceFile);
 * const highlightedCode = highlighter.highlight();
 * console.log(highlightedCode);
 * ```
 *
 * @see HighlightSchemeInterface
 * @see highlightCode
 *
 * @since 1.0.0
 */

export class CodeHighlighter {

    /**
     * A Map of segments where the key is a combination of start and end positions.
     *
     * @remarks
     * This structure ensures unique segments and allows for fast lookups and updates.
     *
     * @see HighlightNodeSegmentInterface
     * @since 1.0.0
     */

    private segments: Map<string, HighlightNodeSegmentInterface> = new Map();

    /**
     * Creates an instance of the CodeHighlighter class.
     *
     * @param sourceFile - The TypeScript AST node representing the source file
     * @param code - The source code string to be highlighted
     * @param schema - The color scheme used for highlighting different elements in the code
     *
     * @since 1.0.0
     */

    constructor(private sourceFile: ts.Node, private code: string, private schema: HighlightSchemeInterface) {
    }

    /**
     * Parses a TypeScript AST node and processes its comments to identify segments that need highlighting.
     *
     * @param node - The TypeScript AST node to be parsed
     *
     * @since 1.0.0
     */

    parseNode(node: ts.Node): void {
        this.processComments(node);
        this.processKeywords(node);
        this.processNode(node);
    }

    /**
     * Generates a string with highlighted code segments based on the provided color scheme.
     *
     * @returns The highlighted code as a string, with ANSI color codes applied to the segments
     *
     * @remarks
     * This method processes the stored segments, applies the appropriate colors to each segment,
     * and returns the resulting highlighted code as a single string.
     *
     * @since 1.0.0
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
     * Extracts a text segment from the source code using position indices.
     *
     * @param start - The starting index position in the source text
     * @param end - The ending index position in the source text (optional)
     * @returns The substring of source text between the start and end positions
     *
     * @remarks
     * This utility method provides access to specific portions of the source code
     * based on character positions. When the end parameter is omitted, the extraction
     * will continue to the end of the source text.
     *
     * This method is typically used during the highlighting process to access the
     * actual text content that corresponds to syntax nodes or other text ranges
     * before applying formatting.
     *
     * @example
     * ```ts
     * // Extract a variable name
     * const variableName = this.getSegmentSource(10, 15);
     *
     * // Extract from a position to the end of source
     * const remaining = this.getSegmentSource(100);
     * ```
     *
     * @see addSegment
     * @see highlight
     *
     * @since 1.0.0
     */

    private getSegmentSource(start: number, end?: number): string {
        return this.code.slice(start, end);
    }

    /**
     * Registers a text segment for syntax highlighting with specified style information.
     *
     * @param start - The starting position of the segment in the source text
     * @param end - The ending position of the segment in the source text
     * @param color - The color code to apply to this segment
     * @param reset - The color reset code to apply after the segment (defaults to the standard reset code)
     *
     * @remarks
     * This method creates a unique key for each segment based on its position and stores the segment information in a map.
     * Each segment contains its position information, styling code,
     * and reset code which will later be used during the highlighting process.
     *
     * If multiple segments are added with the same positions, the later additions will
     * overwrite earlier ones due to the map's key-based storage.
     *
     * @example
     * ```ts
     * // Highlight a variable name in red
     * this.addSegment(10, 15, Colors.red);
     *
     * // Highlight a keyword with custom color and reset
     * this.addSegment(20, 26, Colors.blue, Colors.customReset);
     * ```
     *
     * @see Colors
     * @see processNode
     *
     * @since 1.0.0
     */

    private addSegment(start: number, end: number, color: string, reset: string = Colors.reset) {
        const key = `${ start }-${ end }`;
        this.segments.set(key, { start, end, color, reset });
    }

    /**
     * Processes and highlights comments associated with a TypeScript AST node.
     *
     * @param node - The TypeScript AST node whose comments are to be processed
     *
     * @remarks
     * This method identifies both leading and trailing comments associated with the given node
     * and adds them to the highlighting segments.
     * The comments are extracted from the full source text using TypeScript's utility functions
     * and are highlighted using the color specified
     * in the schema's commentColor property.
     *
     * Leading comments appear before the node, while trailing comments appear after it.
     * Both types are processed with the same highlighting style.
     *
     * @example
     * ```ts
     * // For a node that might have comments like:
     * // This is a leading comment
     * const x = 5; // This is a trailing comment
     *
     * this.processComments(someNode);
     * // Both comments will be added to segments with the comment color
     * ```
     *
     * @see addSegment
     * @see ts.getLeadingCommentRanges
     * @see ts.getTrailingCommentRanges
     *
     * @since 1.0.0
     */

    private processComments(node: ts.Node): void {
        const comments = [
            ...ts.getTrailingCommentRanges(this.sourceFile.getFullText(), node.getFullStart()) || [],
            ...ts.getLeadingCommentRanges(this.sourceFile.getFullText(), node.getFullStart()) || []
        ];

        comments.forEach(comment => this.addSegment(comment.pos, comment.end, this.schema.commentColor));
    }

    /**
     * Processes TypeScript keywords and primitive type references in an AST node for syntax highlighting.
     *
     * @param node - The TypeScript AST node to be processed for keywords
     *
     * @remarks
     * This method handles two categories of tokens that require special highlighting:
     *
     * 1. Primitive type references: Highlights references to built-in types like `null`,
     *    `void`, `string`, `number`, `boolean`, and `undefined` using the type color.
     *
     * 2. TypeScript keywords: Identifies any node whose kind falls within the TypeScript
     *    keyword range (between FirstKeyword and LastKeyword) and highlights it using
     *    the keyword color.
     *
     * Each identified token is added to the segments collection with appropriate position
     * and color information.
     *
     * @example
     * ```ts
     * // Inside syntax highlighting process
     * this.processKeywords(someNode);
     * // If the node represents a keyword like 'const' or a primitive type like 'string',
     * // it will be added to the segments with the appropriate color
     * ```
     *
     * @see addSegment
     * @see ts.SyntaxKind
     *
     * @since 1.0.0
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
     * Processes identifier nodes and applies appropriate syntax highlighting based on their context.
     *
     * @param node - The TypeScript AST node representing the identifier to be processed
     *
     * @remarks
     * This method determines the appropriate color for an identifier by examining its parent node's kind.
     * Different colors are applied based on the identifier's role in the code:
     * - Enum members use enumColor
     * - Interface names use interfaceColor
     * - Class names use classColor
     * - Function and method names use functionColor
     * - Parameters use parameterColor
     * - Variables and properties use variableColor
     * - Types use typeColor
     * - And more specialized cases for other syntax kinds
     *
     * Special handling is applied to property access expressions to differentiate between
     * the object being accessed and the property being accessed.
     *
     * @example
     * ```ts
     * // Inside the CodeHighlighter class
     * const identifierNode = getIdentifierNode(); // Get some identifier node
     * this.processIdentifier(identifierNode);
     * // The identifier is now added to segments with appropriate color based on its context
     * ```
     *
     * @see addSegment
     * @see HighlightSchemeInterface
     *
     * @since 1.0.0
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
     * Processes a TypeScript template expression and adds highlighting segments for its literal parts.
     *
     * @param templateExpression - The TypeScript template expression to be processed
     *
     * @remarks
     * This method adds color segments for both the template head and each template span's literal part.
     * All template string components are highlighted using the color defined in the schema's stringColor.
     *
     * @example
     * ```ts
     * // Given a template expression like: `Hello ${name}`
     * this.processTemplateExpression(templateNode);
     * // Both "Hello " and the closing part after the expression will be highlighted
     * ```
     *
     * @see addSegment
     *
     * @since 1.0.0
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
     * Processes a TypeScript AST node and adds highlighting segments based on the node's kind.
     *
     * @param node - The TypeScript AST node to be processed
     *
     * @remarks
     * This method identifies the node's kind and applies the appropriate color for highlighting.
     * It handles various syntax kinds including literals (string, numeric, regular expressions),
     * template expressions, identifiers, and type references.
     * For complex node types like template expressions and identifiers, it delegates to specialized processing methods.
     *
     * @throws Error - When casting to TypeParameterDeclaration fails for non-compatible node kinds
     *
     * @example
     * ```ts
     * // Inside the CodeHighlighter class
     * const node = sourceFile.getChildAt(0);
     * this.processNode(node);
     * // Node is now added to the segments map with appropriate colors
     * ```
     *
     * @see processTemplateExpression
     * @see processIdentifier
     *
     * @since 1.0.0
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
 * @param code - The source code to be highlighted
 * @param schema - An optional partial schema defining the color styles for various code elements
 *
 * @returns A string with the code elements wrapped in the appropriate color styles
 *
 * @remarks
 * If no schema is provided, the default schema will be used. The function creates a TypeScript
 * source file from the provided code and walks through its AST to apply syntax highlighting.
 *
 * @example
 * ```ts
 * const code = 'const x: number = 42;';
 * const schema = {
 *   keywordColor: '\x1b[34m', // Blue
 *   numberColor: '\x1b[31m',  // Red
 * };
 * const highlightedCode = highlightCode(code, schema);
 * console.log(highlightedCode);
 * ```
 *
 * @see CodeHighlighter
 * @see HighlightSchemeInterface
 *
 * @since 1.0.0
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

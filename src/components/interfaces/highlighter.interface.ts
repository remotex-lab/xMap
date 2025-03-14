/**
 * Defines the color scheme for syntax highlighting different code elements.
 *
 * @interface HighlightSchemeInterface
 *
 * @property enumColor - Color code for enum declarations and references
 * @property typeColor - Color code for type annotations and primitive types
 * @property classColor - Color code for class declarations and references
 * @property stringColor - Color code for string literals and template strings
 * @property keywordColor - Color code for language keywords
 * @property commentColor - Color code for comments (single-line and multi-line)
 * @property functionColor - Color code for function declarations and calls
 * @property variableColor - Color code for variable declarations and references
 * @property interfaceColor - Color code for interface declarations and references
 * @property parameterColor - Color code for function and method parameters
 * @property getAccessorColor - Color code for getter accessor methods
 * @property numericLiteralColor - Color code for numeric literals
 * @property methodSignatureColor - Color code for method signatures in interfaces
 * @property regularExpressionColor - Color code for regular expression literals
 * @property propertyAssignmentColor - Color code for property assignments in object literals
 * @property propertyAccessExpressionColor - Color code for property access expressions
 * @property expressionWithTypeArgumentsColor - Color code for type arguments in expressions
 *
 * @example
 * ```ts
 * const darkTheme: HighlightSchemeInterface = {
 *   enumColor: Colors.cyan,
 *   typeColor: Colors.blue,
 *   classColor: Colors.yellow,
 *   // ...other color definitions
 * };
 * ```
 *
 * @since 1.0.0
 */

export interface HighlightSchemeInterface {
    enumColor: string;
    typeColor: string;
    classColor: string;
    stringColor: string;
    keywordColor: string;
    commentColor: string;
    functionColor: string;
    variableColor: string;
    interfaceColor: string;
    parameterColor: string;
    getAccessorColor: string;
    numericLiteralColor: string;
    methodSignatureColor: string;
    regularExpressionColor: string;
    propertyAssignmentColor: string;
    propertyAccessExpressionColor: string;
    expressionWithTypeArgumentsColor: string;
}

/**
 * Represents a segment of source code to be highlighted with specific styling.
 *
 * @interface HighlightNodeSegmentInterface
 *
 * @property start - The starting character position of the segment in the source text
 * @property end - The ending character position of the segment in the source text
 * @property color - The color or style code to apply to this segment
 * @property reset - The reset code that returns formatting to normal after this segment
 *
 * @remarks
 * Segments are the fundamental units of the highlighting system.
 * Each segment represents a portion of text that should receive specific styling.
 * When the source code is processed for display,
 * these segments are used to insert the appropriate color/style codes at the correct positions.
 *
 * The highlighter maintains a collection of these segments and applies them
 * in position order to create the complete highlighted output.
 *
 * @example
 * ```ts
 * const keywordSegment: HighlightNodeSegmentInterface = {
 *   start: 0,
 *   end: 6,
 *   color: '\x1b[34m', // Blue for the keyword "import"
 *   reset: '\x1b[0m'   // Reset to default
 * };
 * ```
 *
 * @see HighlightSchemeInterface
 * @see addSegment
 *
 * @since 1.0.0
 */

export interface HighlightNodeSegmentInterface {
    end: number;
    start: number;
    color: string;
    reset: string;
}

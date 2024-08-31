/**
 * HighlightSchemeInterface defines the structure for a color style schema
 * used in semantic highlighting.
 * This interface ensures that the highlighting styles are consistent and easily configurable.
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
 * Represents a segment of a code string that needs to be highlighted.
 *
 * @interface
 *
 * @property start - The starting index of the segment in the code string.
 * @property end - The ending index of the segment in the code string.
 * @property color - The color code to apply to the segment.
 * @property reset - The color reset code to apply after the segment.
 *
 * @example
 * const segment: HighlightNodeSegment = {
 *   start: 0,
 *   end: 10,
 *   color: '\x1b[31m', // Red
 *   reset: '\x1b[0m' // Reset
 * };
 */

export interface HighlightNodeSegmentInterface {
    end: number;
    start: number;
    color: string;
    reset: string;
}

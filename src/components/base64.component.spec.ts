/**
 * Imports
 */

import { decodeVLQ, encodeArrayVLQ, encodeVLQ } from '@components/base64.component';

/**
 * Test suite for VLQ (Variable Length Quantity) encoding and decoding functions.
 */

describe('VLQ Encoding/Decoding', () => {

    /**
     * Test case: encodeVLQ should correctly encode positive numbers.
     *
     * Verifies that the `encodeVLQ` function correctly encodes positive numbers to their corresponding VLQ Base64 characters.
     * - 0 encodes to 'A'
     * - 1 encodes to 'C'
     * - 18 encodes to 'kB'
     */

    test('encodeVLQ should correctly encode positive numbers', () => {
        expect(encodeVLQ(0)).toBe('A');
        expect(encodeVLQ(1)).toBe('C');
        expect(encodeVLQ(18)).toBe('kB');
    });

    /**
     * Test case: encodeVLQ should correctly encode negative numbers.
     *
     * Verifies that the `encodeVLQ` function correctly encodes negative numbers to their corresponding VLQ Base64 characters.
     * - -1 encodes to 'D'
     * - -10 encodes to 'V'
     */

    test('encodeVLQ should correctly encode negative numbers', () => {
        expect(encodeVLQ(-1)).toBe('D');
        expect(encodeVLQ(-10)).toBe('V');
    });

    /**
     * Test case: encodeArrayVLQ should correctly encode an array of numbers.
     *
     * Verifies that the `encodeArrayVLQ` function correctly encodes an array of numbers to their VLQ Base64 encoded string.
     * - The array [0, 1, -1, -18, 18, -18] encodes to 'ACDlBkBlB'.
     */

    test('encodeArrayVLQ should correctly encode an array of numbers', () => {
        const input = [ 0, 1, -1, -18, 18, -18 ];
        const expected = 'ACDlBkBlB';
        expect(encodeArrayVLQ(input)).toBe(expected);
    });

    /**
     * Test case: decodeVLQ should correctly decode a VLQ encoded string to an array of numbers.
     *
     * Verifies that the `decodeVLQ` function correctly decodes a VLQ encoded string 'ACDlBkBlB' back to the array of numbers [0, 1, -1, -18, 18, -18].
     */

    test('decodeVLQ should correctly decode a VLQ encoded string to an array of numbers', () => {
        const input = 'ACDlBkBlB';
        const expected = [ 0, 1, -1, -18, 18, -18 ];
        expect(decodeVLQ(input)).toEqual(expected);
    });

    /**
     * Test case: decodeVLQ should throw an error for invalid Base64 characters.
     *
     * Verifies that the `decodeVLQ` function throws an error when encountering invalid Base64 characters in the input string.
     * - The input '!@#' should throw an error with the message 'Invalid Base64 character: !'.
     */

    test('decodeVLQ should throw an error for invalid Base64 characters', () => {
        expect(() => decodeVLQ('!@#')).toThrow('Invalid Base64 character: !');
    });
});

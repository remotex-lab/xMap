// Bitmask to extract the lower 5 bits (continuation bit removed) - 0b11111
const CONTINUATION_BIT_REMOVE = 0x1F;

// Bitmask to set the continuation bit - 0b100000
const CONTINUATION_BIT_POSITION = 0x20;

// Mapping of Base64 characters to their indices
const base64Map: { [key: string]: number } = {};

// Array of Base64 characters
const base64Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'.split('');

// Populate the base64Map with characters and their corresponding indices
base64Chars.forEach((char, index) => {
    base64Map[char] = index;
});

/**
 * Encodes a given number using Variable-Length Quantity (VLQ) encoding. Negative numbers are encoded by
 * converting to a non-negative representation and the continuation bit is used to indicate if more bytes follow.
 *
 * @param value - The number to be encoded
 * @returns The VLQ encoded string represented as Base64 characters
 *
 * @throws Error - If the value cannot be properly encoded
 *
 * @remarks The encoding process shifts the value left by 1 bit to accommodate a sign bit in the least significant position.
 * Negative values have their sign bit set to 1, while positive values have it set to 0.
 *
 * @example
 * ```ts
 * // Encoding a positive number
 * const encoded = encodeVLQ(25);  // Returns "Y"
 *
 * // Encoding a negative number
 * const encodedNegative = encodeVLQ(-25);  // Returns "Z"
 * ```
 *
 * @see decodeVLQ - For the corresponding decode function
 *
 * @since 1.0.0
 */

export function encodeVLQ(value: number): string {
    const isNegative = value < 0;

    /**
     * Bit Structure Representation:
     *
     * +--------------------------+
     * | C |   Value       | Sign |
     * +---+---+---+---+---+------+
     * | 1 | 1 | 0 | 0 | 1 |   0  |
     * +---+---+---+---+---+------+
     */

    let encoded = '';
    let vlq = isNegative ? ((-value) << 1) + 1 : (value << 1); // Shift left by 1 bit to encode the sign bit

    do {
        const digit = vlq & CONTINUATION_BIT_REMOVE; // Extract lower 5 bits
        vlq >>>= 5; // Right shift by 5 bits to process next chunk
        encoded += base64Chars[digit | (vlq > 0 ? CONTINUATION_BIT_POSITION : 0)]; // Combine digit and continuation bit
    } while (vlq > 0);

    return encoded;
}

/**
 * Encodes an array of numbers using VLQ encoding by individually encoding each number and concatenating the results.
 *
 * @param values - The array of numbers to be encoded
 * @returns The concatenated VLQ encoded string
 *
 * @example
 * ```ts
 * // Encoding multiple values
 * const encoded = encodeArrayVLQ([1, 0, -5]);  // Returns "CAAK"
 * ```
 *
 * @see encodeVLQ - The underlying function used to encode each number
 *
 * @since 1.0.0
 */


export function encodeArrayVLQ(values: number[]): string {
    return values.map(encodeVLQ).join('');
}

/**
 * Decodes a VLQ encoded string back into an array of numbers by processing Base64 characters and continuation bits.
 *
 * @param data - The VLQ encoded string
 * @returns The array of decoded numbers
 *
 * @throws Error - If the string contains invalid Base64 characters
 *
 * @remarks The decoding process examines each Base64 character,
 * checking for continuation bits and progressively building up numeric values.
 * The sign bit is extracted from the least significant position
 * to determine if the original number was negative.
 *
 * @example
 * ```ts
 * // Decoding a simple VLQ string
 * const decoded = decodeVLQ("Y");  // Returns [25]
 *
 * // Decoding multiple values
 * const multiDecoded = decodeVLQ("CAAK");  // Returns [1, 0, -5]
 * ```
 *
 * @see encodeVLQ - For the corresponding encode function
 *
 * @since 1.0.0
 */

export function decodeVLQ(data: string): number[] {
    const result = [];
    let shift = 0;
    let value = 0;

    for (let i = 0; i < data.length; i++) {
        const digit = base64Map[data[i]];
        if (digit === undefined) {
            throw new Error(`Invalid Base64 character: ${data[i]}`);
        }

        const continuation = digit & CONTINUATION_BIT_POSITION; // Check if continuation bit is set
        value += (digit & CONTINUATION_BIT_REMOVE) << shift; // Add lower 5 bits to value
        if (continuation) {
            shift += 5; // Shift left by 5 for next chunk
        } else {
            const isNegative = (value & 1) === 1; // Check if the number is negative
            const shifted = value >> 1; // Remove the sign bit

            result.push(isNegative ? -shifted : shifted); // Convert back to signed integer
            value = shift = 0; // Reset for next number
        }
    }

    return result;
}

# xMap
## Description
`xMap` is a library designed to help with sourcemap parsing and TypeScript code formatting for the CLI.\
It includes components for parsing error stack traces, formatting code, and providing syntax highlighting, as well as a service for handling source maps.

## Installation
To install the package, use npm or yarn:
```bash
npm install @remotex-labs/xmap
```
or
```bash
yarn add @remotex-labs/xmap
```
## Usage
### Parsing Error Stack Traces
The parseErrorStack function parses an error stack trace and returns an array of stack entries.\
Each entry contains information about the function call, file, line number, column number, and if applicable, details about the eval context.

**Example**
```typescript
import { parseErrorStack } from '@remotex-labs/xmap';

// Example stack trace string
const stackTrace = `
Error: Example error
    at Object.<anonymous> (/path/to/file.js:10:15)
    at Module._compile (node:internal/modules/cjs/loader:1217:14)
    at node:internal/modules/cjs/loader:1308:14
    at node:internal/modules/cjs/loader:1425:5
    at node:internal/modules/cjs/loader:1425:5
    at node:internal/modules/cjs/loader:1483:3
    at node:internal/modules/cjs/loader:1700:8
    at node:internal/modules/cjs/loader:1760:3
    at /path/to/file.js:10:15
    at Object.<anonymous> (/path/to/file.js:10:15)
    at eval (eval at <anonymous> (/path/to/file.js:10:15), <anonymous>:1:1)
`;

// Parsing the stack trace
const parsedStack = parseErrorStack(stackTrace);
console.log(parsedStack);
```

### Formatting Code
The formatCode function formats a code snippet with optional line padding and custom actions.\
It applies padding to line numbers and can trigger custom actions for specific lines.

Function Signature
```typescript
export function formatCode(code: string, options: FormatCodeInterface = {}): string;
```
Parameters

* `code` (string): The source code or stack to be formatted.
* `options` (FormatCodeInterface, optional): Configuration options for formatting the code. 
  * `padding` (number, optional): Number of characters for line number padding. Defaults to 10. 
  * `startLine` (number, optional): The starting line number for formatting. Defaults to 1. 
  * `action` (object, optional): Custom actions to apply to specific lines. 
  * `triggerLine` (number): The line number where the action should be triggered. 
  * `callback` (function): A callback function to format the line string when triggerLine is matched. The callback receives the formatted line string, the padding value, and the current line number as arguments.

```typescript
import { formatCode } from '@remotex-labs/xmap';

// Example TypeScript code
const code = `
function helloWorld() {
    console.log('Hello, world!');
}
`;

// Formatting the code
const formattedCode = formatCode(code, {
    padding: 8,
    startLine: 5,
    action: {
        triggerLine: 7,
        callback: (lineString, padding, lineNumber) => {
            return `Custom formatting for line ${lineNumber}: ${lineString}`;
        }
    }
});
console.log(formattedCode);
`;

// Formatting the code
const formattedCode = formatCode(code);
console.log(formattedCode);
```

### Formatting Code with Error Location
The formatErrorCode function formats a code snippet around an error location with special highlighting.\
It highlights the relevant code snippet around the error location, including special formatting for the error line and column.

Function Signature
```typescript
export function formatErrorCode(sourcePosition: PositionSourceInterface, ansiOption?: AnsiOptionInterface): string;
```

Example
```typescript
import { formatErrorCode } from '@remotex-labs/xmap';

// Example source position
const sourcePosition = {
    code: `
function helloWorld() {
    console.log('Hello, world!');
}
`,
    line: 2,
    column: 15,
    startLine: 1
};

// Optional ANSI color configuration
const ansiOption = {
    color: '\x1b[38;5;160m', // Red color
    reset: '\x1b[0m' // Reset color
};

// Formatting the error code
const formattedErrorCode = formatErrorCode(sourcePosition, ansiOption);
console.log(formattedErrorCode);
```

### Highlighting Syntax
To apply syntax highlighting to TypeScript or JavaScript code, use the highlighter component:
```typescript
import { highlightCode } from '@remotex-labs/xmap';

// Example TypeScript code
const code = `
function helloWorld() {
    console.log('Hello, world!');
}
`;

// Highlighting the code
const highlightedCode = highlightCode(code);
console.log(highlightedCode);
```

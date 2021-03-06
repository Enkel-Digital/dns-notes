/**
 * Script to generate AJV standalone validator modules using typescript definition files in shared-types/
 */

const TJS = require("typescript-json-schema");
const { resolve } = require("path");
const Ajv = require("ajv");
const standaloneCode = require("ajv/dist/standalone").default;
const { writeFile } = require("fs/promises");

// Define the typescript definition files and symbols to convert into validation modules
// There cannot be any duplicate symbol names as the file names is the symbol name
const conversions = {
  note: ["Note"],
  user: ["UserInviteRequest"],
  event: ["AddEvent", "DelEvent", "EditEvent", "SyncEvent"],
};

// Create a TJS generator using all the TS definition files
const generator = TJS.buildGenerator(
  TJS.getProgramFromFiles(
    // Generate the file paths using the file names
    Object.keys(conversions).map((fileName) =>
      resolve("../shared-types/", `${fileName}.d.ts`)
    ),

    // @todo Use tsconfig
    // Optionally pass TS compiler options
    { strictNullChecks: true }
  ),

  // Optional settings
  {
    // All fields are required
    required: true,

    // No extra properties is allowed on the request body
    noExtraProps: true,
  }
);

// The generated code will have a default export:
// `module.exports = <validateFunctionCode>;module.exports.default = <validateFunctionCode>;`
const ajv = new Ajv({ code: { source: true, esm: true } });

// Comment to be injected into all generated validation module files
const file_comment = `/**
  * DO NOT EDIT THIS FILE MANUALLY
  * This file is generated using \`npm run generate:validators\`
  * Edit the script instead to generate this file
  * 
  * This file contains a AJV standalone module to validate JSONs as specified by the file name.
  */
`;

// 1. Loop over all the TS symbols
// 2. Get schema for each symbol using the TJS generator
// 3. Compile schema into validation logic
// 4. Turn validation logic into standalone module source code
// 5. Replace es6 module export with TS type annotated export to satisfy type checker when other TS files use it
// 6. Write generated source code into file with the symbol as file name and return a Promise for it
for (const symbol of Object.values(conversions).flat()) {
  writeFile(
    resolve(__dirname, `../src/validators/${symbol}.ts`),
    file_comment +
      // Add no check to prevent tsc from type checking generated code
      "// @ts-nocheck\n" +
      standaloneCode(
        ajv,
        ajv.compile(generator.getSchemaForSymbol(symbol))
      ).replace(
        /export default \w+/g,
        'import type { ValidateFunction } from "ajv";export default validate as ValidateFunction'
      )
  );
}

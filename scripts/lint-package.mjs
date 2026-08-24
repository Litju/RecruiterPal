import { ESLint } from "eslint";

const eslint = new ESLint({ cwd: process.cwd() });
const results = await eslint.lintFiles(["."]);
const formatter = await eslint.loadFormatter("stylish");
const output = formatter.format(results);
if (output) process.stdout.write(output);
if (results.some((result) => result.errorCount > 0)) process.exitCode = 1;

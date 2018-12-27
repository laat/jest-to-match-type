import Ajv from 'ajv';
import chalk from 'chalk';
import { matcherHint } from 'jest-matcher-utils';
import * as TJS from 'typescript-json-schema';

const program = TJS.programFromConfig('tsconfig.json');

const programCache: { [key: string]: TJS.Program } = {};

export const toMatchType: any = (
  received: any,
  type: string,
  ...files: string[]
): any => {
  const settings: TJS.PartialArgs = {
    noExtraProps: true,
    required: true,
  };
  let p = program;
  if (files.length > 0) {
    if (programCache[files.join()]) {
      p = programCache[files.join()];
    } else {
      p = TJS.getProgramFromFiles(files, {
        lib: ['es2015'],
        strict: true,
        resolveJsonModule: true,
        esModuleInterop: true,
      });
      programCache[files.join()] = p;
    }
  }
  const schema = TJS.generateSchema(p, type, settings);
  if (schema == null) {
    throw new Error(`Unable to generate schema for ${type}`);
  }
  const ajv = new Ajv({
    allErrors: true,
  });
  const validate = ajv.compile(schema);
  const pass = validate(received);

  const message = pass
    ? () =>
        `${matcherHint(
          '.not.toMatchType',
          undefined,
          'schema'
        )}\n\nExpected value not to match type`
    : () => {
        let messageToPrint = `received\n`;
        const errors = validate.errors || [];
        errors.forEach(error => {
          let line = `${error.dataPath} ${error.message}`;

          if (error.keyword === 'additionalProperties') {
            line += `, but found '${
              // @ts-ignore
              error.params.additionalProperty
            }'`;
          }

          messageToPrint += chalk.red(`  ${line}\n`);
        });
        return `${matcherHint(
          '.toMatchType',
          undefined,
          'schema'
        )}\n\n${messageToPrint}`;
      };
  return {
    actual: received,
    message,
    pass,
  };
};
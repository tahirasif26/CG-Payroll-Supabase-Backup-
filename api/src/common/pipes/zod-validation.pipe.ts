import { ArgumentMetadata, BadRequestException, PipeTransform } from '@nestjs/common';
import { ZodError, type ZodTypeAny, type z } from 'zod';

/**
 * Zod-backed validation pipe. Generic constraint is over the *schema*, not
 * its output type, so schemas with `.default()`, `.transform()`, or other
 * input-output mismatches (e.g. BigInt transforms) work cleanly with:
 *
 *   `@Body(new ZodValidationPipe(mySchema)) dto: MyDto`
 *
 * `MyDto` is inferred as `z.infer<typeof mySchema>` automatically.
 */
export class ZodValidationPipe<S extends ZodTypeAny>
  implements PipeTransform<unknown, z.infer<S>>
{
  constructor(private readonly schema: S) {}

  transform(value: unknown, _metadata: ArgumentMetadata): z.infer<S> {
    try {
      return this.schema.parse(value);
    } catch (err) {
      if (err instanceof ZodError) {
        const fields: Record<string, string[]> = {};
        for (const issue of err.issues) {
          const key = issue.path.length ? issue.path.join('.') : '_';
          (fields[key] ??= []).push(issue.message);
        }
        throw new BadRequestException({
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          fields,
        });
      }
      throw err;
    }
  }
}

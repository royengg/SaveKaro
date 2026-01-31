import { Context, Next } from "hono";
import { z, ZodSchema } from "zod";

type ValidationTarget = "json" | "query" | "param";

export function validate<T extends ZodSchema>(
  schema: T,
  target: ValidationTarget = "json"
) {
  return async (c: Context, next: Next) => {
    let data: unknown;

    switch (target) {
      case "json":
        try {
          data = await c.req.json();
        } catch {
          return c.json(
            {
              success: false,
              error: "Invalid JSON body",
            },
            400
          );
        }
        break;
      case "query":
        data = Object.fromEntries(new URL(c.req.url).searchParams);
        break;
      case "param":
        data = c.req.param();
        break;
    }

    const result = schema.safeParse(data);

    if (!result.success) {
      return c.json(
        {
          success: false,
          error: "Validation failed",
          details: result.error.flatten().fieldErrors,
        },
        400
      );
    }

    // Store validated data in context
    c.set("validated" as never, result.data);
    
    return next();
  };
}

// Helper to get validated data with type safety
export function getValidated<T>(c: Context): T {
  return c.get("validated" as never) as T;
}

import { createRemoteJWKSet, jwtVerify } from "jose";
import type { MiddlewareHandler } from "hono";

const domain = process.env.AUTH0_DOMAIN!;
const audience = process.env.AUTH0_AUDIENCE!;

const JWKS = createRemoteJWKSet(
  new URL(`https://${domain}/.well-known/jwks.json`),
)

export const authMiddleware: MiddlewareHandler = async (c, next) => {
  const authHeader = c.req.header("Authorization");

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: "Missing or invalid Authorization header" }, 401);
  }

  const token = authHeader.replace("Bearer ", "");

  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: `https://${domain}/`,
      audience,
    });

    c.set("user", payload);

    await next()
  } catch (err) {
    return c.json({ error: "Invalid or expired token" }, 401);
  }
}
import type { Context, Next } from "hono";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { pool } from "../database/database.js";

const domain = process.env.AUTH0_DOMAIN!;
const audience = process.env.AUTH0_AUDIENCE!;

const JWKS = createRemoteJWKSet(
  new URL(`https://${domain}/.well-known/jwks.json`)
);

export async function requireAuth(c: Context, next: Next) {
  const authHeader = c.req.header("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ error: "Missing Authorization header" }, 401);
  }

  const token = authHeader.slice(7);

  let payload;
  try {
    ({ payload } = await jwtVerify(token, JWKS, {
      issuer: `https://${domain}/`,
      audience,
    }));
  } catch {
    return c.json({ error: "Invalid or expired token" }, 401);
  }

  const auth0Sub = payload.sub;
  if (!auth0Sub) {
    return c.json({ error: "Invalid token payload" }, 401);
  }

  const result = await pool.query(
    `
    INSERT INTO users (auth0_sub, email, username, created_at)
    VALUES ($1, $2, $3, NOW())
    ON CONFLICT (auth0_sub)
    DO UPDATE SET
      email = EXCLUDED.email,
      username = EXCLUDED.username,
    RETURNING *;
    `,
    [
      auth0Sub,
      payload.email ?? null,
      payload.username ?? null,
    ]
  );

  const dbUser = result.rows[0];

  c.set("auth0User", payload);
  c.set("dbUser", dbUser);
  c.set("dbUserId", dbUser.id);

  await next();
}
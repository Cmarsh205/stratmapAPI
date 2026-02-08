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

  let email: string | null = (payload.email as string) ?? null;
  let username: string | null =
    (payload.nickname as string) ??
    (payload.preferred_username as string) ??
    (payload.username as string) ??
    null;

  if ((!email || !username) && token) {
    try {
      const userInfoRes = await fetch(`https://${domain}/userinfo`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (userInfoRes.ok) {
        const userInfo = (await userInfoRes.json()) as {
          email?: string;
          nickname?: string;
          preferred_username?: string;
          name?: string;
        };
        email ??= userInfo.email ?? null;
        username ??=
          userInfo.nickname ?? userInfo.preferred_username ?? userInfo.name ?? null;
      }
    } catch {
    }
  }

  const result = await pool.query(
    `
    INSERT INTO users (auth0_sub, email, username, created_at)
    VALUES ($1, $2, $3, NOW())
    ON CONFLICT (auth0_sub)
    DO UPDATE SET
      email = EXCLUDED.email,
      username = EXCLUDED.username
    RETURNING *;
    `,
    [auth0Sub, email, username]
  );

  const dbUser = result.rows[0];

  c.set("auth0User", payload);
  c.set("dbUser", dbUser);
  c.set("dbUserId", dbUser.id);

  await next();
}
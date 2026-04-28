import { Hono } from "https://deno.land/x/hono@v3.11.7/mod.ts";
import { HTTPException } from "https://deno.land/x/hono@v3.11.7/http-exception.ts";
import { logger } from "https://deno.land/x/hono@v3.11.7/middleware/logger/index.ts";

const app = new Hono();

app.use("*", logger());

app.get("/", (c) => {
  return c.text("Hello Deno KV Admin!");
});

app.get("/dump", async (c) => {
  checkToken(c);
  const ckv = await Deno.openKv();
  const iter = await ckv.list({ prefix: [] });
  const data: Record<string, any> = {};
  for await (const entry of iter) {
    data[JSON.stringify(entry.key)] = entry.value;
  }
  return c.json(data);
});

app.get("/get", async (c) => {
  checkToken(c);
  const key = c.req.query("key");
  if (!key) throw new HTTPException(400, { message: "Key is required" });
  const ckv = await Deno.openKv();
  const res = await ckv.get([key]);
  return c.json(res.value);
});

app.get("/put", async (c) => {
  checkToken(c);
  const key = c.req.query("key");
  const value = c.req.query("value");
  if (!key || !value) throw new HTTPException(400, { message: "Key and value are required" });
  const ckv = await Deno.openKv();
  await ckv.set([key], value);
  return c.json({ success: true });
});

app.get("/delete", async (c) => {
  checkToken(c);
  const key = c.req.query("key");
  if (!key) throw new HTTPException(400, { message: "Key is required" });
  const ckv = await Deno.openKv();
  await ckv.delete([key]);
  return c.json({ success: true });
});

// A função que o exercício pede para mudar:
function checkToken(c) {
  const token = c.req.query("token");
  // Abaixo está o seu token configurado
  if ( token == '2607_2d1843:42344a' ) return true;
  throw new HTTPException(401, { message: 'Missing or invalid token' }); 
}

Deno.cron("Hourly DB Reset", "0 * * * *", async () => {
  const ckv = await Deno.openKv();
  const iter = await ckv.list({ prefix: [] });
  let count = 0;
  for await (const entry of iter) {
    await ckv.delete(entry.key);
    count++;
  }
  console.log("Hourly reset keys deleted:", count);
});

Deno.serve(app.fetch);

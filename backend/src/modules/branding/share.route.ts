import { Router } from "express";
import { renderSharePage } from "./branding.service.js";

const router = Router();

// Link-preview page for crawlers; humans are bounced to the SPA by meta refresh.
router.get("/:kind/:token", async (req, res) => {
  const { kind, token } = req.params;
  if (kind !== "f" && kind !== "p") return void res.status(404).end();
  const html = await renderSharePage(kind, token);
  if (!html) return void res.status(404).type("text/plain").send("Not found");
  res.set("Cache-Control", "public, max-age=300").type("html").send(html);
});

export default router;

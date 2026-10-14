import { receiptTemplateRepository } from "../models/index.js";
import { createCache } from "./cache.js";

const cache = createCache({ ttl: 300000 }); // 5 minutes

const DEFAULT_THERMAL_BODY = `
<div class="receipt-body">
  <div class="sale-info">
    <p><span class="bold">Sale #:</span> {{saleNumber}}</p>
    <p><span class="bold">Date:</span> {{date}}</p>
    <p><span class="bold">Cashier:</span> {{cashier}}</p>
    {{#if customerName}}
    <p><span class="bold">Customer:</span> {{customerName}}</p>
    {{/if}}
    {{#if customerPhone}}
    <p><span class="bold">Phone:</span> {{customerPhone}}</p>
    {{/if}}
    {{#if customerEmail}}
    <p><span class="bold">Email:</span> {{customerEmail}}</p>
    {{/if}}
    {{#if customerAddress}}
    <p><span class="bold">Address:</span> {{customerAddress}}</p>
    {{/if}}
    <p><span class="bold">Payment:</span> {{paymentMethod}}</p>
    {{#if discount}}
    <p class="discount"><span class="bold">Discount:</span> -{{formatBDT discount}} {{discountLabel}}</p>
    {{/if}}
    {{#if balance}}
    <p class="balance"><span class="bold">Balance:</span> {{formatBDT balance}}</p>
    {{/if}}
  </div>

  <div class="line"></div>

  <div class="items">
    <div class="item-row bold">
      <span class="item-name">Item</span>
      <span class="item-qty-price">Qty × Price</span>
    </div>
    {{#each items}}
    <div class="item-row">
      <span class="item-name text-[11px]">{{name}}</span>
      <span class="item-qty-price text-[11px]">{{quantity}} × {{formatBDT price}}</span>
    </div>
    {{/each}}
  </div>

  <div class="line"></div>

  <div class="totals">
    <div class="row text-[12px]">
      <span>Subtotal</span>
      <span class="bold">{{formatBDT subtotal}}</span>
    </div>
    {{#if discount}}
    <div class="row text-[12px] text-red-600">
      <span>Discount {{discountLabel}}</span>
      <span class="bold">-{{formatBDT discount}}</span>
    </div>
    {{/if}}
    {{#if tax}}
    <div class="row text-[12px]">
      <span>Tax</span>
      <span class="bold">{{formatBDT tax}}</span>
    </div>
    {{/if}}
    <div class="row text-[13px] bold mt-1">
      <span>TOTAL</span>
      <span>{{formatBDT total}}</span>
    </div>
    {{#if amountPaid}}
    {{#if amountPaidNotEqualTotal}}
    <div class="row text-[12px] mt-1">
      <span>Paid</span>
      <span class="bold">{{formatBDT amountPaid}}</span>
    </div>
    {{/if}}
    {{/if}}
    {{#if change}}
    <div class="row text-[12px] text-green-600">
      <span>Change</span>
      <span class="bold">{{formatBDT change}}</span>
    </div>
    {{/if}}
    {{#if balance}}
    <div class="row text-[12px] text-accent-700">
      <span>Balance (Due)</span>
      <span class="bold">{{formatBDT balance}}</span>
    </div>
    {{/if}}
    {{#if debtRepayment}}
    <div class="row text-[12px] text-green-700">
      <span>Debt Paid</span>
      <span class="bold">-{{formatBDT debtRepayment}}</span>
    </div>
    {{/if}}
  </div>
</div>
`;

const DEFAULT_A4_BODY = `
<div class="receipt-body">
  <div class="sale-info">
    <div>
      <p><span class="label">Sale Number:</span> <span class="value">{{saleNumber}}</span></p>
      <p><span class="label">Date:</span> <span class="value">{{date}}</span></p>
    </div>
    <div>
      <p><span class="label">Cashier:</span> <span class="value">{{cashier}}</span></p>
      <p><span class="label">Payment Method:</span> <span class="value">{{paymentMethod}}</span></p>
    </div>
    {{#if customerName}}
    <div>
      <p><span class="label">Customer:</span> <span class="value">{{customerName}}</span></p>
      <p><span class="label">Phone:</span> <span class="value">{{customerPhone}}</span></p>
      {{#if customerEmail}}
      <p><span class="label">Email:</span> <span class="value">{{customerEmail}}</span></p>
      {{/if}}
      {{#if customerAddress}}
      <p><span class="label">Address:</span> <span class="value">{{customerAddress}}</span></p>
      {{/if}}
    </div>
    {{/if}}
  </div>

  <table class="items-table" role="table">
    <thead>
      <tr>
        <th style="width: 50%">Item</th>
        <th class="text-center" style="width: 12%">Qty</th>
        <th class="text-right" style="width: 18%">Unit Price</th>
        <th class="text-right" style="width: 20%">Total</th>
      </tr>
    </thead>
    <tbody>
      {{#each items}}
      <tr>
        <td>{{name}}</td>
        <td class="text-center">{{quantity}}</td>
        <td class="text-right">{{formatBDT price}}</td>
        <td class="text-right font-medium">{{formatBDT (multiply price quantity)}}</td>
      </tr>
      {{/each}}
    </tbody>
  </table>

  <div class="totals">
    <div class="row">
      <span>Subtotal</span>
      <span>{{formatBDT subtotal}}</span>
    </div>
    {{#if discount}}
    <div class="row text-red-600">
      <span>Discount {{discountLabel}}</span>
      <span>-{{formatBDT discount}}</span>
    </div>
    {{/if}}
    {{#if tax}}
    <div class="row">
      <span>Tax</span>
      <span>{{formatBDT tax}}</span>
    </div>
    {{/if}}
    <div class="row total">
      <span>TOTAL</span>
      <span>{{formatBDT total}}</span>
    </div>
    {{#if amountPaid}}
    {{#if amountPaidNotEqualTotal}}
    <div class="row">
      <span>Amount Paid</span>
      <span>{{formatBDT amountPaid}}</span>
    </div>
    {{/if}}
    {{/if}}
    {{#if balance}}
    <div class="row text-accent-600">
      <span>Balance (Due)</span>
      <span class="font-bold">{{formatBDT balance}}</span>
    </div>
    {{/if}}
    {{#if debtRepayment}}
    <div class="row text-green-600">
      <span>Debt Repayment</span>
      <span class="font-bold">-{{formatBDT debtRepayment}}</span>
    </div>
    {{/if}}
  </div>
</div>
`;

const DEFAULT_THERMAL_CSS = `
@media print {
  @page { margin: 0; size: 80mm auto; }
  body { width: 80mm; margin: 0; padding: 0; }
  .no-print { display: none !important; }
}
* { box-sizing: border-box; }
body { font-family: 'Courier New', monospace; font-size: 12px; line-height: 1.4; width: 80mm; margin: 0 auto; padding: 4mm; color: #111; }
.center { text-align: center; }
.bold { font-weight: bold; }
.line { height: 0; border-top: 1px dashed #000; margin: 8px 0; }
.row { display: flex; justify-content: space-between; margin: 4px 0; }
.sale-info p { margin: 3px 0; overflow-wrap: anywhere; }
.items { font-size: 11px; }
.item-row { display: flex; justify-content: space-between; gap: 6px; margin: 3px 0; }
.item-name { flex: 1; min-width: 0; overflow-wrap: anywhere; }
.item-qty-price { flex: 0 0 42%; text-align: right; overflow-wrap: anywhere; }
.totals { margin-top: 8px; }
.receipt-footer { margin-top: 12px; text-align: center; color: #555; }
p { margin: 3px 0; }
.discount { color: #dc2626; }
.balance { color: #f97316; }
`;

const DEFAULT_A4_CSS = `
@media print {
  @page { margin: 15mm; size: A4; }
  body { width: auto; max-width: none; margin: 0; padding: 0; }
  .no-print { display: none !important; }
}
* { box-sizing: border-box; }
body { font-family: 'Segoe UI', system-ui, sans-serif; font-size: 14px; line-height: 1.5; color: #1a1a1a; width: 100%; max-width: 210mm; margin: 0 auto; padding: 16mm; }
.header { text-align: center; border-bottom: 2px solid #1a1a1a; padding-bottom: 20px; margin-bottom: 24px; }
.company-name { font-size: 28px; font-weight: 800; color: #1a1a1a; margin-bottom: 8px; }
.company-info { font-size: 13px; color: #666; line-height: 1.6; }
.sale-info { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 24px; font-size: 13px; }
.sale-info .label { font-weight: 600; color: #666; }
.sale-info .value { font-weight: 500; }
.items-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13px; }
.items-table th { text-align: left; padding: 12px 8px; border-bottom: 2px solid #1a1a1a; font-weight: 700; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px; }
.items-table td { padding: 10px 8px; border-bottom: 1px solid #eee; }
.items-table tr:last-child td { border-bottom: 2px solid #1a1a1a; }
.items-table .text-right { text-align: right; }
.items-table .text-center { text-align: center; }
.totals { width: 300px; margin-left: auto; font-size: 13px; }
.totals .row { display: flex; justify-content: space-between; padding: 6px 0; }
.totals .row.total { font-size: 16px; font-weight: 800; border-top: 2px solid #1a1a1a; padding-top: 12px; margin-top: 8px; }
.footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 12px; }
.footer .thank-you { font-weight: 700; font-size: 16px; color: #1a1a1a; margin-bottom: 8px; }
.policy { font-size: 11px; color: #999; margin-top: 16px; }
`;

const DEFAULT_TEMPLATE_VERSION = 2;

const DEFAULT_THERMAL_HEADER = `
<div class="receipt-header center">
  <p class="bold text-[14px]">{{companyName}}</p>
  <p class="text-[11px] text-gray-600">{{companyAddress}}</p>
  <p class="text-[11px] text-gray-600">{{companyPhone}}</p>
</div>
`;

const DEFAULT_THERMAL_FOOTER = `
<div class="receipt-footer center text-[11px] text-gray-600 mt-3">
  <p class="bold">Thank you for shopping with us!</p>
  <p class="mt-1">Goods sold are not returnable</p>
  <p class="mt-1">without receipt within 7 days</p>
  <div class="mt-3 text-[10px] text-gray-500">
    <p>Powered by A to Z Kids World POS</p>
  </div>
</div>
`;

const DEFAULT_A4_HEADER = `
<div class="receipt-header header">
  <div class="company-name">{{companyName}}</div>
  <div class="company-info">
    <p>{{companyAddress}}</p>
    <p>Tel: {{companyPhone}} | Email: {{companyEmail}}</p>
  </div>
</div>
`;

const DEFAULT_A4_FOOTER = `
<div class="receipt-footer footer">
  <p class="thank-you">Thank you for shopping with us!</p>
  <p class="policy">Goods sold are not returnable without receipt within 7 days</p>
  <p class="policy mt-4">Powered by A to Z Kids World POS</p>
</div>
`;

function getDefaults(templateType) {
  const isThermal = templateType === "pos-thermal";
  return {
    header_html: isThermal ? DEFAULT_THERMAL_HEADER : DEFAULT_A4_HEADER,
    footer_html: isThermal ? DEFAULT_THERMAL_FOOTER : DEFAULT_A4_FOOTER,
    body_template: isThermal ? DEFAULT_THERMAL_BODY : DEFAULT_A4_BODY,
    css_styles: isThermal ? DEFAULT_THERMAL_CSS : DEFAULT_A4_CSS,
  };
}

function sanitizeHtml(html) {
  if (!html || typeof html !== "string") return "";
  // Basic sanitization - strip scripts, event handlers
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, "")
    .replace(/javascript:/gi, "");
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function interpolate(template, data) {
  const tokens = template.split(/(\{\{[\s\S]*?\}\})/g).filter(Boolean);

  function parseNodes(startIndex, closingBlock = null) {
    const nodes = [];
    let index = startIndex;

    while (index < tokens.length) {
      const token = tokens[index];
      const match = token.match(/^\{\{\s*([\s\S]*?)\s*\}\}$/);
      if (!match) {
        nodes.push({ type: "text", value: token });
        index += 1;
        continue;
      }

      const expression = match[1].trim();
      if (expression === "else" || expression.startsWith("/")) {
        return { nodes, index, stop: expression };
      }

      const block = expression.match(/^#(if|each)\s+([\w.]+)$/);
      if (block) {
        const [, type, key] = block;
        const primary = parseNodes(index + 1, type);
        let alternate = [];
        index = primary.index;
        if (primary.stop === "else") {
          const secondary = parseNodes(index + 1, type);
          alternate = secondary.nodes;
          index = secondary.index;
        }
        if (tokens[index]?.trim() !== `{{/${type}}}`) {
          throw new Error(`Unclosed ${type} block in receipt template`);
        }
        nodes.push({ type, key, primary: primary.nodes, alternate });
        index += 1;
        continue;
      }

      nodes.push({ type: "value", expression });
      index += 1;
    }

    if (closingBlock) {
      throw new Error(`Unclosed ${closingBlock} block in receipt template`);
    }
    return { nodes, index, stop: null };
  }

  const nodes = parseNodes(0).nodes;

  function resolve(key, context) {
    return key.split(".").reduce((value, part) => value?.[part], context);
  }

  function expressionValue(expression, context) {
    const moneyTimes = expression.match(/^formatBDT\s+\(multiply\s+([\w.]+)\s+([\w.]+)\)$/);
    if (moneyTimes) {
      const [, left, right] = moneyTimes;
      return formatBDT((Number(resolve(left, context)) || 0) * (Number(resolve(right, context)) || 0));
    }

    const money = expression.match(/^formatBDT\s+([\w.]+)$/);
    if (money) return formatBDT(resolve(money[1], context));

    const multiply = expression.match(/^multiply\s+([\w.]+)\s+([\w.]+)$/);
    if (multiply) {
      const [, left, right] = multiply;
      return (Number(resolve(left, context)) || 0) * (Number(resolve(right, context)) || 0);
    }

    return resolve(expression, context);
  }

  function render(items, context) {
    return items.map((node) => {
      if (node.type === "text") return node.value;
      if (node.type === "if") {
        const value = resolve(node.key, context);
        const branch = value !== undefined && value !== null && value !== false && value !== "" && value !== 0
          ? node.primary
          : node.alternate;
        return render(branch, context);
      }
      if (node.type === "each") {
        const collection = resolve(node.key, context);
        if (!Array.isArray(collection)) return "";
        return collection.map((item) => render(node.primary, { ...context, ...item })).join("");
      }

      const value = expressionValue(node.expression, context);
      return value === undefined || value === null ? "" : escapeHtml(value);
    }).join("");
  }

  return render(nodes, data);
}

function receiptLayoutFixes(templateName) {
  if (templateName === "pos-thermal") {
    return `
* { box-sizing: border-box; }
body { width: 80mm !important; max-width: 80mm !important; margin: 0 auto !important; padding: 4mm !important; }
.receipt-header, .receipt-body, .receipt-footer { width: 100%; max-width: 100%; overflow-wrap: anywhere; }
.items { width: 100%; }
.item-row { display: flex; align-items: flex-start; gap: 4px; }
.item-name { flex: 1 1 auto; min-width: 0; overflow-wrap: anywhere; }
.item-qty-price { flex: 0 0 44%; width: auto; text-align: right; white-space: normal; overflow-wrap: anywhere; }
.totals .row span:last-child { margin-left: 8px; text-align: right; }
`;
  }

  if (templateName === "a4-standard") {
    return `
* { box-sizing: border-box; }
body { width: 100% !important; max-width: 210mm !important; margin: 0 auto !important; }
.items-table { width: 100%; table-layout: fixed; }
.items-table th, .items-table td { overflow-wrap: anywhere; word-break: normal; }
.totals { width: min(100%, 300px); }
`;
  }

  return "";
}

function formatBDT(value) {
  if (value === undefined || value === null) return "৳0.00";
  const num = Number(value);
  if (isNaN(num)) return "৳0.00";
  return `৳${num.toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export class TemplateService {
  constructor() {
    this.cache = cache;
  }

  getCacheKey(templateName, version) {
    return `template:${templateName}:v${version}`;
  }

  async getTemplate(templateName) {
    const template = await receiptTemplateRepository.getActiveByName(templateName);
    if (!template) {
      // Return defaults if template not found
      return {
        ...getDefaults(templateName),
        name: templateName,
        version: DEFAULT_TEMPLATE_VERSION,
        _id: `default-${templateName}`,
      };
    }

    if (templateName === "pos-thermal" || templateName === "a4-standard") {
      return {
        ...template,
        body_template: getDefaults(templateName).body_template,
        version: Math.max(Number(template.version) || 0, DEFAULT_TEMPLATE_VERSION),
      };
    }
    return template;
  }

  async getCompiledTemplate(templateName, data) {
    const template = await this.getTemplate(templateName);
    const cacheKey = this.getCacheKey(templateName, template.version);

    let compiled = this.cache.get(cacheKey);
    if (!compiled) {
      compiled = this.assembleHtml(template);
      this.cache.set(cacheKey, compiled);
    }

    return this.render(compiled, data);
  }

  assembleHtml(template) {
    const styles = `${template.css_styles || ""}\n${receiptLayoutFixes(template.name)}`;
    const bodyTemplate = String(template.body_template || "").replace(
      /\{\{#if discountType\}\}\{\{#if discountValue\}\}\(\{\{discountValue\}\}%\)\{\{\/if\}\}\{\{\/if\}\}/g,
      "{{discountLabel}}",
    );
    return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta charset="utf-8">
  <title>Receipt</title>
  <style>${styles}</style>
</head>
<body>
  <header class="receipt-header">${template.header_html}</header>
  <main class="receipt-body">${bodyTemplate}</main>
  <footer class="receipt-footer">${template.footer_html}</footer>
</body>
</html>
    `.trim().replace(/<div([^>]*)\/>/gi, "<div$1></div>");
  }

  render(html, data) {
    // Prepare computed data
    const computedData = {
      ...data,
      date: data.createdAt ? new Date(data.createdAt).toLocaleString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }) : new Date().toLocaleString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      companyName: "A to Z Kids World",
      companyAddress: "Dhaka, Bangladesh",
      companyPhone: "+880 1XXX XXXXXX",
      companyEmail: "info@atozkidsworld.com",
      formatBDT: (val) => formatBDT(val),
    };

    // Compute derived values
    if (data.items && Array.isArray(data.items)) {
      computedData.subtotal = data.items.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 1), 0);
    } else {
      computedData.subtotal = Number(data.subtotal) || 0;
    }
    const storedPercentage = Number(data.discountValue) || 0;
    const percentageValue =
      data.discountType === "percentage" && storedPercentage > 0
        ? storedPercentage
        : data.discountType === "percentage" && computedData.subtotal > 0
          ? (Number(data.discount) / computedData.subtotal) * 100
          : 0;
    computedData.discountLabel =
      data.discountType === "percentage" && percentageValue
        ? `(${Number(percentageValue.toFixed(2))}%)`
        : "";
    if (data.amountPaid !== undefined && data.total !== undefined) {
      computedData.amountPaidNotEqualTotal = Number(data.amountPaid) !== Number(data.total);
    }

    return interpolate(html, computedData);
  }

  async updateCustomSections(templateId, updates, userId) {
    const allowedFields = ["header_html", "footer_html", "css_styles"];
    const sanitized = {};

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        sanitized[field] = sanitizeHtml(updates[field]);
      }
    }

    if (Object.keys(sanitized).length === 0) {
      const error = new Error("No valid fields to update");
      error.status = 400;
      throw error;
    }

    const updated = await receiptTemplateRepository.updateTemplate(templateId, sanitized, userId);

    // Invalidate cache
    this.cache.invalidate(`template:${updated.name}:*`);

    return updated;
  }

  async previewTemplate(templateName, sampleData) {
    return this.getCompiledTemplate(templateName, sampleData);
  }

  async listTemplates() {
    return receiptTemplateRepository.getAllActive();
  }

  async createTemplate(data, userId) {
    return receiptTemplateRepository.createTemplate(data, userId);
  }

  async deleteTemplate(id) {
    return receiptTemplateRepository.deleteTemplate(id);
  }

  // Initialize default templates if they don't exist
  async ensureDefaults() {
    const existing = await receiptTemplateRepository.getAllActive();
    const existingByName = new Map(existing.map((template) => [template.name, template]));

    const defaults = [
      {
        _id: "pos-thermal",
        name: "pos-thermal",
        version: DEFAULT_TEMPLATE_VERSION,
        ...getDefaults("pos-thermal"),
        is_active: true,
      },
      {
        _id: "a4-standard",
        name: "a4-standard",
        version: DEFAULT_TEMPLATE_VERSION,
        ...getDefaults("a4-standard"),
        is_active: true,
      },
    ];

    for (const def of defaults) {
      const current = existingByName.get(def.name);
      if (!current) {
        await receiptTemplateRepository.createTemplate(def, "system");
      } else if ((Number(current.version) || 0) < DEFAULT_TEMPLATE_VERSION) {
        await receiptTemplateRepository.updateById(current._id, {
          ...current,
          body_template: def.body_template,
          version: DEFAULT_TEMPLATE_VERSION,
          updated_at: new Date(),
        });
        this.cache.invalidate(`template:${def.name}:*`);
      }
    }
  }
}

export const templateService = new TemplateService();
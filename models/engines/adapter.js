const JSON_INSTANCES = new Set(["Mixed", "Array", "Embedded", "Object", "Map"]);

export function isJsonInstance(instance) {
  return JSON_INSTANCES.has(instance);
}

export function isBooleanInstance(instance) {
  return instance === "Boolean";
}

export function sqlType(instance) {
  if (JSON_INSTANCES.has(instance)) return "TEXT";
  if (instance === "Number" || instance === "Decimal100") return "REAL";
  if (instance === "Boolean") return "INTEGER";
  return "TEXT";
}

export function sqlTypeMysql(instance) {
  if (JSON_INSTANCES.has(instance)) return "JSON";
  if (instance === "Number" || instance === "Decimal100") return "DOUBLE";
  if (instance === "Boolean") return "TINYINT(1)";
  return "TEXT";
}

export function schemaColumns(model) {
  const schema = model && model.schema;
  if (!schema || !schema.paths) return [];
  const out = [];
  for (const path of Object.values(schema.paths)) {
    const name = path && path.path;
    if (
      !name ||
      name === "_id" ||
      name === "__v" ||
      name === "id" ||
      name === "$**" ||
      name.includes(".")
    ) {
      continue;
    }
    out.push({ name, instance: path.instance });
  }
  return out;
}

export function serializeValue(value, instance) {
  if (value === undefined) return null;
  if (isJsonInstance(instance)) {
    if (value === null) return null;
    return JSON.stringify(value);
  }
  if (value instanceof Date) return value.toISOString();
  if (isBooleanInstance(instance)) return value ? 1 : 0;
  if (typeof value === "object") return String(value);
  return value;
}

export function parseValue(raw, instance) {
  if (raw === undefined || raw === null) return raw;
  if (isJsonInstance(instance)) {
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }
  if (isBooleanInstance(instance)) return Boolean(raw);
  return raw;
}

export function rowToRecord(row, columns) {
  if (!row) return null;
  const out = { ...row };
  if (out._id !== undefined) out._id = String(out._id);
  for (const { name, instance } of columns) {
    if (Object.prototype.hasOwnProperty.call(out, name)) {
      out[name] = parseValue(row[name], instance);
    }
  }
  return out;
}

export function coerceId(id) {
  if (id === undefined || id === null) return id;
  return typeof id === "object" ? String(id) : String(id);
}

export function generateId() {
  return crypto.randomUUID().replace(/-/g, "");
}

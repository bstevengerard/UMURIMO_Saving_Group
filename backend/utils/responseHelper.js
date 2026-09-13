function toCamelCase(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(toCamelCase);
  if (obj instanceof Date) return obj.toISOString();
  if (obj && typeof obj === 'object' && typeof obj.toNumber === 'function') {
    return Number(obj.toNumber());
  }
  const result = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      result[camelKey] = toCamelCase(obj[key]);
    }
  }
  return result;
}

function pruneSensitive(obj, keys) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(item => pruneSensitive(item, keys));
  const result = { ...obj };
  for (const key of keys) {
    delete result[key];
  }
  return result;
}

module.exports = { toCamelCase, pruneSensitive };

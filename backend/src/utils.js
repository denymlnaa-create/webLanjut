export function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function parseSpecs(specs = []) {
  if (!Array.isArray(specs)) return [];
  return specs
    .map((item, index) => ({
      key: String(item.key || item.spec_key || '').trim(),
      value: String(item.value || item.spec_value || '').trim(),
      sort: Number(item.sort_order ?? index),
    }))
    .filter(item => item.key && item.value);
}

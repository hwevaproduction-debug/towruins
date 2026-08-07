const DEFAULT_MAX_SIZE = 200;
const DEFAULT_TTL_MS = 60 * 1000;

class SearchCache {
  constructor({ maxSize = DEFAULT_MAX_SIZE, ttlMs = DEFAULT_TTL_MS } = {}) {
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
    this.store = new Map();
  }

  get(key) {
    const entry = this.store.get(key);

    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    this.store.delete(key);
    this.store.set(key, entry);
    return entry.value;
  }

  set(key, value) {
    if (this.store.has(key)) {
      this.store.delete(key);
    }

    this.store.set(key, {
      value,
      expiresAt: Date.now() + this.ttlMs,
    });

    while (this.store.size > this.maxSize) {
      const oldestKey = this.store.keys().next().value;
      this.store.delete(oldestKey);
    }
  }

  clear() {
    this.store.clear();
  }
}

const toSortedValues = (value) => {
  const values = Array.isArray(value) ? value : [value];

  return values
    .filter((item) => item !== undefined && item !== null && item !== "")
    .map((item) => String(item))
    .sort();
};

const createSearchCacheKey = (query = {}) => {
  const pairs = [];

  Object.keys(query)
    .sort()
    .forEach((key) => {
      toSortedValues(query[key]).forEach((value) => {
        pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
      });
    });

  return pairs.join("&");
};

module.exports = {
  SearchCache,
  createSearchCacheKey,
  searchCache: new SearchCache(),
};

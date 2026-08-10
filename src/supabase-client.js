export function createClient(url, anonKey, options = {}) {
  const baseUrl = `${url.replace(/\/$/, '')}/rest/v1`;
  const baseHeaders = {
    apikey: anonKey,
    Authorization: `Bearer ${anonKey}`,
    ...options.global?.headers,
  };

  return {
    from(table) {
      return new QueryBuilder(baseUrl, table, baseHeaders);
    },
    schema() {
      return new QueryBuilder(baseUrl, '', baseHeaders);
    },
    rpc(functionName, args = {}) {
      const query = new QueryBuilder(baseUrl, `rpc/${encodeURIComponent(functionName)}`, baseHeaders);
      query.method = 'POST';
      query.payload = args;
      return query;
    },
  };
}

class QueryBuilder {
  constructor(baseUrl, table, headers) {
    this.baseUrl = baseUrl;
    this.table = table;
    this.headers = headers;
    this.params = new URLSearchParams();
    this.method = 'GET';
    this.payload = null;
  }

  select(columns = '*') {
    this.params.set('select', columns);
    return this;
  }

  order(column, options = {}) {
    const direction = options.ascending === false ? 'desc' : 'asc';
    this.params.append('order', `${column}.${direction}`);
    return this;
  }

  eq(column, value) {
    this.params.append(column, `eq.${value}`);
    return this;
  }

  gte(column, value) {
    this.params.append(column, `gte.${value}`);
    return this;
  }

  lt(column, value) {
    this.params.append(column, `lt.${value}`);
    return this;
  }

  in(column, values) {
    this.params.append(column, `in.(${values.join(',')})`);
    return this;
  }

  insert(payload) {
    this.method = 'POST';
    this.payload = payload;
    return this.execute();
  }

  update(payload) {
    this.method = 'PATCH';
    this.payload = payload;
    return this.execute();
  }

  then(resolve, reject) {
    return this.execute().then(resolve, reject);
  }

  async execute() {
    const query = this.params.toString();
    const endpoint = `${this.baseUrl}/${this.table}${query ? `?${query}` : ''}`;
    let response;
    try {
      response = await fetch(endpoint, {
        method: this.method,
        headers: {
          ...this.headers,
          ...(this.payload ? { 'Content-Type': 'application/json', Prefer: 'return=representation' } : {}),
        },
        body: this.payload ? JSON.stringify(this.payload) : undefined,
      });
    } catch (error) {
      return {
        data: null,
        error: {
          message: `Не удалось подключиться к Supabase REST (${new URL(endpoint).host}): ${error.message}`,
          details: error,
        },
      };
    }

    const text = await response.text();
    let data = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = { message: text.slice(0, 500) };
      }
    }

    if (!response.ok) {
      return {
        data: null,
        error: {
          message: data?.message || `${response.status} ${response.statusText}`,
          code: data?.code || String(response.status),
          details: data,
          endpoint,
        },
      };
    }

    return { data, error: null };
  }
}

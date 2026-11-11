import {readFileSync} from 'node:fs';
import Ajv2020, {type AnySchema} from 'ajv/dist/2020';
import addFormats from 'ajv-formats';

export type Schema = Record<string, unknown>;
export type Parameter = { name: string; in: string; required?: boolean; schema: Schema; style?: string; explode?: boolean };
type Content = { required?: boolean; content?: Record<string, { schema?: Schema; encoding?: Record<string, {contentType?: string}> }> };
type Operation = { parameters?: Parameter[]; requestBody?: Content; responses: Record<string, Content> };
type Document = {
    openapi: string;
    paths: Record<string, Record<string, Operation> & { parameters?: Parameter[] }>;
    components: { schemas: Record<string, Schema> }
};
export type ContractRequest = {
    method: string;
    url: string;
    headers?: Record<string, string>;
    body?: unknown;
    contentType?: string
};
export type ContractResult = {
    valid: boolean;
    errors: string[];
    unsupported?: string[];
    unverified?: string[];
    undeclaredQuery?: string[];
    coverage?: 'concrete' | 'free-json' | 'transport-only'
};

/** Node-only test utility. Reads P0 directly; never imports FE schemas or MSW. */
export function createOpenApiContract(path: 'contracts/openapi.json' = 'contracts/openapi.json') {
    const doc = JSON.parse(readFileSync(path, 'utf8')) as Document;
    if (!doc.openapi.startsWith('3.1.')) throw new Error('OpenAPI 3.1 required');
    const ajv = new Ajv2020({
        allErrors: true,
        strict: false,
        coerceTypes: false,
        useDefaults: false,
        removeAdditional: false
    });
    addFormats(ajv);
    ajv.addSchema({$id: 'urn:wageitda:contract', components: doc.components});

    function resolve<T>(node: T): T {
        if (node && typeof node === 'object' && '$ref' in node) {
            const ref = String(node.$ref);
            if (!ref.startsWith('#/')) throw new Error('External reference unsupported: ' + ref);
            return resolve(ref.slice(2).split('/').reduce<unknown>((v, k) => (v as Schema)[k.replace(/~1/g, '/').replace(/~0/g, '~')], doc) as T);
        }
        return node;
    }

    function schemaGaps(schema: Schema, path = '/', seen = new Set<Schema>()): string[] {
        const node = resolve(schema);
        if (seen.has(node)) return [];
        const next = new Set(seen).add(node);
        if (Object.keys(node).length === 0) return ['Free JSON internal structure: ' + path];
        const gaps: string[] = [];
        if (node.type === 'object' && !node.properties && node.additionalProperties !== false)
            gaps.push('Free JSON object contents: ' + path);
        for (const [key, child] of Object.entries(node.properties as Record<string, Schema> ?? {}))
            gaps.push(...schemaGaps(child, path + key + '/', next));
        if (node.items && typeof node.items === 'object') gaps.push(...schemaGaps(node.items as Schema, path + 'items/', next));
        for (const child of (node.anyOf ?? node.oneOf ?? []) as Schema[]) gaps.push(...schemaGaps(child, path, next));
        return [...new Set(gaps)];
    }

    const validators = new Map<string, ReturnType<typeof ajv.compile>>();

    function validate(schema: Schema, value: unknown): ContractResult {
        const key = JSON.stringify(schema);
        let fn = validators.get(key);
        if (!fn) {
            fn = ajv.compile({...schema, components: doc.components} as AnySchema);
            validators.set(key, fn);
        }
        const valid = Boolean(fn(value));
        return {
            valid,
            unverified: schemaGaps(schema),
            errors: valid ? [] : (fn.errors ?? []).map(e => `${e.instancePath || '/'} ${e.keyword}: ${e.message}`)
        };
    }

    function operation(input: ContractRequest) {
        const url = new URL(input.url, 'http://contract.invalid');
        const paths = Object.keys(doc.paths).sort((a, b) => Number(a.includes('{')) - Number(b.includes('{')));
        for (const path of paths) {
            const names: string[] = [];
            const pattern = path.split('/').map(part => {
                if (part.startsWith('{')) {
                    names.push(part.slice(1, -1));
                    return '([^/]+)';
                }
                return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            }).join('/');
            const match = url.pathname.match(new RegExp('^' + pattern + '$'));
            if (!match) continue;
            const item = doc.paths[path];
            const op = item[input.method.toLowerCase()];
            if (!op) throw new Error('Undeclared method: ' + input.method);
            const merged = new Map<string, Parameter>();
            for (const raw of [...(item.parameters ?? []), ...(op.parameters ?? [])]) {
                const p = resolve(raw);
                merged.set(p.in + ':' + p.name, p);
            }
            return {
                op,
                url,
                parameters: [...merged.values()],
                values: Object.fromEntries(names.map((n, i) => [n, decodeURIComponent(match[i + 1])]))
            };
        }
        throw new Error('Undeclared path: ' + url.pathname);
    }

    function primitive(schema: Schema, raw: string): unknown {
        const branches = (resolve(schema).anyOf ?? resolve(schema).oneOf ?? [resolve(schema)]) as Schema[];
        const candidates = branches.map(b => {
            b = resolve(b);
            if ((b.type === 'integer' || b.type === 'number') && /^-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?$/.test(raw)) return Number(raw);
            if (b.type === 'boolean' && /^(true|false)$/.test(raw)) return raw === 'true';
            return raw;
        });
        return candidates.find(v => validate(schema, v).valid) ?? candidates[0];
    }

    function request(input: ContractRequest, policy: {rejectUndeclaredQuery?: boolean} = {}): ContractResult {
        const errors: string[] = [], unsupported: string[] = [], unverified: string[] = [], undeclaredQuery: string[] = [];
        try {
            const {op, url, parameters, values} = operation(input);
            const headers = Object.fromEntries(Object.entries(input.headers ?? {}).map(([k, v]) => [k.toLowerCase(), v]));
            for (const key of new Set(url.searchParams.keys())) if (!parameters.some(p => p.in === 'query' && p.name === key)) {
                undeclaredQuery.push(key);
                if (policy.rejectUndeclaredQuery) errors.push('Query policy (not OpenAPI): ' + key);
            }
            for (const p of parameters) {
                const raw = p.in === 'path' ? [values[p.name]] : p.in === 'query' ? url.searchParams.getAll(p.name) : p.in === 'header' ? [headers[p.name.toLowerCase()]] : [];
                if (!raw.length || raw[0] === undefined) {
                    if (p.required) errors.push('Missing ' + p.in + ': ' + p.name);
                    if (!['path', 'query', 'header'].includes(p.in)) unsupported.push('Parameter location: ' + p.in);
                    continue;
                }
                const schema = resolve(p.schema);
                const decoded = decodeParameter(p, schema, raw, primitive);
                errors.push(...decoded.errors);
                unsupported.push(...decoded.unsupported);
                if (!decoded.unsupported.length) errors.push(...validate(p.schema, decoded.value).errors.map(e => p.in + '.' + p.name + ': ' + e));
            }
            const body = resolve(op.requestBody);
            if (!body && input.body !== undefined) errors.push('Undeclared request body');
            if (body?.required && input.body === undefined) errors.push('Missing request body');
            if (body && input.body !== undefined) {
                const type = mediaType(input.contentType ?? headers['content-type'] ?? (input.body instanceof FormData ? 'multipart/form-data' : 'application/json'));
                const entry = body.content?.[type];
                if (!entry) errors.push('Undeclared request media type');
                else if (!entry.schema) unsupported.push('Request schema absent: ' + type);
                else if (type === 'application/json') {
                    const result = validate(entry.schema, input.body);
                    errors.push(...result.errors); unverified.push(...result.unverified ?? []);
                }
                else if (type === 'multipart/form-data') {
                    if (!(input.body instanceof FormData)) errors.push('Expected FormData');
                    else {
                        const schema = resolve(entry.schema), data: Schema = {};
                        const properties = schema.properties as Record<string, Schema> ?? {};
                        for (const key of new Set(input.body.keys())) {
                            const part = properties[key] && resolve(properties[key]);
                            const parts = input.body.getAll(key);
                            if (!part) { data[key] = parts.length === 1 ? parts[0] : parts; continue; }
                            const item = part.type === 'array' ? resolve(part.items as Schema) : part;
                            if (part.type !== 'array' && parts.length > 1) errors.push('Repeated multipart scalar: ' + key);
                            const converted = parts.map(value => {
                                if (item.contentMediaType || item.format === 'binary') {
                                    if (!(value instanceof Blob) || !('name' in value)) errors.push('Expected file part: ' + key);
                                    else {
                                        // octet-stream denotes arbitrary file bytes, not a PDF-only restriction.
                                        const expected = entry.encoding?.[key]?.contentType ?? item.contentMediaType;
                                        if (expected && expected !== 'application/octet-stream' && value.type !== expected) errors.push('File Content-Type: ' + key);
                                        unverified.push('File contents: ' + key);
                                    }
                                    return '';
                                }
                                if (typeof value !== 'string') { errors.push('Expected text part: ' + key); return value; }
                                if (item.type === 'object' || item.type === 'array') unsupported.push('Multipart structured part: ' + key);
                                return primitive(item, value);
                            });
                            data[key] = part.type === 'array' ? converted : converted[0];
                        }
                        errors.push(...validate(schema, data).errors);
                    }
                } else unsupported.push('Request media type: ' + type);
            }
        } catch (e) { errors.push((e as Error).message); }
        return {valid: errors.length === 0 && unsupported.length === 0, errors, unsupported, unverified, undeclaredQuery};
    }

    function response(input: ContractRequest, status: number, body?: unknown, contentType = 'application/json'): ContractResult {
        try {
            const {op} = operation(input);
            const declared = resolve(op.responses[String(status)]);
            if (!declared) return {valid: false, errors: ['Undeclared status: ' + status]};
            const type = mediaType(contentType);
            const binary = ['application/pdf', 'image/png', 'image/jpeg', 'application/zip', 'application/octet-stream'].includes(type);
            const binaryBody = body instanceof Blob || body instanceof ArrayBuffer;
            if (!declared.content && status !== 204 && status !== 304 && binary) return {
                valid: binaryBody, errors: binaryBody ? [] : ['Expected Blob or ArrayBuffer'],
                coverage: 'transport-only', unverified: ['Response media type/body unspecified by OpenAPI', 'Binary file contents']
            };
            if (!declared.content) return {
                valid: body === undefined,
                errors: body === undefined ? [] : ['Unexpected body'],
                coverage: 'transport-only'
            };
            const entry = declared.content[type];
            if (!entry) return {valid: false, errors: ['Undeclared response media type']};
            const schema = entry.schema;
            if (binary) {
                const supported = !schema || Object.keys(resolve(schema)).length === 0 || (resolve(schema).type === 'string' && resolve(schema).format === 'binary' && Object.keys(resolve(schema)).every(k => ['type', 'format', 'title', 'description'].includes(k)));
                const errors = binaryBody ? [] : ['Expected Blob or ArrayBuffer'];
                if (body instanceof Blob && body.type && mediaType(body.type) !== type) errors.push('Blob Content-Type mismatch');
                return {valid: !errors.length && supported, errors, coverage: 'transport-only',
                    unsupported: supported ? [] : ['Binary schema constraints'],
                    unverified: ['Binary file contents', ...(!schema ? ['Binary schema absent'] : [])]};
            }
            if (type !== 'application/json' || !schema) return {valid: false, errors: [], unsupported: ['Response media type/schema: ' + type]};
            const properties = resolve(schema).properties as Record<string, Schema> | undefined;
            const data = properties?.data;
            const free = data !== undefined && Object.keys(resolve(data)).length === 0;
            const transport = !contentType.toLowerCase().startsWith('application/json');
            return {
                ...validate(schema, body),
                unverified: free ? ['Envelope.data internal DTO unspecified'] : schemaGaps(schema),
                coverage: transport ? 'transport-only' : free ? 'free-json' : 'concrete'
            };
        } catch (e) {
            return {valid: false, errors: [(e as Error).message]};
        }
    }

    return {
        request, response,
        async httpResponse(input: ContractRequest, actual: Response): Promise<ContractResult> {
            try {
                const copy = actual.clone(), type = copy.headers.get('content-type') ?? '';
                const body = !copy.body ? undefined : mediaType(type) === 'application/json' ? await copy.json() : await copy.blob();
                return response(input, copy.status, body, type);
            } catch (e) { return {valid: false, errors: [(e as Error).message]}; }
        },
        component(name: string, value: unknown) {
            if (!(name in doc.components.schemas)) throw new Error('Unknown component: ' + name);
            return validate({$ref: '#/components/schemas/' + name}, value);
        }, compileAll() {
            for (const name of Object.keys(doc.components.schemas)) validate({$ref: '#/components/schemas/' + name}, undefined);
        }
    };
}

function mediaType(value: string) { return value.split(';')[0].trim().toLowerCase(); }

/** Pure serialization decoder; synthetic unit cases do not replace the P0 document. */
export function decodeParameter(p: Parameter, schema: Schema, raw: string[], primitive: (s: Schema, v: string) => unknown) {
    const errors: string[] = [], unsupported: string[] = [];
    const style = p.style ?? (p.in === 'query' ? 'form' : 'simple');
    const explode = p.explode ?? style === 'form';
    const branches = (schema.anyOf ?? schema.oneOf ?? [schema]) as Schema[];
    const array = branches.find(b => b.type === 'array');
    if (style !== (p.in === 'query' ? 'form' : 'simple') || branches.some(b => b.type === 'object') ||
        (array && p.in !== 'query')) unsupported.push('Parameter serialization: ' + p.name + ' ' + style + '/' + explode);
    let value: unknown;
    if (array) {
        if (!explode && raw.length > 1) errors.push('Repeated non-exploded array: ' + p.name);
        const parts = explode ? raw : raw[0].split(',');
        value = parts.map(v => primitive(array.items as Schema, v));
    } else {
        if (raw.length > 1) errors.push('Repeated scalar: ' + p.name);
        value = primitive(schema, raw[0]);
    }
    return {value, errors, unsupported};
}

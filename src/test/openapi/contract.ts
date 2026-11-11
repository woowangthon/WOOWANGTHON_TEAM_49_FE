import {readFileSync} from 'node:fs';
import Ajv2020, {type AnySchema} from 'ajv/dist/2020';
import addFormats from 'ajv-formats';

type Schema = Record<string, unknown>;
type Parameter = { name: string; in: string; required?: boolean; schema: Schema };
type Content = { required?: boolean; content?: Record<string, { schema: Schema }> };
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
    coverage?: 'concrete' | 'free-json' | 'transport-only'
};

/** Node-only test utility. Reads P0 directly; never imports FE schemas or MSW. */
export function createOpenApiContract(path = 'contracts/openapi.json') {
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

    function request(input: ContractRequest): ContractResult {
        const errors: string[] = [];
        try {
            const {op, url, parameters, values} = operation(input);
            const headers = Object.fromEntries(Object.entries(input.headers ?? {}).map(([k, v]) => [k.toLowerCase(), v]));
            for (const key of url.searchParams.keys()) if (!parameters.some(p => p.in === 'query' && p.name === key)) errors.push('Undeclared query: ' + key);
            for (const p of parameters) {
                const raw = p.in === 'path' ? values[p.name] : p.in === 'query' ? url.searchParams.get(p.name) ?? undefined : p.in === 'header' ? headers[p.name.toLowerCase()] : undefined;
                if (raw === undefined) {
                    if (p.required) errors.push('Missing ' + p.in + ': ' + p.name);
                    continue;
                }
                const schema = resolve(p.schema);
                const value = (schema.type === 'integer' || schema.type === 'number') && /^-?(0|[1-9]\d*)(\.\d+)?$/.test(raw) ? Number(raw) : schema.type === 'boolean' && /^(true|false)$/.test(raw) ? raw === 'true' : raw;
                errors.push(...validate(p.schema, value).errors.map(e => p.in + '.' + p.name + ': ' + e));
            }
            const body = resolve(op.requestBody);
            if (!body && input.body !== undefined) errors.push('Undeclared request body');
            if (body?.required && input.body === undefined) errors.push('Missing request body');
            if (body && input.body !== undefined) {
                const type = (input.contentType ?? headers['content-type'] ?? 'application/json').split(';')[0].trim().toLowerCase();
                const schema = body.content?.[type]?.schema;
                if (!schema) errors.push('Undeclared request media type/schema');
                else errors.push(...validate(schema, input.body).errors);
            }
        } catch (e) {
            errors.push((e as Error).message);
        }
        return {valid: errors.length === 0, errors};
    }

    function response(input: ContractRequest, status: number, body?: unknown, contentType = 'application/json'): ContractResult {
        try {
            const {op} = operation(input);
            const declared = resolve(op.responses[String(status)]);
            if (!declared) return {valid: false, errors: ['Undeclared status: ' + status]};
            if (!declared.content) return {
                valid: body === undefined,
                errors: body === undefined ? [] : ['Unexpected body'],
                coverage: 'transport-only'
            };
            const schema = declared.content[contentType.split(';')[0].trim().toLowerCase()]?.schema;
            if (!schema) return {valid: false, errors: ['Undeclared response media type/schema']};
            const properties = resolve(schema).properties as Record<string, Schema> | undefined;
            const data = properties?.data;
            const free = data !== undefined && Object.keys(resolve(data)).length === 0;
            const transport = !contentType.toLowerCase().startsWith('application/json');
            return {
                ...validate(schema, body),
                coverage: transport ? 'transport-only' : free ? 'free-json' : 'concrete'
            };
        } catch (e) {
            return {valid: false, errors: [(e as Error).message]};
        }
    }

    return {
        request, response, component(name: string, value: unknown) {
            if (!(name in doc.components.schemas)) throw new Error('Unknown component: ' + name);
            return validate({$ref: '#/components/schemas/' + name}, value);
        }, compileAll() {
            for (const name of Object.keys(doc.components.schemas)) validate({$ref: '#/components/schemas/' + name}, undefined);
        }
    };
}

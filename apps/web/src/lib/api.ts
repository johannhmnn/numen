import { z } from 'zod';

const accountTypeSchema = z.enum([
	'Assets',
	'Liabilities',
	'Equity',
	'Income',
	'Expenses'
]);

const accountSchema = z.object({
	name: z.string(),
	type: accountTypeSchema
});

const postingSchema = z.object({
	account: z.string(),
	amount: z.string()
});

const transactionSchema = z.object({
	date: z.string(),
	title: z.string(),
	payee: z.string().nullable(),
	primary_category: z.string().nullable(),
	tags: z.array(z.string()),
	postings: z.array(postingSchema)
});

const createAccountInputSchema = z.object({
	name: z.string().min(1),
	type: accountTypeSchema
});

const createTransactionInputSchema = z.object({
	date: z.string().min(1),
	title: z.string().min(1),
	payee: z.string().nullable(),
	primary_category: z.string().nullable(),
	tags: z.array(z.string()),
	postings: z.array(postingSchema).min(2)
});

const statusResponseSchema = z.object({
	status: z.literal('created')
});

const errorResponseSchema = z.object({
	error: z.string()
});

export type AccountType = z.infer<typeof accountTypeSchema>;
export type Account = z.infer<typeof accountSchema>;
export type Posting = z.infer<typeof postingSchema>;
export type Transaction = z.infer<typeof transactionSchema>;
export type CreateAccountInput = z.infer<typeof createAccountInputSchema>;
export type CreateTransactionInput = z.infer<typeof createTransactionInputSchema>;

export const accountsSchema = z.array(accountSchema);
export const transactionsSchema = z.array(transactionSchema);
export const createAccountResponseSchema = accountSchema;
export const createTransactionResponseSchema = statusResponseSchema;

export const NUMEN_API_BASE_URL =
	import.meta.env.PUBLIC_NUMEN_API_BASE_URL ?? 'http://127.0.0.1:3000';

export class NumenApiError extends Error {
	readonly status: number;

	constructor(message: string, status: number) {
		super(message);
		this.name = 'NumenApiError';
		this.status = status;
	}
}

type FetchLike = typeof fetch;

interface ApiClientOptions {
	baseUrl?: string;
	fetch?: FetchLike;
}

export function createNumenApiClient(options: ApiClientOptions = {}) {
	const baseUrl = options.baseUrl ?? NUMEN_API_BASE_URL;
	const fetchImpl = options.fetch ?? fetch;

	return {
		listAccounts: () => requestJson('/accounts', accountsSchema, { fetchImpl, baseUrl }),
		createAccount: (input: CreateAccountInput) =>
			requestJson('/accounts', createAccountResponseSchema, {
				method: 'POST',
				body: createAccountInputSchema.parse(input),
				fetchImpl,
				baseUrl
			}),
		listTransactions: () =>
			requestJson('/transactions', transactionsSchema, { fetchImpl, baseUrl }),
		createTransaction: (input: CreateTransactionInput) =>
			requestJson('/transactions', createTransactionResponseSchema, {
				method: 'POST',
				body: createTransactionInputSchema.parse(input),
				fetchImpl,
				baseUrl
			})
	};
}

interface RequestOptions {
	method?: 'GET' | 'POST';
	body?: unknown;
	fetchImpl: FetchLike;
	baseUrl: string;
}

async function requestJson<T>(
	path: string,
	schema: z.ZodSchema<T>,
	options: RequestOptions
): Promise<T> {
	const response = await options.fetchImpl(buildUrl(path, options.baseUrl), {
		method: options.method ?? 'GET',
		headers: options.body ? { 'content-type': 'application/json' } : undefined,
		body: options.body ? JSON.stringify(options.body) : undefined
	});

	if (!response.ok) {
		throw new NumenApiError(await extractErrorMessage(response), response.status);
	}

	return schema.parse(await response.json());
}

function buildUrl(path: string, baseUrl: string): string {
	return new URL(path, ensureTrailingSlash(baseUrl)).toString();
}

function ensureTrailingSlash(value: string): string {
	return value.endsWith('/') ? value : `${value}/`;
}

async function extractErrorMessage(response: Response): Promise<string> {
	try {
		return errorResponseSchema.parse(await response.json()).error;
	} catch {
		return response.statusText || `Request failed with status ${response.status}`;
	}
}

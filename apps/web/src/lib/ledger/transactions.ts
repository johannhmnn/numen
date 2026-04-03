import { z } from 'zod';

import type { Account, AccountType, CreateTransactionInput } from '$lib/api';
import { ptBrCopy } from '$lib/locale';

import { CATEGORY_ACCOUNT_TYPES, FUNDING_ACCOUNT_TYPES } from './accounts';

const guidableAmountPattern = /^\d+([.,]\d{1,2})?$/;
const zeroAmountPattern = /^0+(?:[.,]0{1,2})?$/;
const fundingAccountTypeSet = new Set<AccountType>(FUNDING_ACCOUNT_TYPES);
const categoryAccountTypeSet = new Set<AccountType>(CATEGORY_ACCOUNT_TYPES);

const baseGuidedTransactionSchema = z.object({
	date: z
		.string()
		.trim()
		.regex(/^\d{4}-\d{2}-\d{2}$/, ptBrCopy.transactionValidation.dateInvalid),
	title: z.string().trim().min(1, ptBrCopy.transactionValidation.titleRequired),
	payee: z.string().trim(),
	fundingAccount: z.string().trim().min(1, ptBrCopy.transactionValidation.fundingAccountRequired),
	categoryAccount: z.string().trim().min(1, ptBrCopy.transactionValidation.categoryAccountRequired),
	amount: z
		.string()
		.trim()
		.min(1, ptBrCopy.transactionValidation.amountRequired)
		.regex(guidableAmountPattern, ptBrCopy.transactionValidation.amountInvalid)
		.refine(
			(value) => !zeroAmountPattern.test(value),
			ptBrCopy.transactionValidation.amountPositive
		),
	tags: z.string().trim()
});

export type GuidedTransactionForm = z.input<typeof baseGuidedTransactionSchema>;
export type GuidedTransactionField = keyof GuidedTransactionForm;

export function createGuidedTransactionSchema(accounts: Account[]) {
	const fundingAccountNames = new Set(
		accounts
			.filter((account) => fundingAccountTypeSet.has(account.type))
			.map((account) => account.name)
	);
	const categoryAccounts = new Map(
		accounts
			.filter((account) => categoryAccountTypeSet.has(account.type))
			.map((account) => [account.name, account.type] as const)
	);

	return baseGuidedTransactionSchema
		.superRefine((value, context) => {
			if (!fundingAccountNames.has(value.fundingAccount)) {
				context.addIssue({
					code: 'custom',
					path: ['fundingAccount'],
					message: ptBrCopy.transactionValidation.fundingAccountDesk
				});
			}

			if (!categoryAccounts.has(value.categoryAccount)) {
				context.addIssue({
					code: 'custom',
					path: ['categoryAccount'],
					message: ptBrCopy.transactionValidation.categoryAccountDesk
				});
			}
		})
		.transform((value): CreateTransactionInput => {
			const normalizedAmount = normalizeAmount(value.amount);
			const categoryType = categoryAccounts.get(value.categoryAccount) ?? 'Expenses';
			const categoryPostingAmount = applyIncreaseSign(categoryType, normalizedAmount);

			return {
				date: value.date,
				title: value.title,
				payee: value.payee || null,
				primary_category: value.categoryAccount,
				tags: normalizeTransactionTags(value.tags),
				postings: [
					{
						account: value.fundingAccount,
						amount: invertAmount(categoryPostingAmount)
					},
					{
						account: value.categoryAccount,
						amount: categoryPostingAmount
					}
				]
			};
		});
}

export function normalizeTransactionTags(value: string): string[] {
	return value
		.split(',')
		.map((tag) => tag.trim())
		.filter(Boolean);
}

export function buildGuidedTransactionFieldErrors(
	error: z.ZodError
): Partial<Record<GuidedTransactionField, string>> {
	const fieldErrors = error.flatten().fieldErrors as Partial<
		Record<GuidedTransactionField, string[] | undefined>
	>;

	return {
		date: fieldErrors.date?.[0],
		title: fieldErrors.title?.[0],
		payee: fieldErrors.payee?.[0],
		fundingAccount: fieldErrors.fundingAccount?.[0],
		categoryAccount: fieldErrors.categoryAccount?.[0],
		amount: fieldErrors.amount?.[0],
		tags: fieldErrors.tags?.[0]
	};
}

function normalizeAmount(value: string): string {
	const normalizedValue = value.replace(',', '.');
	const [whole, fractional = ''] = normalizedValue.split('.');

	if (fractional.length === 0) {
		return `${whole}.00`;
	}

	if (fractional.length === 1) {
		return `${whole}.${fractional}0`;
	}

	return `${whole}.${fractional}`;
}

function applyIncreaseSign(type: AccountType, amount: string): string {
	if (type === 'Assets' || type === 'Expenses') {
		return amount;
	}

	return `-${amount}`;
}

function invertAmount(amount: string): string {
	return amount.startsWith('-') ? amount.slice(1) : `-${amount}`;
}

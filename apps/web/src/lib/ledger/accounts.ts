import type { Account, AccountType } from '$lib/api';

export const FUNDING_ACCOUNT_TYPES = ['Assets', 'Liabilities'] as const satisfies AccountType[];
export const CATEGORY_ACCOUNT_TYPES = ['Expenses', 'Income'] as const satisfies AccountType[];
export const ACCOUNT_TYPE_OPTIONS = [
	'Assets',
	'Liabilities',
	'Equity',
	'Income',
	'Expenses'
] as const satisfies AccountType[];

const FUNDING_ACCOUNT_TYPE_SET = new Set<AccountType>(FUNDING_ACCOUNT_TYPES);
const CATEGORY_ACCOUNT_TYPE_SET = new Set<AccountType>(CATEGORY_ACCOUNT_TYPES);

export interface AccountGroup {
	label: string;
	emptyLabel: string;
	entries: Account[];
}

export interface AccountSetupSummary {
	fundingAccounts: Account[];
	categoryAccounts: Account[];
	accountGroups: AccountGroup[];
	canRecordTransactions: boolean;
	headline: string;
	detail: string;
}

export function buildAccountSetupSummary(accounts: Account[]): AccountSetupSummary {
	const fundingAccounts = sortAccounts(accounts.filter((account) => isFundingAccount(account.type)));
	const categoryAccounts = sortAccounts(
		accounts.filter((account) => isCategoryAccount(account.type))
	);
	const accountGroups: AccountGroup[] = [
		{
			label: 'Funding accounts',
			emptyLabel: 'No funding accounts yet. Add one below to continue.',
			entries: fundingAccounts
		},
		{
			label: 'Category accounts',
			emptyLabel: 'No category accounts yet. Add one below to continue.',
			entries: categoryAccounts
		}
	];

	if (fundingAccounts.length === 0 && categoryAccounts.length === 0) {
		return {
			fundingAccounts,
			categoryAccounts,
			accountGroups,
			canRecordTransactions: false,
			headline: 'Add one funding account and one category account to unlock structured entry.',
			detail: 'The guided flow needs one account to move money from and one account to classify it.'
		};
	}

	if (fundingAccounts.length === 0) {
		return {
			fundingAccounts,
			categoryAccounts,
			accountGroups,
			canRecordTransactions: false,
			headline: 'Create at least one funding account to unlock structured entry.',
			detail: 'Funding accounts are the Assets or Liabilities you spend from or get paid into.'
		};
	}

	if (categoryAccounts.length === 0) {
		return {
			fundingAccounts,
			categoryAccounts,
			accountGroups,
			canRecordTransactions: false,
			headline: 'Create at least one category account to unlock structured entry.',
			detail: 'Category accounts are your Expenses and Income anchors for each transaction.'
		};
	}

	return {
		fundingAccounts,
		categoryAccounts,
		accountGroups,
		canRecordTransactions: true,
		headline: 'Funding and category accounts are ready for guided entry.',
		detail: 'You can now pick a source account and a category account for every new transaction.'
	};
}

function sortAccounts(accounts: Account[]): Account[] {
	return [...accounts].sort((left, right) => left.name.localeCompare(right.name));
}

function isFundingAccount(type: AccountType): boolean {
	return FUNDING_ACCOUNT_TYPE_SET.has(type);
}

function isCategoryAccount(type: AccountType): boolean {
	return CATEGORY_ACCOUNT_TYPE_SET.has(type);
}

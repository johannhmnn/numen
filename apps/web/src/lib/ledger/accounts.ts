import type { Account, AccountType } from '$lib/api';
import { APP_LOCALE, ptBrCopy } from '$lib/locale';

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
	const fundingAccounts = sortAccounts(
		accounts.filter((account) => isFundingAccount(account.type))
	);
	const categoryAccounts = sortAccounts(
		accounts.filter((account) => isCategoryAccount(account.type))
	);
	const accountGroups: AccountGroup[] = [
		{
			label: ptBrCopy.accountSetup.groups.fundingLabel,
			emptyLabel: ptBrCopy.accountSetup.groups.fundingEmptyLabel,
			entries: fundingAccounts
		},
		{
			label: ptBrCopy.accountSetup.groups.categoryLabel,
			emptyLabel: ptBrCopy.accountSetup.groups.categoryEmptyLabel,
			entries: categoryAccounts
		}
	];

	if (fundingAccounts.length === 0 && categoryAccounts.length === 0) {
		return {
			fundingAccounts,
			categoryAccounts,
			accountGroups,
			canRecordTransactions: false,
			headline: ptBrCopy.accountSetup.states.missingBoth.headline,
			detail: ptBrCopy.accountSetup.states.missingBoth.detail
		};
	}

	if (fundingAccounts.length === 0) {
		return {
			fundingAccounts,
			categoryAccounts,
			accountGroups,
			canRecordTransactions: false,
			headline: ptBrCopy.accountSetup.states.missingFunding.headline,
			detail: ptBrCopy.accountSetup.states.missingFunding.detail
		};
	}

	if (categoryAccounts.length === 0) {
		return {
			fundingAccounts,
			categoryAccounts,
			accountGroups,
			canRecordTransactions: false,
			headline: ptBrCopy.accountSetup.states.missingCategory.headline,
			detail: ptBrCopy.accountSetup.states.missingCategory.detail
		};
	}

	return {
		fundingAccounts,
		categoryAccounts,
		accountGroups,
		canRecordTransactions: true,
		headline: ptBrCopy.accountSetup.states.ready.headline,
		detail: ptBrCopy.accountSetup.states.ready.detail
	};
}

function sortAccounts(accounts: Account[]): Account[] {
	return [...accounts].sort((left, right) => left.name.localeCompare(right.name, APP_LOCALE));
}

function isFundingAccount(type: AccountType): boolean {
	return FUNDING_ACCOUNT_TYPE_SET.has(type);
}

function isCategoryAccount(type: AccountType): boolean {
	return CATEGORY_ACCOUNT_TYPE_SET.has(type);
}

import type { Transaction } from '$lib/api';
import { formatDateDisplay, formatSignedDecimalAmount, ptBrCopy } from '$lib/locale';

export interface RecentTransactionItem {
	key: string;
	date: string;
	title: string;
	payee: string;
	category: string;
	amount: string;
}

export function buildRecentTransactionItems(transactions: Transaction[]): RecentTransactionItem[] {
	return transactions.map((transaction, index) => {
		const category =
			transaction.primary_category ??
			transaction.postings[1]?.account ??
			ptBrCopy.recentTransactions.uncategorized;
		const amount =
			transaction.postings.find((posting) => posting.account === category)?.amount ??
			transaction.postings[1]?.amount ??
			transaction.postings[0]?.amount ??
			'0.00';

		return {
			key: `${transaction.date}:${transaction.title}:${index}`,
			date: formatDateDisplay(transaction.date),
			title: transaction.title,
			payee: transaction.payee ?? ptBrCopy.recentTransactions.payeeOmitted,
			category,
			amount: formatLedgerAmount(amount)
		};
	});
}

export function formatLedgerAmount(rawAmount: string): string {
	return formatSignedDecimalAmount(rawAmount);
}

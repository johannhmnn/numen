import type { Transaction } from '$lib/api';

export interface RecentTransactionItem {
	key: string;
	date: string;
	title: string;
	payee: string;
	category: string;
	amount: string;
}

export function buildRecentTransactionItems(
	transactions: Transaction[]
): RecentTransactionItem[] {
	return transactions.map((transaction, index) => {
		const category = transaction.primary_category ?? transaction.postings[1]?.account ?? 'Uncategorized';
		const amount =
			transaction.postings.find((posting) => posting.account === category)?.amount ??
			transaction.postings[1]?.amount ??
			transaction.postings[0]?.amount ??
			'0.00';

		return {
			key: `${transaction.date}:${transaction.title}:${index}`,
			date: transaction.date,
			title: transaction.title,
			payee: transaction.payee ?? 'Payee omitted',
			category,
			amount: formatLedgerAmount(amount)
		};
	});
}

export function formatLedgerAmount(rawAmount: string): string {
	const negative = rawAmount.startsWith('-');
	const absolute = negative ? rawAmount.slice(1) : rawAmount;
	const [wholePart, fractionalPart = '00'] = absolute.split('.');
	const normalizedWhole = wholePart.replace(/^0+(?=\d)/, '') || '0';
	const groupedWhole = normalizedWhole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
	const normalizedFraction = `${fractionalPart}00`.slice(0, 2);

	return `${negative ? '-' : '+'}${groupedWhole}.${normalizedFraction}`;
}

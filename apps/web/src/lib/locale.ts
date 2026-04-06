import type { AccountType } from '$lib/api';

export const APP_LOCALE = 'pt-BR' as const;

export type AppLocale = typeof APP_LOCALE;

const accountTypeLabels = {
	Assets: 'Ativos',
	Liabilities: 'Passivos',
	Equity: 'Patrimônio',
	Income: 'Receitas',
	Expenses: 'Despesas'
} as const satisfies Record<AccountType, string>;

const themeLabels = {
	light: 'Claro',
	dark: 'Escuro',
	system: 'Sistema'
} as const;

export const ptBrCopy = {
	common: {
		retry: 'Tentar novamente'
	},
	layout: {
		homeAriaLabel: 'Página inicial do Numen',
		localLedger: 'Controle financeiro local'
	},
	page: {
		description:
			'Espaço de lançamentos estruturados em partidas dobradas no Numen, com tudo salvo localmente.'
	},
	appearance: {
		sectionLabel: 'Controles de aparência',
		kicker: 'Aparência',
		triggerLabel: 'Trocar tema de aparência',
		menuLabel: 'Menu de aparência',
		radioGroupLabel: 'Tema de cores',
		themeDescriptions: {
			light: 'Visual claro, com cara de papel.',
			dark: 'Visual escuro, mais confortável à noite.',
			system: 'Acompanha o tema do seu dispositivo.'
		},
		themeLabels,
		statusSystemActive: (theme: 'light' | 'dark') =>
			`Acompanhando o sistema: ${themeLabels[theme]}`,
		statusPinned: (theme: keyof typeof themeLabels) => `Tema selecionado: ${themeLabels[theme]}`
	},
	accountSetup: {
		groups: {
			fundingLabel: 'Contas de origem',
			fundingEmptyLabel: 'Nenhuma conta de origem ainda. Adicione uma abaixo para continuar.',
			categoryLabel: 'Contas de categoria',
			categoryEmptyLabel: 'Nenhuma conta de categoria ainda. Adicione uma abaixo para continuar.'
		},
		states: {
			missingBoth: {
				headline: 'Adicione uma conta de origem e uma de categoria para começar.',
				detail: 'Você precisa dessas duas contas para montar a transação.'
			},
			missingFunding: {
				headline: 'Adicione pelo menos uma conta de origem para começar.',
				detail: 'É por essa conta que o dinheiro entra ou sai.'
			},
			missingCategory: {
				headline: 'Adicione pelo menos uma conta de categoria para começar.',
				detail: 'Ela classifica a transação, como Despesas ou Receitas.'
			},
			ready: {
				headline: 'Tudo pronto para registrar transações.',
				detail: 'Agora é só escolher a conta de origem, a categoria e o valor.'
			}
		}
	},
	workspace: {
		accountDeskKicker: 'Painel de contas',
		accountDeskHeading: 'Escolha as contas usadas em cada transação.',
		accountDeskAccordionTrigger: 'Painel de contas e configuração',
		accountDeskAccordionDescription:
			'Abra este painel para adicionar contas antes de registrar uma transação.',
		loadingAccounts: 'Carregando suas contas...',
		addAccountFormLabel: 'Adicionar conta',
		accountNameLabel: 'Nome da conta',
		accountNamePlaceholder: 'Despesas:Mercado',
		accountTypeLabel: 'Tipo de conta',
		accountFormHintReady: 'Se precisar, adicione mais contas por aqui.',
		addingAccount: 'Adicionando...',
		addAccount: 'Adicionar conta',
		structuredEntryKicker: 'Lançamento guiado',
		structuredEntryHeading: 'Informe a conta de origem, a categoria e o valor.',
		transactionFormLabel: 'Lançamento guiado de transação',
		dateLabel: 'Data',
		amountLabel: 'Valor',
		amountPlaceholder: '48,20',
		titleLabel: 'Título',
		titlePlaceholder: 'Mercado',
		payeeLabel: 'Favorecido',
		payeePlaceholder: 'Mercado Central',
		fundingAccountLabel: 'Conta de origem',
		fundingAccountPlaceholder: 'Selecione uma conta de origem',
		categoryAccountLabel: 'Conta de categoria',
		categoryAccountPlaceholder: 'Selecione uma conta de categoria',
		tagsLabel: 'Tags',
		tagsPlaceholder: 'alimentação, semanal, casa',
		postingPreviewLabel: 'Como vai ficar',
		ledgerEffectLabel: 'Lançamentos',
		postingPreviewHint: 'Escolha as contas para ver as duas partidas.',
		postingPreviewEmpty: 'Preencha valor, origem e categoria para ver como a transação vai ficar.',
		tagPreviewLabel: 'Tags',
		tagPreviewEmpty: 'Sem tags',
		transactionReviewError: 'Confira os campos destacados e tente de novo.',
		transactionSuccess: 'Transação salva.',
		transactionSetupAction: 'Abrir painel de contas',
		transactionFooterReady: 'Você informa o valor e o app monta as duas partidas para você.',
		transactionFooterLocked:
			'Adicione uma conta de origem e uma de categoria antes de registrar a transação.',
		recordingTransaction: 'Salvando...',
		recordTransaction: 'Salvar transação',
		recentLedgerKicker: 'Últimas transações',
		recentLedgerHeading: 'As transações mais recentes aparecem aqui.',
		loadingTransactions: 'Carregando suas transações...',
		recentEmptyTitle: 'Ainda não há transações',
		recentEmpty: 'Quando você registrar a primeira, ela vai aparecer aqui.',
		unableToLoadAccounts: 'Não conseguimos carregar suas contas agora.',
		unableToLoadTransactions: 'Não conseguimos carregar suas transações agora.',
		accountNameRequired: 'O nome da conta é obrigatório.',
		unableToCreateAccount: 'Não conseguimos criar a conta agora.',
		unableToCreateTransaction: 'Não conseguimos salvar a transação agora.'
	},
	recentTransactions: {
		uncategorized: 'Sem categoria',
		payeeOmitted: 'Favorecido não informado'
	},
	transactionValidation: {
		dateInvalid: 'Informe uma data válida.',
		titleRequired: 'O título é obrigatório.',
		fundingAccountRequired: 'Escolha uma conta de origem.',
		categoryAccountRequired: 'Escolha uma conta de categoria.',
		amountRequired: 'O valor é obrigatório.',
		amountInvalid: 'Informe um valor positivo com até duas casas decimais.',
		amountPositive: 'O valor precisa ser maior que zero.',
		fundingAccountDesk: 'Escolha uma conta de origem no painel de contas.',
		categoryAccountDesk: 'Escolha uma conta de categoria no painel de contas.'
	}
} as const;

export function formatAccountType(type: AccountType): string {
	return accountTypeLabels[type];
}

export function formatDateDisplay(value: string): string {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

	if (!match) {
		return value;
	}

	const [, year, month, day] = match;

	return `${day}/${month}/${year}`;
}

export function formatSignedDecimalAmount(rawAmount: string): string {
	const { negative, whole, fractional } = normalizeDecimalAmount(rawAmount);

	return `${negative ? '-' : '+'}${whole},${fractional}`;
}

export function formatCurrencyDisplay(rawAmount: string, currencySymbol = 'R$'): string {
	const { negative, whole, fractional } = normalizeDecimalAmount(rawAmount);

	return `${negative ? '-' : ''}${currencySymbol} ${whole},${fractional}`;
}

function normalizeDecimalAmount(rawAmount: string) {
	const trimmedAmount = rawAmount.trim();
	const negative = trimmedAmount.startsWith('-');
	const unsignedAmount = trimmedAmount.replace(/^[-+]/, '').replace(',', '.');
	const [wholePart = '0', fractionalPart = ''] = unsignedAmount.split('.');
	const normalizedWhole = wholePart.replace(/^0+(?=\d)/, '') || '0';
	const groupedWhole = normalizedWhole.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
	const normalizedFractional = `${fractionalPart}00`.slice(0, 2);

	return {
		negative,
		whole: groupedWhole,
		fractional: normalizedFractional
	};
}

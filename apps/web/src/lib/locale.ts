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
		localLedger: 'Razão local'
	},
	page: {
		description:
			'Espaço de lançamento estruturado para o razão local-first em partidas dobradas do Numen.'
	},
	appearance: {
		sectionLabel: 'Controles de aparência',
		kicker: 'Aparência',
		triggerLabel: 'Trocar tema de aparência',
		menuLabel: 'Menu de aparência',
		radioGroupLabel: 'Tema de cores',
		themeDescriptions: {
			light: 'Mantém o razão claro, com tom de papel.',
			dark: 'Leva a mesa para um ambiente de leitura com pouca luz.',
			system: 'Segue automaticamente a preferência do dispositivo.'
		},
		themeLabels,
		statusSystemActive: (theme: 'light' | 'dark') => `Sistema ativo - ${themeLabels[theme]} agora`,
		statusPinned: (theme: keyof typeof themeLabels) => `${themeLabels[theme]} fixo`
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
				headline:
					'Adicione uma conta de origem e uma conta de categoria para liberar o lançamento guiado.',
				detail:
					'O fluxo guiado precisa de uma conta para sair o dinheiro e outra para classificá-lo.'
			},
			missingFunding: {
				headline: 'Crie pelo menos uma conta de origem para liberar o lançamento guiado.',
				detail:
					'Contas de origem são Ativos ou Passivos de onde você gasta ou onde recebe dinheiro.'
			},
			missingCategory: {
				headline: 'Crie pelo menos uma conta de categoria para liberar o lançamento guiado.',
				detail:
					'Contas de categoria são as suas Despesas e Receitas que classificam cada transação.'
			},
			ready: {
				headline: 'As contas de origem e categoria estão prontas para o lançamento guiado.',
				detail:
					'Agora você já pode escolher uma conta de origem e uma conta de categoria em cada nova transação.'
			}
		}
	},
	workspace: {
		brandKicker: 'Razão Numen',
		mastheadTitle: 'Lance as transações que você realmente lembra.',
		mastheadNote:
			'Uma mesa local-first e acolhedora para configurar contas, registrar transações guiadas e acompanhar as últimas movimentações do razão.',
		accountDeskKicker: 'Painel de contas',
		accountDeskHeading: 'Escolha as contas que estruturam cada lançamento.',
		accountDeskAccordionTrigger: 'Painel de contas e configuração',
		accountDeskAccordionDescription:
			'Abra este painel para adicionar contas de origem e categoria antes de registrar uma transação.',
		loadingAccounts: 'Carregando as contas do seu razão...',
		addAccountFormLabel: 'Adicionar conta',
		accountNameLabel: 'Nome da conta',
		accountNamePlaceholder: 'Despesas:Mercado',
		accountTypeLabel: 'Tipo de conta',
		accountFormHintReady: 'Adicione mais contas aqui conforme a sua estrutura evolui.',
		addingAccount: 'Adicionando...',
		addAccount: 'Adicionar conta',
		structuredEntryKicker: 'Lançamento guiado',
		structuredEntryHeading:
			'Registre uma conta de origem, uma conta de categoria e um valor claro.',
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
		postingPreviewLabel: 'Prévia dos lançamentos',
		ledgerEffectLabel: 'Impacto no razão',
		postingPreviewHint: 'Escolha as contas para visualizar as duas partidas.',
		postingPreviewEmpty:
			'Informe o valor, a conta de origem e a conta de categoria para ver o par balanceado.',
		tagPreviewLabel: 'Prévia das tags',
		tagPreviewEmpty: 'Nenhuma tag ainda',
		transactionReviewError: 'Revise os campos destacados e tente novamente.',
		transactionSuccess: 'Transação registrada no razão local.',
		transactionSetupAction: 'Abrir painel de contas',
		transactionFooterReady:
			'Um valor entra. Duas partidas balanceadas saem. O formulário deriva a estrutura do razão para você.',
		transactionFooterLocked:
			'Adicione uma conta de origem e uma conta de categoria antes de liberar o lançamento de transações.',
		recordingTransaction: 'Registrando...',
		recordTransaction: 'Registrar transação',
		recentLedgerKicker: 'Razão recente',
		recentLedgerHeading: 'As transações mais novas aparecem assim que entram.',
		loadingTransactions: 'Carregando transações recentes...',
		recentEmptyTitle: 'Nenhuma transação ainda',
		recentEmpty:
			'Registre uma transação e ela aparecerá aqui como a movimentação mais recente do seu razão.',
		unableToLoadAccounts: 'Não foi possível carregar as contas agora.',
		unableToLoadTransactions: 'Não foi possível carregar as transações recentes agora.',
		accountNameRequired: 'O nome da conta é obrigatório.',
		unableToCreateAccount: 'Não foi possível criar a conta agora.',
		unableToCreateTransaction: 'Não foi possível registrar a transação agora.'
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
		fundingAccountDesk: 'Escolha uma conta de origem do painel de contas.',
		categoryAccountDesk: 'Escolha uma conta de categoria do painel de contas.'
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

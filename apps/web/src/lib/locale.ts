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
			'Espaco de lancamento estruturado para o razao local-first em partidas dobradas do Numen.'
	},
	appearance: {
		sectionLabel: 'Controles de aparencia',
		kicker: 'Aparencia',
		radioGroupLabel: 'Tema de cores',
		themeDescriptions: {
			light: 'Mantem o razao claro, com tom de papel.',
			dark: 'Leva a mesa para um ambiente de leitura com pouca luz.',
			system: 'Segue automaticamente a preferencia do dispositivo.'
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
					'Adicione uma conta de origem e uma conta de categoria para liberar o lancamento guiado.',
				detail:
					'O fluxo guiado precisa de uma conta para sair o dinheiro e outra para classifica-lo.'
			},
			missingFunding: {
				headline: 'Crie pelo menos uma conta de origem para liberar o lancamento guiado.',
				detail:
					'Contas de origem sao Ativos ou Passivos de onde voce gasta ou onde recebe dinheiro.'
			},
			missingCategory: {
				headline: 'Crie pelo menos uma conta de categoria para liberar o lancamento guiado.',
				detail:
					'Contas de categoria sao as suas Despesas e Receitas que classificam cada transacao.'
			},
			ready: {
				headline: 'As contas de origem e categoria estao prontas para o lancamento guiado.',
				detail:
					'Agora voce ja pode escolher uma conta de origem e uma conta de categoria em cada nova transacao.'
			}
		}
	},
	workspace: {
		brandKicker: 'Razao Numen',
		mastheadTitle: 'Lance as transacoes que voce realmente lembra.',
		mastheadNote:
			'Uma mesa local-first e acolhedora para configurar contas, registrar transacoes guiadas e acompanhar as ultimas movimentacoes do razao.',
		accountDeskKicker: 'Painel de contas',
		accountDeskHeading: 'Escolha as contas que estruturam cada lancamento.',
		loadingAccounts: 'Carregando as contas do seu razao...',
		addAccountFormLabel: 'Adicionar conta',
		accountNameLabel: 'Nome da conta',
		accountNamePlaceholder: 'Despesas:Mercado',
		accountTypeLabel: 'Tipo de conta',
		accountFormHintReady: 'Adicione mais contas aqui conforme a sua estrutura evolui.',
		addingAccount: 'Adicionando...',
		addAccount: 'Adicionar conta',
		structuredEntryKicker: 'Lancamento guiado',
		structuredEntryHeading:
			'Registre uma conta de origem, uma conta de categoria e um valor claro.',
		transactionFormLabel: 'Lancamento guiado de transacao',
		dateLabel: 'Data',
		amountLabel: 'Valor',
		amountPlaceholder: '48,20',
		titleLabel: 'Titulo',
		titlePlaceholder: 'Mercado',
		payeeLabel: 'Favorecido',
		payeePlaceholder: 'Mercado Central',
		fundingAccountLabel: 'Conta de origem',
		fundingAccountPlaceholder: 'Selecione uma conta de origem',
		categoryAccountLabel: 'Conta de categoria',
		categoryAccountPlaceholder: 'Selecione uma conta de categoria',
		tagsLabel: 'Tags',
		tagsPlaceholder: 'alimentacao, semanal, casa',
		postingPreviewLabel: 'Previa dos lancamentos',
		ledgerEffectLabel: 'Impacto no razao',
		postingPreviewHint: 'Escolha as contas para visualizar as duas partidas.',
		postingPreviewEmpty:
			'Informe o valor, a conta de origem e a conta de categoria para ver o par balanceado.',
		tagPreviewLabel: 'Previa das tags',
		tagPreviewEmpty: 'Nenhuma tag ainda',
		transactionReviewError: 'Revise os campos destacados e tente novamente.',
		transactionSuccess: 'Transacao registrada no razao local.',
		transactionFooterReady:
			'Um valor entra. Duas partidas balanceadas saem. O formulario deriva a estrutura do razao para voce.',
		transactionFooterLocked:
			'Adicione uma conta de origem e uma conta de categoria antes de liberar o lancamento de transacoes.',
		recordingTransaction: 'Registrando...',
		recordTransaction: 'Registrar transacao',
		recentLedgerKicker: 'Razao recente',
		recentLedgerHeading: 'As transacoes mais novas aparecem assim que entram.',
		loadingTransactions: 'Carregando transacoes recentes...',
		recentEmpty:
			'Registre uma transacao e ela aparecera aqui como a movimentacao mais recente do seu razao.',
		unableToLoadAccounts: 'Nao foi possivel carregar as contas agora.',
		unableToLoadTransactions: 'Nao foi possivel carregar as transacoes recentes agora.',
		accountNameRequired: 'O nome da conta e obrigatorio.',
		unableToCreateAccount: 'Nao foi possivel criar a conta agora.',
		unableToCreateTransaction: 'Nao foi possivel registrar a transacao agora.'
	},
	recentTransactions: {
		uncategorized: 'Sem categoria',
		payeeOmitted: 'Favorecido nao informado'
	},
	transactionValidation: {
		dateInvalid: 'Informe uma data valida.',
		titleRequired: 'O titulo e obrigatorio.',
		fundingAccountRequired: 'Escolha uma conta de origem.',
		categoryAccountRequired: 'Escolha uma conta de categoria.',
		amountRequired: 'O valor e obrigatorio.',
		amountInvalid: 'Informe um valor positivo com ate duas casas decimais.',
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

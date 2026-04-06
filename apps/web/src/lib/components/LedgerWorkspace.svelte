<script lang="ts">
	import { onMount, tick } from 'svelte';
	import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';
	import ChartNoAxesColumnIncreasingIcon from '@lucide/svelte/icons/chart-no-axes-column-increasing';
	import Layers3Icon from '@lucide/svelte/icons/layers-3';
	import RefreshCcwIcon from '@lucide/svelte/icons/refresh-ccw';
	import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert';

	import {
		type Account,
		type AccountType,
		type CreateTransactionInput,
		type Transaction,
		NumenApiError,
		createNumenApiClient
	} from '$lib/api';
	import * as Accordion from '$lib/components/ui/accordion/index.js';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Empty from '$lib/components/ui/empty/index.js';
	import * as Field from '$lib/components/ui/field/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import * as NativeSelect from '$lib/components/ui/native-select/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import { Skeleton } from '$lib/components/ui/skeleton/index.js';
	import { ACCOUNT_TYPE_OPTIONS, buildAccountSetupSummary } from '$lib/ledger/accounts';
	import { buildRecentTransactionItems } from '$lib/ledger/recent-transactions';
	import {
		buildGuidedTransactionFieldErrors,
		createGuidedTransactionSchema,
		normalizeTransactionTags,
		type GuidedTransactionField,
		type GuidedTransactionForm
	} from '$lib/ledger/transactions';
	import { formatAccountType, formatSignedDecimalAmount, ptBrCopy } from '$lib/locale';

	const api = createNumenApiClient();
	const ACCOUNT_DESK_ID = 'account-desk-panel';
	const ACCOUNT_DESK_VALUE = 'account-desk';
	const DESKTOP_MEDIA_QUERY = '(min-width: 1024px)';

	let accounts = $state<Account[]>([]);
	let accountsState = $state<'loading' | 'ready' | 'error'>('loading');
	let accountsError = $state<string | null>(null);
	let transactions = $state<Transaction[]>([]);
	let transactionsState = $state<'loading' | 'ready' | 'error'>('loading');
	let transactionsError = $state<string | null>(null);
	let createAccountState = $state<'idle' | 'submitting'>('idle');
	let createAccountError = $state<string | null>(null);
	let accountName = $state('');
	let accountType = $state<AccountType>('Assets');
	let accountDeskValue = $state('');
	let transactionForm = $state<GuidedTransactionForm>({
		date: getTodayDate(),
		title: '',
		payee: '',
		fundingAccount: '',
		categoryAccount: '',
		amount: '',
		tags: ''
	});
	let transactionFieldErrors = $state<Partial<Record<GuidedTransactionField, string>>>({});
	let transactionState = $state<'idle' | 'submitting'>('idle');
	let transactionError = $state<string | null>(null);
	let transactionSuccess = $state<string | null>(null);

	let setup = $derived(buildAccountSetupSummary(accounts));
	let setupNote = $derived(
		setup.canRecordTransactions ? ptBrCopy.workspace.accountFormHintReady : setup.detail
	);
	let recentTransactionItems = $derived(buildRecentTransactionItems(transactions));
	let guidedTransactionSchema = $derived(createGuidedTransactionSchema(accounts));
	let tagPreview = $derived(normalizeTransactionTags(transactionForm.tags));
	let postingPreview = $derived.by(() => {
		const parsed = guidedTransactionSchema.safeParse(transactionForm);

		return parsed.success ? parsed.data.postings : [];
	});

	onMount(() => {
		void loadWorkspace();

		const mediaQuery = window.matchMedia(DESKTOP_MEDIA_QUERY);

		if (mediaQuery.matches) {
			accountDeskValue = ACCOUNT_DESK_VALUE;
		}

		const syncAccountDesk = (event: Pick<MediaQueryListEvent, 'matches'>) => {
			if (event.matches) {
				accountDeskValue = ACCOUNT_DESK_VALUE;
			}
		};

		if (typeof mediaQuery.addEventListener === 'function') {
			mediaQuery.addEventListener('change', syncAccountDesk);

			return () => mediaQuery.removeEventListener('change', syncAccountDesk);
		}

		mediaQuery.addListener(syncAccountDesk);

		return () => mediaQuery.removeListener(syncAccountDesk);
	});

	async function loadWorkspace() {
		await Promise.all([loadAccounts(), loadTransactions()]);
	}

	async function loadAccounts() {
		accountsState = 'loading';
		accountsError = null;

		try {
			const nextAccounts = await api.listAccounts();
			accounts = nextAccounts;
			syncTransactionAccountSelections(nextAccounts);
			accountsState = 'ready';
		} catch (error) {
			accountsState = 'error';
			accountsError = getErrorMessage(error, ptBrCopy.workspace.unableToLoadAccounts);
		}
	}

	async function loadTransactions(keepVisible = false) {
		if (!keepVisible) {
			transactionsState = 'loading';
		}
		transactionsError = null;

		try {
			transactions = await api.listTransactions();
			transactionsState = 'ready';
		} catch (error) {
			transactionsState = 'error';
			transactionsError = getErrorMessage(error, ptBrCopy.workspace.unableToLoadTransactions);
		}
	}

	async function handleCreateAccount(event: SubmitEvent) {
		event.preventDefault();

		const trimmedName = accountName.trim();

		if (!trimmedName) {
			createAccountError = ptBrCopy.workspace.accountNameRequired;
			return;
		}

		createAccountState = 'submitting';
		createAccountError = null;

		try {
			const createdAccount = await api.createAccount({
				name: trimmedName,
				type: accountType
			});
			const nextAccounts = [...accounts, createdAccount];
			accounts = nextAccounts;
			syncTransactionAccountSelections(nextAccounts);
			accountName = '';
			accountDeskValue = ACCOUNT_DESK_VALUE;
		} catch (error) {
			createAccountError = getErrorMessage(error, ptBrCopy.workspace.unableToCreateAccount);
		} finally {
			createAccountState = 'idle';
		}
	}

	async function handleCreateTransaction(event: SubmitEvent) {
		event.preventDefault();

		transactionError = null;
		transactionSuccess = null;
		transactionFieldErrors = {};

		const parsed = guidedTransactionSchema.safeParse(transactionForm);

		if (!parsed.success) {
			transactionFieldErrors = buildGuidedTransactionFieldErrors(parsed.error);
			transactionError = ptBrCopy.workspace.transactionReviewError;
			return;
		}

		transactionState = 'submitting';

		try {
			await api.createTransaction(parsed.data);
			await loadTransactions(true);
			transactionSuccess = ptBrCopy.workspace.transactionSuccess;
			resetTransactionForm(parsed.data);
		} catch (error) {
			transactionError = getErrorMessage(error, ptBrCopy.workspace.unableToCreateTransaction);
		} finally {
			transactionState = 'idle';
		}
	}

	function getErrorMessage(error: unknown, fallback: string): string {
		if (error instanceof NumenApiError) {
			return error.message;
		}

		if (error instanceof Error) {
			return error.message;
		}

		return fallback;
	}

	function resetTransactionForm(payload: CreateTransactionInput) {
		transactionForm = {
			date: payload.date,
			title: '',
			payee: '',
			fundingAccount: payload.postings[0]?.account ?? transactionForm.fundingAccount,
			categoryAccount: payload.postings[1]?.account ?? transactionForm.categoryAccount,
			amount: '',
			tags: ''
		};
		transactionFieldErrors = {};
	}

	function syncTransactionAccountSelections(nextAccounts: Account[]) {
		const nextSetup = buildAccountSetupSummary(nextAccounts);

		if (
			!nextSetup.fundingAccounts.some((account) => account.name === transactionForm.fundingAccount)
		) {
			transactionForm.fundingAccount = nextSetup.fundingAccounts[0]?.name ?? '';
		}

		if (
			!nextSetup.categoryAccounts.some(
				(account) => account.name === transactionForm.categoryAccount
			)
		) {
			transactionForm.categoryAccount = nextSetup.categoryAccounts[0]?.name ?? '';
		}
	}

	async function openAccountDesk() {
		accountDeskValue = ACCOUNT_DESK_VALUE;
		await tick();
		document
			.getElementById(ACCOUNT_DESK_ID)
			?.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}

	function getTodayDate(): string {
		return new Date().toISOString().slice(0, 10);
	}
</script>

<section
	class="mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl flex-col px-3 pt-5 pb-10 sm:px-4 md:px-6 md:pt-8"
>
	<header class="grid gap-3 px-1">
		<p
			class="[font-family:var(--font-mono)] text-[0.72rem] tracking-[0.18em] text-[color:var(--accent)] uppercase"
		>
			{ptBrCopy.workspace.brandKicker}
		</p>
		<div class="grid gap-3 lg:grid-cols-[minmax(0,1.1fr)_minmax(20rem,0.9fr)] lg:items-end">
			<h1
				class="max-w-4xl [font-family:var(--font-display)] text-4xl leading-none font-semibold tracking-[-0.05em] text-[color:var(--ink)] sm:text-5xl lg:text-6xl"
			>
				{ptBrCopy.workspace.mastheadTitle}
			</h1>
			<p class="max-w-2xl text-sm leading-7 text-[color:var(--ink-soft)] sm:text-base">
				{ptBrCopy.workspace.mastheadNote}
			</p>
		</div>
	</header>

	<div class="mt-6 grid gap-4 lg:grid-cols-[minmax(18rem,22rem)_minmax(0,1fr)_minmax(18rem,22rem)]">
		<section class="order-1 lg:order-2">
			<Card.Root
				aria-labelledby="entry-stage-heading"
				class="border-border/70 bg-card border shadow-[var(--card-shadow)]"
			>
				<Card.Header class="gap-3 px-5 pb-0 sm:px-6">
					<p
						class="[font-family:var(--font-mono)] text-[0.72rem] tracking-[0.16em] text-[color:var(--accent)] uppercase"
					>
						{ptBrCopy.workspace.structuredEntryKicker}
					</p>
					<h2
						id="entry-stage-heading"
						class="[font-family:var(--font-display)] text-3xl leading-tight font-semibold tracking-[-0.04em] text-[color:var(--ink)]"
					>
						{ptBrCopy.workspace.structuredEntryHeading}
					</h2>
					<Card.Description class="max-w-2xl text-sm leading-7 text-[color:var(--ink-soft)]">
						{#if setup.canRecordTransactions}
							{ptBrCopy.workspace.transactionFooterReady}
						{:else}
							{ptBrCopy.workspace.transactionFooterLocked}
						{/if}
					</Card.Description>
				</Card.Header>

				<Card.Content class="px-5 pt-1 sm:px-6">
					{#if !setup.canRecordTransactions}
						<Alert.Root
							class="mb-5 border-[color:var(--danger-line)] bg-[color:var(--danger-soft)]"
						>
							<TriangleAlertIcon class="mt-0.5 size-4" />
							<Alert.Title class="font-semibold text-[color:var(--danger)]">
								{setup.headline}
							</Alert.Title>
							<Alert.Description class="mt-1 space-y-3 text-[color:var(--danger)]">
								<p>{setup.detail}</p>
								<Button
									variant="outline"
									size="sm"
									class="w-full sm:w-auto"
									onclick={openAccountDesk}
								>
									{ptBrCopy.workspace.transactionSetupAction}
									<ArrowRightIcon />
								</Button>
							</Alert.Description>
						</Alert.Root>
					{/if}

					<form
						id="guided-transaction-form"
						class="grid gap-5"
						aria-label={ptBrCopy.workspace.transactionFormLabel}
						onsubmit={handleCreateTransaction}
					>
						<div class="grid gap-4 md:grid-cols-2">
							<Field.Field data-invalid={Boolean(transactionFieldErrors.date)}>
								<Field.Label for="transaction-date">{ptBrCopy.workspace.dateLabel}</Field.Label>
								<Input
									id="transaction-date"
									type="date"
									bind:value={transactionForm.date}
									aria-invalid={Boolean(transactionFieldErrors.date)}
									class="rounded-[1.35rem]"
								/>
								<Field.Error>{transactionFieldErrors.date}</Field.Error>
							</Field.Field>

							<Field.Field data-invalid={Boolean(transactionFieldErrors.amount)}>
								<Field.Label for="transaction-amount">{ptBrCopy.workspace.amountLabel}</Field.Label>
								<Input
									id="transaction-amount"
									type="text"
									bind:value={transactionForm.amount}
									placeholder={ptBrCopy.workspace.amountPlaceholder}
									inputmode="decimal"
									aria-invalid={Boolean(transactionFieldErrors.amount)}
									class="rounded-[1.35rem]"
								/>
								<Field.Error>{transactionFieldErrors.amount}</Field.Error>
							</Field.Field>
						</div>

						<Field.Field data-invalid={Boolean(transactionFieldErrors.title)}>
							<Field.Label for="transaction-title">{ptBrCopy.workspace.titleLabel}</Field.Label>
							<Input
								id="transaction-title"
								type="text"
								bind:value={transactionForm.title}
								placeholder={ptBrCopy.workspace.titlePlaceholder}
								autocomplete="off"
								aria-invalid={Boolean(transactionFieldErrors.title)}
								class="rounded-[1.35rem]"
							/>
							<Field.Error>{transactionFieldErrors.title}</Field.Error>
						</Field.Field>

						<Field.Field>
							<Field.Label for="transaction-payee">{ptBrCopy.workspace.payeeLabel}</Field.Label>
							<Input
								id="transaction-payee"
								type="text"
								bind:value={transactionForm.payee}
								placeholder={ptBrCopy.workspace.payeePlaceholder}
								autocomplete="off"
								class="rounded-[1.35rem]"
							/>
						</Field.Field>

						<div class="grid gap-4 md:grid-cols-2">
							<Field.Field data-invalid={Boolean(transactionFieldErrors.fundingAccount)}>
								<Field.Label for="transaction-funding-account">
									{ptBrCopy.workspace.fundingAccountLabel}
								</Field.Label>
								<NativeSelect.Root
									id="transaction-funding-account"
									bind:value={transactionForm.fundingAccount}
									aria-invalid={Boolean(transactionFieldErrors.fundingAccount)}
									class="w-full"
								>
									<NativeSelect.Option value="" disabled={setup.fundingAccounts.length > 0}>
										{ptBrCopy.workspace.fundingAccountPlaceholder}
									</NativeSelect.Option>
									{#each setup.fundingAccounts as account (account.name)}
										<NativeSelect.Option value={account.name}>{account.name}</NativeSelect.Option>
									{/each}
								</NativeSelect.Root>
								<Field.Error>{transactionFieldErrors.fundingAccount}</Field.Error>
							</Field.Field>

							<Field.Field data-invalid={Boolean(transactionFieldErrors.categoryAccount)}>
								<Field.Label for="transaction-category-account">
									{ptBrCopy.workspace.categoryAccountLabel}
								</Field.Label>
								<NativeSelect.Root
									id="transaction-category-account"
									bind:value={transactionForm.categoryAccount}
									aria-invalid={Boolean(transactionFieldErrors.categoryAccount)}
									class="w-full"
								>
									<NativeSelect.Option value="" disabled={setup.categoryAccounts.length > 0}>
										{ptBrCopy.workspace.categoryAccountPlaceholder}
									</NativeSelect.Option>
									{#each setup.categoryAccounts as account (account.name)}
										<NativeSelect.Option value={account.name}>{account.name}</NativeSelect.Option>
									{/each}
								</NativeSelect.Root>
								<Field.Error>{transactionFieldErrors.categoryAccount}</Field.Error>
							</Field.Field>
						</div>

						<Field.Field>
							<Field.Label for="transaction-tags">{ptBrCopy.workspace.tagsLabel}</Field.Label>
							<Input
								id="transaction-tags"
								type="text"
								bind:value={transactionForm.tags}
								placeholder={ptBrCopy.workspace.tagsPlaceholder}
								autocomplete="off"
								class="rounded-[1.35rem]"
							/>
						</Field.Field>

						<div class="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
							<div class="border-border/70 bg-background/70 rounded-[1.75rem] border p-4">
								<div class="grid gap-1">
									<p
										class="[font-family:var(--font-mono)] text-[0.68rem] tracking-[0.16em] text-[color:var(--accent)] uppercase"
									>
										{ptBrCopy.workspace.ledgerEffectLabel}
									</p>
									<p class="text-sm leading-6 text-[color:var(--ink-soft)]">
										{transactionForm.categoryAccount || ptBrCopy.workspace.postingPreviewHint}
									</p>
								</div>

								<Separator class="bg-border/70 my-4" />

								{#if postingPreview.length === 2}
									<ul class="grid gap-3">
										{#each postingPreview as posting (posting.account)}
											<li
												class="bg-card flex items-center justify-between gap-3 rounded-[1.25rem] px-3 py-2"
											>
												<strong class="text-sm font-semibold text-[color:var(--ink)]">
													{posting.account}
												</strong>
												<span
													class="[font-family:var(--font-mono)] text-sm text-[color:var(--accent)]"
												>
													{formatSignedDecimalAmount(posting.amount)}
												</span>
											</li>
										{/each}
									</ul>
								{:else}
									<Empty.Root class="border-border/70 bg-card min-h-0 border border-dashed p-6">
										<Empty.Header>
											<Empty.Title class="text-sm font-semibold text-[color:var(--ink)]">
												{ptBrCopy.workspace.postingPreviewLabel}
											</Empty.Title>
											<Empty.Description class="text-sm leading-6 text-[color:var(--ink-soft)]">
												{ptBrCopy.workspace.postingPreviewEmpty}
											</Empty.Description>
										</Empty.Header>
									</Empty.Root>
								{/if}
							</div>

							<div class="border-border/70 bg-background/70 rounded-[1.75rem] border p-4">
								<div class="grid gap-1">
									<p
										class="[font-family:var(--font-mono)] text-[0.68rem] tracking-[0.16em] text-[color:var(--accent)] uppercase"
									>
										{ptBrCopy.workspace.tagPreviewLabel}
									</p>
									<p class="text-sm leading-6 text-[color:var(--ink-soft)]">
										{#if tagPreview.length > 0}
											{ptBrCopy.workspace.transactionFooterReady}
										{:else}
											{ptBrCopy.workspace.tagPreviewEmpty}
										{/if}
									</p>
								</div>

								<Separator class="bg-border/70 my-4" />

								<div class="flex min-h-14 flex-wrap gap-2">
									{#if tagPreview.length > 0}
										{#each tagPreview as tag (tag)}
											<Badge
												class="rounded-full bg-[color:var(--accent-soft)] px-3 py-1 text-[color:var(--accent)] shadow-none"
											>
												{tag}
											</Badge>
										{/each}
									{:else}
										<Badge
											class="border-border/80 rounded-full border border-dashed bg-transparent px-3 py-1 text-[color:var(--ink-soft)] shadow-none"
										>
											{ptBrCopy.workspace.tagPreviewEmpty}
										</Badge>
									{/if}
								</div>
							</div>
						</div>

						{#if transactionError}
							<Alert.Root
								variant="destructive"
								class="border-[color:var(--danger-line)] bg-[color:var(--danger-soft)]"
							>
								<TriangleAlertIcon class="mt-0.5 size-4" />
								<Alert.Title>{transactionError}</Alert.Title>
							</Alert.Root>
						{:else if transactionSuccess}
							<div
								class="rounded-[1.35rem] border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-700 dark:text-emerald-300"
							>
								{transactionSuccess}
							</div>
						{/if}
					</form>
				</Card.Content>

				<Card.Footer
					class="flex-col items-stretch gap-3 px-5 pt-0 sm:flex-row sm:items-center sm:justify-between sm:px-6"
				>
					<p class="max-w-2xl text-sm leading-6 text-[color:var(--ink-soft)]">{setupNote}</p>
					<Button
						type="submit"
						form="guided-transaction-form"
						disabled={!setup.canRecordTransactions || transactionState === 'submitting'}
						class="w-full rounded-full sm:w-auto"
					>
						{transactionState === 'submitting'
							? ptBrCopy.workspace.recordingTransaction
							: ptBrCopy.workspace.recordTransaction}
					</Button>
				</Card.Footer>
			</Card.Root>
		</section>

		<section class="order-2 lg:order-3">
			<Card.Root
				aria-labelledby="recent-transactions-heading"
				class="border-border/70 bg-card border shadow-[var(--card-shadow)]"
			>
				<Card.Header class="gap-3 px-5 pb-0 sm:px-6">
					<p
						class="[font-family:var(--font-mono)] text-[0.72rem] tracking-[0.16em] text-[color:var(--accent)] uppercase"
					>
						{ptBrCopy.workspace.recentLedgerKicker}
					</p>
					<h2
						id="recent-transactions-heading"
						class="[font-family:var(--font-display)] text-2xl leading-tight font-semibold tracking-[-0.04em] text-[color:var(--ink)]"
					>
						{ptBrCopy.workspace.recentLedgerHeading}
					</h2>
				</Card.Header>

				<Card.Content class="px-5 sm:px-6">
					{#if transactionsState === 'loading'}
						<div class="grid gap-3" aria-label={ptBrCopy.workspace.loadingTransactions}>
							{#each Array.from({ length: 3 }, (_, index) => index) as skeletonIndex (skeletonIndex)}
								<div
									class="border-border/60 bg-background/70 grid gap-2 rounded-[1.5rem] border p-4"
									data-skeleton={skeletonIndex}
								>
									<Skeleton class="h-3 w-24 rounded-full" />
									<Skeleton class="h-5 w-32 rounded-full" />
									<Skeleton class="h-3 w-full rounded-full" />
								</div>
							{/each}
						</div>
					{:else if transactionsState === 'error'}
						<Alert.Root
							variant="destructive"
							class="border-[color:var(--danger-line)] bg-[color:var(--danger-soft)]"
						>
							<TriangleAlertIcon class="mt-0.5 size-4" />
							<Alert.Title>{transactionsError}</Alert.Title>
							<Alert.Description class="mt-2">
								<Button variant="outline" size="sm" onclick={() => loadTransactions()}>
									<RefreshCcwIcon />
									{ptBrCopy.common.retry}
								</Button>
							</Alert.Description>
						</Alert.Root>
					{:else if recentTransactionItems.length === 0}
						<Empty.Root class="border-border/70 bg-background/70 border border-dashed p-8">
							<Empty.Header>
								<Empty.Media
									class="mx-auto flex size-12 items-center justify-center rounded-full bg-[color:var(--accent-soft)] text-[color:var(--accent)]"
								>
									<ChartNoAxesColumnIncreasingIcon class="size-5" />
								</Empty.Media>
								<Empty.Title class="text-base font-semibold text-[color:var(--ink)]">
									{ptBrCopy.workspace.recentEmptyTitle}
								</Empty.Title>
								<Empty.Description class="text-sm leading-6 text-[color:var(--ink-soft)]">
									{ptBrCopy.workspace.recentEmpty}
								</Empty.Description>
							</Empty.Header>
						</Empty.Root>
					{:else}
						<ol class="transaction-list grid gap-3">
							{#each recentTransactionItems as transaction (transaction.key)}
								<li
									class="border-border/60 bg-background/75 grid gap-3 rounded-[1.6rem] border p-4"
								>
									<div class="flex flex-wrap items-start justify-between gap-3">
										<div class="grid gap-1">
											<p
												class="[font-family:var(--font-mono)] text-[0.7rem] tracking-[0.14em] text-[color:var(--accent)] uppercase"
											>
												{transaction.date}
											</p>
											<strong class="text-base font-semibold text-[color:var(--ink)]">
												{transaction.title}
											</strong>
											<p class="text-sm leading-6 text-[color:var(--ink-soft)]">
												{transaction.payee}
											</p>
										</div>
										<div class="grid justify-items-end gap-2">
											<Badge
												class="rounded-full bg-[color:var(--accent-soft)] px-3 py-1 text-[color:var(--accent)] shadow-none"
											>
												{transaction.category}
											</Badge>
											<span
												class="[font-family:var(--font-mono)] text-sm font-semibold text-[color:var(--accent)]"
											>
												{transaction.amount}
											</span>
										</div>
									</div>
								</li>
							{/each}
						</ol>
					{/if}
				</Card.Content>
			</Card.Root>
		</section>

		<section class="order-3 lg:order-1" id={ACCOUNT_DESK_ID}>
			<Card.Root
				aria-labelledby="account-desk-heading"
				class="border-border/70 bg-card border shadow-[var(--card-shadow)]"
			>
				<Accordion.Root
					bind:value={accountDeskValue}
					type="single"
					class="border-none bg-transparent"
				>
					<Accordion.Item value={ACCOUNT_DESK_VALUE} class="border-none">
						<Accordion.Trigger
							class="px-5 py-5 hover:no-underline sm:px-6"
							aria-controls="account-desk-content"
						>
							<div class="grid gap-2 pr-6">
								<p
									class="[font-family:var(--font-mono)] text-[0.72rem] tracking-[0.16em] text-[color:var(--accent)] uppercase"
								>
									{ptBrCopy.workspace.accountDeskKicker}
								</p>
								<p
									class="text-xs font-medium tracking-[0.14em] text-[color:var(--ink-soft)] uppercase"
								>
									{ptBrCopy.workspace.accountDeskAccordionTrigger}
								</p>
								<h2
									id="account-desk-heading"
									class="[font-family:var(--font-display)] text-2xl leading-tight font-semibold tracking-[-0.04em] text-[color:var(--ink)]"
								>
									{ptBrCopy.workspace.accountDeskHeading}
								</h2>
								<p class="text-sm leading-6 text-[color:var(--ink-soft)]">
									{ptBrCopy.workspace.accountDeskAccordionDescription}
								</p>
							</div>
						</Accordion.Trigger>

						<Accordion.Content id="account-desk-content" class="px-5 pb-5 sm:px-6">
							<div class="grid gap-5">
								{#if accountsState === 'loading'}
									<div class="grid gap-3" aria-label={ptBrCopy.workspace.loadingAccounts}>
										<Skeleton class="h-20 rounded-[1.5rem]" />
										<Skeleton class="h-20 rounded-[1.5rem]" />
										<Skeleton class="h-28 rounded-[1.5rem]" />
									</div>
								{:else if accountsState === 'error'}
									<Alert.Root
										variant="destructive"
										class="border-[color:var(--danger-line)] bg-[color:var(--danger-soft)]"
									>
										<TriangleAlertIcon class="mt-0.5 size-4" />
										<Alert.Title>{accountsError}</Alert.Title>
										<Alert.Description class="mt-2">
											<Button variant="outline" size="sm" onclick={loadAccounts}>
												<RefreshCcwIcon />
												{ptBrCopy.common.retry}
											</Button>
										</Alert.Description>
									</Alert.Root>
								{:else}
									<Alert.Root class="border-border/70 bg-background/75">
										<Layers3Icon class="mt-0.5 size-4 text-[color:var(--accent)]" />
										<Alert.Title class="font-semibold text-[color:var(--ink)]">
											{setup.headline}
										</Alert.Title>
										<Alert.Description class="text-sm leading-6 text-[color:var(--ink-soft)]">
											{setup.detail}
										</Alert.Description>
									</Alert.Root>
								{/if}

								<div class="grid gap-4">
									{#each setup.accountGroups as group, index (group.label)}
										<div class="grid gap-3" aria-label={group.label}>
											<div class="flex items-center justify-between gap-3">
												<h3 class="text-sm font-semibold text-[color:var(--ink)]">{group.label}</h3>
												<span
													class="[font-family:var(--font-mono)] text-[0.68rem] tracking-[0.14em] text-[color:var(--ink-soft)] uppercase"
												>
													{group.entries.length}
												</span>
											</div>

											{#if accountsState === 'ready' && group.entries.length > 0}
												<ul class="grid gap-2">
													{#each group.entries as entry (entry.name)}
														<li
															class="border-border/60 bg-background/75 flex items-center justify-between gap-3 rounded-[1.35rem] border px-3 py-3"
														>
															<strong class="text-sm font-semibold text-[color:var(--ink)]">
																{entry.name}
															</strong>
															<Badge
																class="rounded-full bg-[color:var(--accent-soft)] px-3 py-1 text-[color:var(--accent)] shadow-none"
															>
																{formatAccountType(entry.type)}
															</Badge>
														</li>
													{/each}
												</ul>
											{:else if accountsState === 'ready'}
												<Empty.Root
													class="border-border/70 bg-background/70 min-h-0 border border-dashed p-6"
												>
													<Empty.Header>
														<Empty.Title class="text-sm font-semibold text-[color:var(--ink)]">
															{group.emptyLabel}
														</Empty.Title>
														<Empty.Description
															class="text-sm leading-6 text-[color:var(--ink-soft)]"
														>
															{ptBrCopy.workspace.accountFormHintReady}
														</Empty.Description>
													</Empty.Header>
												</Empty.Root>
											{/if}

											{#if index < setup.accountGroups.length - 1}
												<Separator class="bg-border/70" />
											{/if}
										</div>
									{/each}
								</div>

								<form
									class="border-border/70 bg-background/70 grid gap-4 rounded-[1.75rem] border p-4"
									aria-label={ptBrCopy.workspace.addAccountFormLabel}
									onsubmit={handleCreateAccount}
								>
									<Field.Field>
										<Field.Label for="account-name"
											>{ptBrCopy.workspace.accountNameLabel}</Field.Label
										>
										<Input
											id="account-name"
											type="text"
											bind:value={accountName}
											placeholder={ptBrCopy.workspace.accountNamePlaceholder}
											autocomplete="off"
											class="rounded-[1.35rem]"
										/>
									</Field.Field>

									<Field.Field>
										<Field.Label for="account-type"
											>{ptBrCopy.workspace.accountTypeLabel}</Field.Label
										>
										<NativeSelect.Root id="account-type" bind:value={accountType} class="w-full">
											{#each ACCOUNT_TYPE_OPTIONS as option (option)}
												<NativeSelect.Option value={option}>
													{formatAccountType(option)}
												</NativeSelect.Option>
											{/each}
										</NativeSelect.Root>
									</Field.Field>

									{#if createAccountError}
										<Alert.Root
											variant="destructive"
											class="border-[color:var(--danger-line)] bg-[color:var(--danger-soft)]"
										>
											<TriangleAlertIcon class="mt-0.5 size-4" />
											<Alert.Title>{createAccountError}</Alert.Title>
										</Alert.Root>
									{/if}

									<div class="flex flex-col gap-3">
										<p class="text-sm leading-6 text-[color:var(--ink-soft)]">{setupNote}</p>
										<Button
											type="submit"
											disabled={createAccountState === 'submitting'}
											class="w-full rounded-full"
										>
											{createAccountState === 'submitting'
												? ptBrCopy.workspace.addingAccount
												: ptBrCopy.workspace.addAccount}
										</Button>
									</div>
								</form>
							</div>
						</Accordion.Content>
					</Accordion.Item>
				</Accordion.Root>
			</Card.Root>
		</section>
	</div>
</section>

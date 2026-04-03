<script lang="ts">
	import { onMount } from 'svelte';

	import {
		type Account,
		type AccountType,
		type CreateTransactionInput,
		type Transaction,
		NumenApiError,
		createNumenApiClient
	} from '$lib/api';
	import { ACCOUNT_TYPE_OPTIONS, buildAccountSetupSummary } from '$lib/ledger/accounts';
	import {
		buildGuidedTransactionFieldErrors,
		createGuidedTransactionSchema,
		normalizeTransactionTags,
		type GuidedTransactionField,
		type GuidedTransactionForm
	} from '$lib/ledger/transactions';
	import { buildRecentTransactionItems } from '$lib/ledger/recent-transactions';
	import { formatAccountType, formatSignedDecimalAmount, ptBrCopy } from '$lib/locale';

	const api = createNumenApiClient();

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

	function getTodayDate(): string {
		return new Date().toISOString().slice(0, 10);
	}
</script>

<section class="workspace">
	<header class="masthead">
		<div>
			<p class="brand-kicker">{ptBrCopy.workspace.brandKicker}</p>
			<h1>{ptBrCopy.workspace.mastheadTitle}</h1>
		</div>
		<p class="masthead-note">{ptBrCopy.workspace.mastheadNote}</p>
	</header>

	<div class="layout">
		<aside class="rail" aria-labelledby="account-desk-heading">
			<div class="section-heading">
				<p class="section-kicker">{ptBrCopy.workspace.accountDeskKicker}</p>
				<h2 id="account-desk-heading">{ptBrCopy.workspace.accountDeskHeading}</h2>
			</div>

			<section class="setup-status" aria-live="polite">
				<h3>{setup.headline}</h3>
				<p>{setup.detail}</p>
				{#if accountsState === 'loading'}
					<p class="status-chip">{ptBrCopy.workspace.loadingAccounts}</p>
				{:else if accountsState === 'error'}
					<div class="status-stack">
						<p class="status-chip status-chip--error">{accountsError}</p>
						<button class="ghost-button" type="button" onclick={loadAccounts}>
							{ptBrCopy.common.retry}
						</button>
					</div>
				{/if}
			</section>

			{#each setup.accountGroups as group (group.label)}
				<section class="ledger-block" aria-label={group.label}>
					<h3>{group.label}</h3>
					<ul>
						{#if accountsState === 'ready' && group.entries.length > 0}
							{#each group.entries as entry (entry.name)}
								<li>
									<strong>{entry.name}</strong>
									<span>{formatAccountType(entry.type)}</span>
								</li>
							{/each}
						{:else if accountsState === 'ready'}
							<li class="empty-entry">
								<strong>{group.emptyLabel}</strong>
								<span>{ptBrCopy.workspace.accountFormHintReady}</span>
							</li>
						{/if}
					</ul>
				</section>
			{/each}

			<form
				class="account-form"
				aria-label={ptBrCopy.workspace.addAccountFormLabel}
				onsubmit={handleCreateAccount}
			>
				<label for="account-name">
					<span>{ptBrCopy.workspace.accountNameLabel}</span>
					<input
						id="account-name"
						type="text"
						bind:value={accountName}
						placeholder={ptBrCopy.workspace.accountNamePlaceholder}
						autocomplete="off"
					/>
				</label>

				<label for="account-type">
					<span>{ptBrCopy.workspace.accountTypeLabel}</span>
					<select id="account-type" bind:value={accountType}>
						{#each ACCOUNT_TYPE_OPTIONS as option (option)}
							<option value={option}>{formatAccountType(option)}</option>
						{/each}
					</select>
				</label>

				<div class="form-footer form-footer--rail">
					<p>{setupNote}</p>
					<button type="submit" disabled={createAccountState === 'submitting'}>
						{createAccountState === 'submitting'
							? ptBrCopy.workspace.addingAccount
							: ptBrCopy.workspace.addAccount}
					</button>
				</div>

				{#if createAccountError}
					<p class="inline-error" role="alert">{createAccountError}</p>
				{/if}
			</form>
		</aside>

		<main class="entry-stage" aria-labelledby="entry-stage-heading">
			<div class="section-heading">
				<p class="section-kicker">{ptBrCopy.workspace.structuredEntryKicker}</p>
				<h2 id="entry-stage-heading">{ptBrCopy.workspace.structuredEntryHeading}</h2>
			</div>

			<form
				class="entry-form"
				aria-label={ptBrCopy.workspace.transactionFormLabel}
				onsubmit={handleCreateTransaction}
			>
				<div class="field-row split">
					<label>
						<span>{ptBrCopy.workspace.dateLabel}</span>
						<input
							type="date"
							bind:value={transactionForm.date}
							aria-invalid={Boolean(transactionFieldErrors.date)}
						/>
					</label>
					<label>
						<span>{ptBrCopy.workspace.amountLabel}</span>
						<input
							type="text"
							bind:value={transactionForm.amount}
							placeholder={ptBrCopy.workspace.amountPlaceholder}
							inputmode="decimal"
							aria-invalid={Boolean(transactionFieldErrors.amount)}
						/>
					</label>
				</div>
				<div class="field-errors split">
					<p>{transactionFieldErrors.date}</p>
					<p>{transactionFieldErrors.amount}</p>
				</div>

				<label>
					<span>{ptBrCopy.workspace.titleLabel}</span>
					<input
						type="text"
						bind:value={transactionForm.title}
						placeholder={ptBrCopy.workspace.titlePlaceholder}
						autocomplete="off"
						aria-invalid={Boolean(transactionFieldErrors.title)}
					/>
				</label>
				<div class="field-errors">
					<p>{transactionFieldErrors.title}</p>
				</div>

				<label>
					<span>{ptBrCopy.workspace.payeeLabel}</span>
					<input
						type="text"
						bind:value={transactionForm.payee}
						placeholder={ptBrCopy.workspace.payeePlaceholder}
						autocomplete="off"
					/>
				</label>

				<div class="field-row split">
					<label>
						<span>{ptBrCopy.workspace.fundingAccountLabel}</span>
						<select
							bind:value={transactionForm.fundingAccount}
							aria-invalid={Boolean(transactionFieldErrors.fundingAccount)}
						>
							<option value="" disabled={setup.fundingAccounts.length > 0}
								>{ptBrCopy.workspace.fundingAccountPlaceholder}</option
							>
							{#each setup.fundingAccounts as account (account.name)}
								<option value={account.name}>{account.name}</option>
							{/each}
						</select>
					</label>
					<label>
						<span>{ptBrCopy.workspace.categoryAccountLabel}</span>
						<select
							bind:value={transactionForm.categoryAccount}
							aria-invalid={Boolean(transactionFieldErrors.categoryAccount)}
						>
							<option value="" disabled={setup.categoryAccounts.length > 0}
								>{ptBrCopy.workspace.categoryAccountPlaceholder}</option
							>
							{#each setup.categoryAccounts as account (account.name)}
								<option value={account.name}>{account.name}</option>
							{/each}
						</select>
					</label>
				</div>
				<div class="field-errors split">
					<p>{transactionFieldErrors.fundingAccount}</p>
					<p>{transactionFieldErrors.categoryAccount}</p>
				</div>

				<label>
					<span>{ptBrCopy.workspace.tagsLabel}</span>
					<input
						type="text"
						bind:value={transactionForm.tags}
						placeholder={ptBrCopy.workspace.tagsPlaceholder}
						autocomplete="off"
					/>
				</label>

				<section class="posting-preview" aria-label={ptBrCopy.workspace.postingPreviewLabel}>
					<div class="preview-heading">
						<span>{ptBrCopy.workspace.ledgerEffectLabel}</span>
						<p>
							{transactionForm.categoryAccount || ptBrCopy.workspace.postingPreviewHint}
						</p>
					</div>

					{#if postingPreview.length === 2}
						<ul class="preview-list">
							{#each postingPreview as posting (posting.account)}
								<li>
									<strong>{posting.account}</strong>
									<span>{formatSignedDecimalAmount(posting.amount)}</span>
								</li>
							{/each}
						</ul>
					{:else}
						<p class="preview-empty">{ptBrCopy.workspace.postingPreviewEmpty}</p>
					{/if}
				</section>

				<div class="field-group" role="group" aria-label={ptBrCopy.workspace.tagPreviewLabel}>
					<span>{ptBrCopy.workspace.tagPreviewLabel}</span>
					<div class:tags--empty={tagPreview.length === 0} class="tags">
						{#if tagPreview.length > 0}
							{#each tagPreview as tag (tag)}
								<span>{tag}</span>
							{/each}
						{:else}
							<span>{ptBrCopy.workspace.tagPreviewEmpty}</span>
						{/if}
					</div>
				</div>

				{#if transactionError}
					<p class="inline-error" role="alert">{transactionError}</p>
				{:else if transactionSuccess}
					<p class="inline-success" role="status">{transactionSuccess}</p>
				{/if}

				<div class="form-footer">
					<p>
						{#if setup.canRecordTransactions}
							{ptBrCopy.workspace.transactionFooterReady}
						{:else}
							{ptBrCopy.workspace.transactionFooterLocked}
						{/if}
					</p>
					<button
						type="submit"
						disabled={!setup.canRecordTransactions || transactionState === 'submitting'}
					>
						{transactionState === 'submitting'
							? ptBrCopy.workspace.recordingTransaction
							: ptBrCopy.workspace.recordTransaction}
					</button>
				</div>
			</form>
		</main>

		<section class="recent-panel" aria-labelledby="recent-transactions-heading">
			<div class="section-heading">
				<p class="section-kicker">{ptBrCopy.workspace.recentLedgerKicker}</p>
				<h2 id="recent-transactions-heading">{ptBrCopy.workspace.recentLedgerHeading}</h2>
			</div>

			{#if transactionsState === 'loading'}
				<p class="status-chip">{ptBrCopy.workspace.loadingTransactions}</p>
			{:else if transactionsState === 'error'}
				<div class="status-stack">
					<p class="status-chip status-chip--error">{transactionsError}</p>
					<button class="ghost-button" type="button" onclick={() => loadTransactions()}>
						{ptBrCopy.common.retry}
					</button>
				</div>
			{:else if recentTransactionItems.length === 0}
				<div class="recent-empty">
					<p>{ptBrCopy.workspace.recentEmpty}</p>
				</div>
			{:else}
				<ol class="transaction-list">
					{#each recentTransactionItems as transaction, index (transaction.key)}
						<li style={`--entry-delay:${index * 90}ms`}>
							<div class="transaction-meta">
								<p>{transaction.date}</p>
								<span>{transaction.category}</span>
							</div>
							<div class="transaction-copy">
								<strong>{transaction.title}</strong>
								<p>{transaction.payee}</p>
							</div>
							<div class="transaction-amount">{transaction.amount}</div>
						</li>
					{/each}
				</ol>
			{/if}
		</section>
	</div>
</section>

<style>
	.workspace {
		min-height: 100vh;
		padding: 1.25rem 1rem 2.5rem;
		position: relative;
		overflow: hidden;
	}

	.workspace::before {
		content: '';
		position: absolute;
		inset: 0;
		background: var(--page-overlay);
		pointer-events: none;
	}

	.masthead,
	.layout {
		position: relative;
		z-index: 1;
	}

	.masthead {
		max-width: 78rem;
		margin: 0 auto 1.75rem;
		display: grid;
		gap: 0.85rem;
		padding: 0 0.25rem;
		animation: rise-in 620ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
	}

	.brand-kicker,
	.section-kicker,
	.transaction-meta p,
	.transaction-meta span,
	.form-footer p,
	label span {
		font-family: 'IBM Plex Mono', 'SFMono-Regular', 'Courier New', monospace;
	}

	.brand-kicker,
	.section-kicker {
		margin: 0;
		text-transform: uppercase;
		letter-spacing: 0.16em;
		font-size: 0.73rem;
		color: var(--accent);
	}

	.masthead h1 {
		margin: 0.1rem 0 0;
		max-width: 11ch;
		font-size: clamp(2.9rem, 6vw, 5.8rem);
		line-height: 0.95;
		font-weight: 600;
		letter-spacing: -0.04em;
	}

	.masthead-note {
		margin: 0;
		max-width: 34rem;
		font-size: 1.08rem;
		line-height: 1.6;
		color: var(--ink-soft);
	}

	.layout {
		max-width: 78rem;
		margin: 0 auto;
		display: grid;
		grid-template-columns: minmax(16rem, 20rem) minmax(0, 1.4fr) minmax(18rem, 24rem);
		gap: 1rem;
		align-items: start;
	}

	.rail,
	.entry-stage,
	.recent-panel {
		background: var(--paper-lift);
		border: 1px solid var(--line);
		backdrop-filter: blur(14px);
		box-shadow: var(--card-shadow);
	}

	.rail,
	.recent-panel {
		border-radius: 1.6rem;
		padding: 1.3rem;
	}

	.entry-stage {
		border-radius: 2rem;
		padding: 1.5rem;
		position: relative;
		overflow: hidden;
	}

	.entry-stage::after {
		content: '';
		position: absolute;
		right: -3rem;
		top: -2rem;
		width: 11rem;
		height: 11rem;
		border-radius: 50%;
		background: var(--stage-aura);
		pointer-events: none;
	}

	.section-heading {
		display: grid;
		gap: 0.45rem;
		margin-bottom: 1rem;
	}

	.section-heading h2 {
		margin: 0;
		font-size: clamp(1.45rem, 2vw, 2.1rem);
		line-height: 1.08;
		font-weight: 500;
		max-width: 16ch;
	}

	.ledger-block + .ledger-block {
		margin-top: 1.15rem;
		padding-top: 1.15rem;
		border-top: 1px solid var(--line);
	}

	.ledger-block h3 {
		margin: 0 0 0.65rem;
		font-size: 0.98rem;
		font-weight: 600;
	}

	.ledger-block ul,
	.transaction-list {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.ledger-block li {
		display: grid;
		gap: 0.18rem;
		padding: 0.72rem 0;
		border-top: 1px solid var(--line-soft);
	}

	.ledger-block li:first-child {
		border-top: 0;
		padding-top: 0;
	}

	.ledger-block strong,
	.transaction-copy strong {
		font-weight: 600;
	}

	.ledger-block span,
	.transaction-copy p,
	.setup-status p {
		margin: 0;
		color: var(--ink-soft);
		line-height: 1.45;
	}

	.setup-status {
		display: grid;
		gap: 0.55rem;
		padding: 1rem 0 1.1rem;
		border-top: 1px solid var(--line-soft);
		border-bottom: 1px solid var(--line-soft);
		margin-bottom: 1rem;
	}

	.setup-status h3 {
		margin: 0;
		font-size: 1rem;
		font-weight: 600;
	}

	.status-chip {
		display: inline-flex;
		align-items: center;
		width: fit-content;
		padding: 0.45rem 0.7rem;
		border-radius: 999px;
		background: var(--status-chip-surface);
		font-family: 'IBM Plex Mono', 'SFMono-Regular', 'Courier New', monospace;
		font-size: 0.72rem;
		letter-spacing: 0.02em;
		color: var(--ink-soft);
	}

	.status-chip--error,
	.inline-error {
		color: var(--danger);
	}

	.status-chip--error {
		background: var(--danger-soft);
	}

	.status-stack {
		display: flex;
		flex-wrap: wrap;
		gap: 0.7rem;
		align-items: center;
	}

	.entry-form {
		display: grid;
		gap: 1rem;
	}

	label,
	.field-group {
		display: grid;
		gap: 0.45rem;
	}

	label span {
		font-size: 0.72rem;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		color: var(--accent);
	}

	.field-row {
		display: grid;
		gap: 0.9rem;
	}

	.field-row.split {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	input,
	select,
	.tags,
	.posting-preview {
		border: 1px solid var(--field-border);
		background: var(--field-surface);
		border-radius: 1rem;
		padding: 0.95rem 1rem;
		min-height: 3.35rem;
		font: inherit;
		color: var(--ink);
		transition:
			transform 180ms ease,
			border-color 180ms ease,
			box-shadow 180ms ease;
	}

	input:hover,
	select:hover,
	.tags:hover,
	.posting-preview:hover {
		transform: translateY(-1px);
		border-color: var(--field-border-hover);
		box-shadow: var(--field-shadow);
	}

	input {
		width: 100%;
	}

	select {
		width: 100%;
		font: inherit;
		color: var(--ink);
		appearance: none;
	}

	input[aria-invalid='true'],
	select[aria-invalid='true'] {
		border-color: var(--danger-line);
		box-shadow: 0 0 0 1px var(--danger-ring);
	}

	input:focus-visible,
	select:focus-visible,
	button:focus-visible,
	.ghost-button:focus-visible {
		outline: 2px solid var(--focus-ring);
		outline-offset: 2px;
		border-color: var(--field-border-hover);
	}

	.tags {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		align-items: center;
	}

	.tags span {
		padding: 0.4rem 0.68rem;
		border-radius: 999px;
		background: var(--accent-soft);
		font-family: 'IBM Plex Mono', 'SFMono-Regular', 'Courier New', monospace;
		font-size: 0.76rem;
	}

	.tags--empty {
		color: var(--ink-soft);
	}

	.field-errors {
		display: grid;
		gap: 0.4rem;
		margin: -0.3rem 0 0;
		min-height: 1rem;
	}

	.field-errors.split {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	.field-errors p {
		margin: 0;
		min-height: 1rem;
		font-family: 'IBM Plex Mono', 'SFMono-Regular', 'Courier New', monospace;
		font-size: 0.72rem;
		line-height: 1.4;
		color: var(--danger);
	}

	.posting-preview {
		display: grid;
		gap: 0.8rem;
		padding: 1rem;
	}

	.preview-heading {
		display: grid;
		gap: 0.28rem;
	}

	.preview-heading span,
	.preview-heading p,
	.preview-empty {
		margin: 0;
	}

	.preview-heading span {
		font-family: 'IBM Plex Mono', 'SFMono-Regular', 'Courier New', monospace;
		font-size: 0.72rem;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		color: var(--accent);
	}

	.preview-heading p,
	.preview-empty {
		color: var(--ink-soft);
		line-height: 1.45;
	}

	.preview-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: grid;
		gap: 0.55rem;
	}

	.preview-list li {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.8rem;
		padding-top: 0.55rem;
		border-top: 1px solid var(--line-soft);
	}

	.preview-list li:first-child {
		padding-top: 0;
		border-top: 0;
	}

	.preview-list span {
		font-family: 'IBM Plex Mono', 'SFMono-Regular', 'Courier New', monospace;
		color: var(--accent);
	}

	.form-footer {
		margin-top: 0.35rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
	}

	.form-footer p {
		margin: 0;
		font-size: 0.74rem;
		line-height: 1.45;
		color: var(--ink-soft);
		max-width: 20rem;
	}

	button {
		border: 0;
		border-radius: 999px;
		padding: 0.9rem 1.25rem;
		font: inherit;
		font-weight: 600;
		background: var(--button-surface);
		color: var(--button-ink);
		box-shadow: var(--button-shadow);
		opacity: 0.64;
		cursor: not-allowed;
	}

	.account-form {
		display: grid;
		gap: 0.9rem;
		margin-top: 1.2rem;
		padding-top: 1.2rem;
		border-top: 1px solid var(--line);
	}

	.form-footer--rail {
		align-items: flex-start;
	}

	.form-footer--rail button {
		cursor: pointer;
		opacity: 1;
	}

	.form-footer--rail button:disabled {
		cursor: progress;
		opacity: 0.7;
	}

	.ghost-button {
		border: 1px solid var(--field-border);
		background: var(--ghost-surface);
		color: var(--ink);
		box-shadow: none;
		cursor: pointer;
		padding: 0.65rem 0.9rem;
	}

	.inline-error {
		margin: 0;
		font-family: 'IBM Plex Mono', 'SFMono-Regular', 'Courier New', monospace;
		font-size: 0.74rem;
		line-height: 1.4;
	}

	.inline-success {
		margin: 0;
		font-family: 'IBM Plex Mono', 'SFMono-Regular', 'Courier New', monospace;
		font-size: 0.74rem;
		line-height: 1.4;
		color: var(--success);
	}

	.empty-entry {
		opacity: 0.92;
	}

	.recent-empty {
		padding: 0.25rem 0;
		color: var(--ink-soft);
		line-height: 1.55;
	}

	.recent-empty p {
		margin: 0;
	}

	.transaction-list {
		display: grid;
		gap: 0.7rem;
	}

	.transaction-list li {
		display: grid;
		grid-template-columns: minmax(0, 6rem) minmax(0, 1fr) auto;
		gap: 0.9rem;
		align-items: start;
		padding: 0.95rem 0;
		border-top: 1px solid var(--line-strong);
		animation: float-in 480ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
		animation-delay: var(--entry-delay, 0ms);
	}

	.transaction-list li:first-child {
		border-top: 0;
		padding-top: 0.2rem;
	}

	.transaction-meta {
		display: grid;
		gap: 0.28rem;
	}

	.transaction-meta p,
	.transaction-meta span {
		margin: 0;
		font-size: 0.7rem;
		letter-spacing: 0.04em;
		color: var(--ink-soft);
	}

	.transaction-meta span {
		text-transform: uppercase;
	}

	.transaction-copy p {
		margin-top: 0.18rem;
		font-size: 0.92rem;
	}

	.transaction-amount {
		font-family: 'IBM Plex Mono', 'SFMono-Regular', 'Courier New', monospace;
		font-size: 0.95rem;
		letter-spacing: 0.03em;
		color: var(--accent);
		padding-top: 0.08rem;
	}

	@keyframes rise-in {
		from {
			opacity: 0;
			transform: translateY(18px);
		}

		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@keyframes float-in {
		from {
			opacity: 0;
			transform: translateY(10px);
		}

		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@media (max-width: 70rem) {
		.layout {
			grid-template-columns: minmax(0, 1fr);
		}

		.section-heading h2,
		.masthead h1 {
			max-width: none;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.masthead,
		.transaction-list li {
			animation: none;
		}

		input,
		select,
		.tags,
		.posting-preview {
			transition: none;
		}
	}

	@media (max-width: 40rem) {
		.workspace {
			padding: 0.8rem 0.75rem 1.5rem;
		}

		.entry-stage,
		.rail,
		.recent-panel {
			padding: 1rem;
			border-radius: 1.3rem;
		}

		.field-row.split,
		.transaction-list li {
			grid-template-columns: minmax(0, 1fr);
		}

		.form-footer {
			flex-direction: column;
			align-items: stretch;
		}
	}
</style>

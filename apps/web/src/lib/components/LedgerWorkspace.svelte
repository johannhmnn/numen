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
	import {
		ACCOUNT_TYPE_OPTIONS,
		buildAccountSetupSummary
	} from '$lib/ledger/accounts';
	import {
		buildGuidedTransactionFieldErrors,
		createGuidedTransactionSchema,
		normalizeTransactionTags,
		type GuidedTransactionField,
		type GuidedTransactionForm
	} from '$lib/ledger/transactions';
	import { buildRecentTransactionItems } from '$lib/ledger/recent-transactions';

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
		setup.canRecordTransactions
			? 'Use the account desk to add more ledgers as your structure evolves.'
			: setup.detail
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
			accountsError = getErrorMessage(error, 'Unable to load accounts right now.');
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
			transactionsError = getErrorMessage(error, 'Unable to load recent transactions right now.');
		}
	}

	async function handleCreateAccount(event: SubmitEvent) {
		event.preventDefault();

		const trimmedName = accountName.trim();

		if (!trimmedName) {
			createAccountError = 'Account name is required.';
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
			createAccountError = getErrorMessage(error, 'Unable to create the account right now.');
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
			transactionError = 'Review the highlighted fields and try again.';
			return;
		}

		transactionState = 'submitting';

		try {
			await api.createTransaction(parsed.data);
			await loadTransactions(true);
			transactionSuccess = 'Transaction recorded to the local ledger.';
			resetTransactionForm(parsed.data);
		} catch (error) {
			transactionError = getErrorMessage(error, 'Unable to record the transaction right now.');
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

		if (!nextSetup.fundingAccounts.some((account) => account.name === transactionForm.fundingAccount)) {
			transactionForm.fundingAccount = nextSetup.fundingAccounts[0]?.name ?? '';
		}

		if (
			!nextSetup.categoryAccounts.some((account) => account.name === transactionForm.categoryAccount)
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
			<p class="brand-kicker">Numen ledger</p>
			<h1>Structured entry for the transactions you actually remember.</h1>
		</div>
		<p class="masthead-note">
			A warm, local-first desk for account setup, guided transaction capture, and recent ledger
			movement.
		</p>
	</header>

	<div class="layout">
		<aside class="rail" aria-labelledby="account-desk-heading">
			<div class="section-heading">
				<p class="section-kicker">Account desk</p>
				<h2 id="account-desk-heading">Choose the accounts that frame each entry.</h2>
			</div>

			<section class="setup-status" aria-live="polite">
				<h3>{setup.headline}</h3>
				<p>{setup.detail}</p>
				{#if accountsState === 'loading'}
					<p class="status-chip">Loading your ledger accounts...</p>
				{:else if accountsState === 'error'}
					<div class="status-stack">
						<p class="status-chip status-chip--error">{accountsError}</p>
						<button class="ghost-button" type="button" onclick={loadAccounts}>Try again</button>
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
									<span>{entry.type}</span>
								</li>
							{/each}
						{:else if accountsState === 'ready'}
							<li class="empty-entry">
								<strong>{group.emptyLabel}</strong>
								<span>Add it below so the guided transaction flow can use it.</span>
							</li>
						{/if}
					</ul>
				</section>
			{/each}

			<form class="account-form" aria-label="Add account" onsubmit={handleCreateAccount}>
				<label for="account-name">
					<span>Account name</span>
					<input
						id="account-name"
						type="text"
						bind:value={accountName}
						placeholder="Expenses:Groceries"
						autocomplete="off"
					/>
				</label>

				<label for="account-type">
					<span>Account type</span>
					<select id="account-type" bind:value={accountType}>
						{#each ACCOUNT_TYPE_OPTIONS as option (option)}
							<option value={option}>{option}</option>
						{/each}
					</select>
				</label>

				<div class="form-footer form-footer--rail">
					<p>{setupNote}</p>
					<button type="submit" disabled={createAccountState === 'submitting'}>
						{createAccountState === 'submitting' ? 'Adding…' : 'Add account'}
					</button>
				</div>

				{#if createAccountError}
					<p class="inline-error" role="alert">{createAccountError}</p>
				{/if}
			</form>
		</aside>

		<main class="entry-stage" aria-labelledby="entry-stage-heading">
			<div class="section-heading">
				<p class="section-kicker">Structured entry</p>
				<h2 id="entry-stage-heading">Record one funding account, one category account, one clear amount.</h2>
			</div>

			<form class="entry-form" aria-label="Guided transaction entry" onsubmit={handleCreateTransaction}>
				<div class="field-row split">
					<label>
						<span>Date</span>
						<input
							type="date"
							bind:value={transactionForm.date}
							aria-invalid={Boolean(transactionFieldErrors.date)}
						/>
					</label>
					<label>
						<span>Amount</span>
						<input
							type="text"
							bind:value={transactionForm.amount}
							placeholder="48.20"
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
					<span>Title</span>
					<input
						type="text"
						bind:value={transactionForm.title}
						placeholder="Groceries"
						autocomplete="off"
						aria-invalid={Boolean(transactionFieldErrors.title)}
					/>
				</label>
				<div class="field-errors">
					<p>{transactionFieldErrors.title}</p>
				</div>

				<label>
					<span>Payee</span>
					<input
						type="text"
						bind:value={transactionForm.payee}
						placeholder="Mercado Central"
						autocomplete="off"
					/>
				</label>

				<div class="field-row split">
					<label>
						<span>Funding account</span>
						<select
							bind:value={transactionForm.fundingAccount}
							aria-invalid={Boolean(transactionFieldErrors.fundingAccount)}
						>
							<option value="" disabled={setup.fundingAccounts.length > 0}>Select a funding account</option>
							{#each setup.fundingAccounts as account (account.name)}
								<option value={account.name}>{account.name}</option>
							{/each}
						</select>
					</label>
					<label>
						<span>Category account</span>
						<select
							bind:value={transactionForm.categoryAccount}
							aria-invalid={Boolean(transactionFieldErrors.categoryAccount)}
						>
							<option value="" disabled={setup.categoryAccounts.length > 0}>Select a category account</option>
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
					<span>Tags</span>
					<input
						type="text"
						bind:value={transactionForm.tags}
						placeholder="food, weekly, home"
						autocomplete="off"
					/>
				</label>

				<section class="posting-preview" aria-label="Posting preview">
					<div class="preview-heading">
						<span>Ledger effect</span>
						<p>{transactionForm.categoryAccount || 'Choose accounts to preview the two postings.'}</p>
					</div>

					{#if postingPreview.length === 2}
						<ul class="preview-list">
							{#each postingPreview as posting (posting.account)}
								<li>
									<strong>{posting.account}</strong>
									<span>{posting.amount}</span>
								</li>
							{/each}
						</ul>
					{:else}
						<p class="preview-empty">
							Enter the amount, funding account, and category account to see the balanced pair.
						</p>
					{/if}
				</section>

				<div class="field-group" role="group" aria-label="Tags preview">
					<span>Tag preview</span>
					<div class:tags--empty={tagPreview.length === 0} class="tags">
						{#if tagPreview.length > 0}
							{#each tagPreview as tag (tag)}
								<span>{tag}</span>
							{/each}
						{:else}
							<span>No tags yet</span>
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
							One amount in. Two balanced postings out. The form derives the ledger shape for you.
						{:else}
							Add one funding account and one category account before transaction entry unlocks.
						{/if}
					</p>
					<button
						type="submit"
						disabled={!setup.canRecordTransactions || transactionState === 'submitting'}
					>
						{transactionState === 'submitting' ? 'Recording…' : 'Record transaction'}
					</button>
				</div>
			</form>
		</main>

		<section class="recent-panel" aria-labelledby="recent-transactions-heading">
			<div class="section-heading">
				<p class="section-kicker">Recent ledger</p>
				<h2 id="recent-transactions-heading">Newest transactions stay visible the moment they land.</h2>
			</div>

			{#if transactionsState === 'loading'}
				<p class="status-chip">Loading recent transactions...</p>
			{:else if transactionsState === 'error'}
				<div class="status-stack">
					<p class="status-chip status-chip--error">{transactionsError}</p>
					<button class="ghost-button" type="button" onclick={() => loadTransactions()}>
						Try again
					</button>
				</div>
			{:else if recentTransactionItems.length === 0}
				<div class="recent-empty">
					<p>Record a transaction and it will appear here as your latest ledger move.</p>
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
	:global(body) {
		--paper: #f5ead9;
		--paper-deep: #e9dcc7;
		--ink: #26180f;
		--ink-soft: #5a4739;
		--line: rgba(58, 38, 25, 0.16);
		--accent: #8b4f2b;
		--accent-soft: rgba(139, 79, 43, 0.12);
		margin: 0;
		font-family: 'Fraunces', 'Iowan Old Style', 'Palatino Linotype', serif;
		color: var(--ink);
		background:
			linear-gradient(180deg, rgba(255, 252, 247, 0.82), rgba(245, 234, 217, 0.96)),
			repeating-linear-gradient(
				180deg,
				rgba(114, 88, 64, 0.055) 0,
				rgba(114, 88, 64, 0.055) 1px,
				transparent 1px,
				transparent 40px
			),
			radial-gradient(circle at top left, rgba(181, 117, 63, 0.18), transparent 36%),
			linear-gradient(180deg, #fff8ee 0%, #efe1cb 100%);
	}

	:global(*) {
		box-sizing: border-box;
	}

	.workspace {
		min-height: 100vh;
		padding: 2rem 1rem 2.5rem;
		position: relative;
		overflow: hidden;
	}

	.workspace::before {
		content: '';
		position: absolute;
		inset: 0;
		background:
			radial-gradient(circle at 20% 20%, rgba(255, 255, 255, 0.42), transparent 0 30%),
			radial-gradient(circle at 88% 18%, rgba(112, 69, 36, 0.12), transparent 0 18%);
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
		background: rgba(255, 250, 244, 0.72);
		border: 1px solid var(--line);
		backdrop-filter: blur(14px);
		box-shadow: 0 24px 60px rgba(69, 42, 25, 0.07);
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
		background: radial-gradient(circle, rgba(139, 79, 43, 0.16), transparent 70%);
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
		border-top: 1px solid rgba(58, 38, 25, 0.08);
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
		border-top: 1px solid rgba(58, 38, 25, 0.08);
		border-bottom: 1px solid rgba(58, 38, 25, 0.08);
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
		background: rgba(38, 24, 15, 0.06);
		font-family: 'IBM Plex Mono', 'SFMono-Regular', 'Courier New', monospace;
		font-size: 0.72rem;
		letter-spacing: 0.02em;
		color: var(--ink-soft);
	}

	.status-chip--error,
	.inline-error {
		color: #8c2c22;
	}

	.status-chip--error {
		background: rgba(163, 58, 46, 0.1);
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
		border: 1px solid rgba(73, 43, 24, 0.16);
		background:
			linear-gradient(180deg, rgba(255, 255, 255, 0.72), rgba(249, 240, 227, 0.85));
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
		border-color: rgba(139, 79, 43, 0.32);
		box-shadow: 0 12px 24px rgba(96, 58, 30, 0.08);
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
		border-color: rgba(163, 58, 46, 0.55);
		box-shadow: 0 0 0 1px rgba(163, 58, 46, 0.16);
	}

	input:focus-visible,
	select:focus-visible,
	button:focus-visible,
	.ghost-button:focus-visible {
		outline: 2px solid rgba(139, 79, 43, 0.42);
		outline-offset: 2px;
		border-color: rgba(139, 79, 43, 0.42);
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
		color: #8c2c22;
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
		border-top: 1px solid rgba(58, 38, 25, 0.08);
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
		background: linear-gradient(180deg, #8f5330, #734024);
		color: #fff7f1;
		box-shadow: 0 16px 32px rgba(103, 60, 32, 0.18);
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
		border: 1px solid rgba(73, 43, 24, 0.16);
		background: rgba(255, 250, 244, 0.84);
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
		color: #2a5a37;
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
		border-top: 1px solid rgba(58, 38, 25, 0.1);
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
			padding: 1rem 0.75rem 1.5rem;
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

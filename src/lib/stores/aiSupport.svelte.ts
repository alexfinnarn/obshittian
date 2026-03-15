import {
	installAiSupport,
	readAiSupportStatus,
	reinstallAiSupport,
	upgradeAiSupport,
	type AiSupportInstallAction,
	type AiSupportStatus
} from '$lib/services/aiSupport';

export interface AiSupportStoreState {
	report: AiSupportStatus | null;
	isLoading: boolean;
	isApplying: boolean;
	error: string | null;
	lastAction: AiSupportInstallAction | null;
}

export const aiSupportStore = $state<AiSupportStoreState>({
	report: null,
	isLoading: false,
	isApplying: false,
	error: null,
	lastAction: null
});

function getErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : 'Unknown AI support error';
}

export async function refreshAiSupportStatus(): Promise<AiSupportStatus | null> {
	aiSupportStore.isLoading = true;
	aiSupportStore.error = null;

	try {
		const report = await readAiSupportStatus();
		aiSupportStore.report = report;
		return report;
	} catch (error) {
		aiSupportStore.report = null;
		aiSupportStore.error = getErrorMessage(error);
		return null;
	} finally {
		aiSupportStore.isLoading = false;
	}
}

export async function runAiSupportAction(
	action: AiSupportInstallAction
): Promise<AiSupportStatus | null> {
	aiSupportStore.isApplying = true;
	aiSupportStore.error = null;
	aiSupportStore.lastAction = action;

	try {
		const report =
			action === 'install'
				? await installAiSupport()
				: action === 'upgrade'
					? await upgradeAiSupport()
					: await reinstallAiSupport();
		aiSupportStore.report = report;
		return report;
	} catch (error) {
		aiSupportStore.error = getErrorMessage(error);
		return null;
	} finally {
		aiSupportStore.isApplying = false;
	}
}

export function resetAiSupportState(): void {
	aiSupportStore.report = null;
	aiSupportStore.isLoading = false;
	aiSupportStore.isApplying = false;
	aiSupportStore.error = null;
	aiSupportStore.lastAction = null;
}

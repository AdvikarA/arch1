import { Disposable } from "../../base/common/lifecycle.js";
import { localize } from '../../nls.js';
import { ILogService } from '../../platform/log/common/log.js';
import { INotificationService, Severity } from '../../platform/notification/common/notification.js';
import { IProductService } from '../../platform/product/common/productService.js';
import { IStorageService, StorageScope, StorageTarget } from '../../platform/storage/common/storage.js';

export class CodeServerClient extends Disposable {
	constructor (
		@ILogService private logService: ILogService,
		@INotificationService private notificationService: INotificationService,
		@IProductService private productService: IProductService,
		@IStorageService private storageService: IStorageService,
	) {
		super();
	}

	async startup(): Promise<void> {
		// Emit ready events
		const event = new CustomEvent('ide-ready');
		window.dispatchEvent(event);

		if (parent) {
			// Tell the parent loading has completed.
			parent.postMessage({ event: 'loaded' }, '*');

			// Proxy or stop proxing events as requested by the parent.
			const listeners = new Map<string, (event: Event) => void>();

			window.addEventListener('message', parentEvent => {
				const eventName = parentEvent.data.bind || parentEvent.data.unbind;
				if (eventName) {
					const oldListener = listeners.get(eventName);
					if (oldListener) {
						document.removeEventListener(eventName, oldListener);
					}
				}

				if (parentEvent.data.bind && parentEvent.data.prop) {
					const listener = (event: Event) => {
						parent?.postMessage(
							{
								event: parentEvent.data.event,
								[parentEvent.data.prop]: event[parentEvent.data.prop as keyof Event],
							},
							window.location.origin,
						);
					};
					listeners.set(parentEvent.data.bind, listener);
					document.addEventListener(parentEvent.data.bind, listener);
				}
			});
		}

		if (!window.isSecureContext) {
			this.notificationService.notify({
				severity: Severity.Warning,
				message: localize(
					'insecureContext',
					"{0} is being accessed in an insecure context. Web views, the clipboard, and other functionality may not work as expected.",
					'code-server',
				),
				actions: {
					primary: [
						{
							id: 'understand',
							label: localize('confirmInsecure', "I understand"),
							tooltip: '',
							class: undefined,
							enabled: true,
							checked: true,
							run: () => {
								return Promise.resolve();
							},
						},
					],
				},
			});
		}

		if (this.productService.updateEndpoint) {
			this.checkUpdates(this.productService.updateEndpoint)
		}
	}

	private checkUpdates(updateEndpoint: string) {
		const getUpdate = async (updateCheckEndpoint: string): Promise<void> => {
			this.logService.debug('Checking for update...');

			const response = await fetch(updateCheckEndpoint, {
				headers: { Accept: 'application/json' },
			});
			if (!response.ok) {
				throw new Error(response.statusText);
			}
			const json = await response.json();
			if (json.error) {
				throw new Error(json.error);
			}
			if (json.isLatest) {
				return;
			}

			const lastNoti = this.storageService.getNumber('csLastUpdateNotification', StorageScope.APPLICATION);
			if (lastNoti) {
				// Only remind them again after 1 week.
				const timeout = 1000 * 60 * 60 * 24 * 7;
				const threshold = lastNoti + timeout;
				if (Date.now() < threshold) {
					return;
				}
			}

			this.storageService.store('csLastUpdateNotification', Date.now(), StorageScope.APPLICATION, StorageTarget.MACHINE);

			this.notificationService.notify({
				severity: Severity.Info,
				message: `[code-server v${json.latest}](https://github.com/cdr/code-server/releases/tag/v${json.latest}) has been released!`,
			});
		};

		const updateLoop = (): void => {
			getUpdate(updateEndpoint)
				.catch(error => {
					this.logService.debug(`failed to check for update: ${error}`);
				})
				.finally(() => {
					// Check again every 6 hours.
					setTimeout(updateLoop, 1000 * 60 * 60 * 6);
				});
		};

		updateLoop();
	}
}

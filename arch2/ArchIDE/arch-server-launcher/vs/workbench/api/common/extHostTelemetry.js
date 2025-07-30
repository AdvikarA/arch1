/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { createDecorator } from '../../../platform/instantiation/common/instantiation.js';
import { Emitter } from '../../../base/common/event.js';
import { ILoggerService } from '../../../platform/log/common/log.js';
import { IExtHostInitDataService } from './extHostInitDataService.js';
import { UIKind } from '../../services/extensions/common/extensionHostProtocol.js';
import { getRemoteName } from '../../../platform/remote/common/remoteHosts.js';
import { cleanData, cleanRemoteAuthority, TelemetryLogGroup } from '../../../platform/telemetry/common/telemetryUtils.js';
import { mixin } from '../../../base/common/objects.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { localize } from '../../../nls.js';
let ExtHostTelemetry = class ExtHostTelemetry extends Disposable {
    constructor(isWorker, initData, loggerService) {
        super();
        this.initData = initData;
        this._onDidChangeTelemetryEnabled = this._register(new Emitter());
        this.onDidChangeTelemetryEnabled = this._onDidChangeTelemetryEnabled.event;
        this._onDidChangeTelemetryConfiguration = this._register(new Emitter());
        this.onDidChangeTelemetryConfiguration = this._onDidChangeTelemetryConfiguration.event;
        this._productConfig = { usage: true, error: true };
        this._level = 0 /* TelemetryLevel.NONE */;
        this._inLoggingOnlyMode = false;
        this._telemetryLoggers = new Map();
        this._inLoggingOnlyMode = this.initData.environment.isExtensionTelemetryLoggingOnly;
        const id = initData.remote.isRemote ? 'remoteExtHostTelemetry' : isWorker ? 'workerExtHostTelemetry' : 'extHostTelemetry';
        this._outputLogger = this._register(loggerService.createLogger(id, {
            name: localize('extensionTelemetryLog', "Extension Telemetry{0}", this._inLoggingOnlyMode ? ' (Not Sent)' : ''),
            hidden: true,
            group: TelemetryLogGroup,
        }));
    }
    getTelemetryConfiguration() {
        return this._level === 3 /* TelemetryLevel.USAGE */;
    }
    getTelemetryDetails() {
        return {
            isCrashEnabled: this._level >= 1 /* TelemetryLevel.CRASH */,
            isErrorsEnabled: this._productConfig.error ? this._level >= 2 /* TelemetryLevel.ERROR */ : false,
            isUsageEnabled: this._productConfig.usage ? this._level >= 3 /* TelemetryLevel.USAGE */ : false
        };
    }
    instantiateLogger(extension, sender, options) {
        const telemetryDetails = this.getTelemetryDetails();
        const logger = new ExtHostTelemetryLogger(sender, options, extension, this._outputLogger, this._inLoggingOnlyMode, this.getBuiltInCommonProperties(extension), { isUsageEnabled: telemetryDetails.isUsageEnabled, isErrorsEnabled: telemetryDetails.isErrorsEnabled });
        const loggers = this._telemetryLoggers.get(extension.identifier.value) ?? [];
        this._telemetryLoggers.set(extension.identifier.value, [...loggers, logger]);
        return logger.apiTelemetryLogger;
    }
    $initializeTelemetryLevel(level, supportsTelemetry, productConfig) {
        this._level = level;
        this._productConfig = productConfig ?? { usage: true, error: true };
    }
    getBuiltInCommonProperties(extension) {
        const commonProperties = Object.create(null);
        // TODO @lramos15, does os info like node arch, platform version, etc exist here.
        // Or will first party extensions just mix this in
        commonProperties['common.extname'] = `${extension.publisher}.${extension.name}`;
        commonProperties['common.extversion'] = extension.version;
        commonProperties['common.vscodemachineid'] = this.initData.telemetryInfo.machineId;
        commonProperties['common.vscodesessionid'] = this.initData.telemetryInfo.sessionId;
        commonProperties['common.vscodecommithash'] = this.initData.commit;
        commonProperties['common.sqmid'] = this.initData.telemetryInfo.sqmId;
        commonProperties['common.devDeviceId'] = this.initData.telemetryInfo.devDeviceId;
        commonProperties['common.vscodeversion'] = this.initData.version;
        commonProperties['common.vscodereleasedate'] = this.initData.date;
        commonProperties['common.isnewappinstall'] = isNewAppInstall(this.initData.telemetryInfo.firstSessionDate);
        commonProperties['common.product'] = this.initData.environment.appHost;
        switch (this.initData.uiKind) {
            case UIKind.Web:
                commonProperties['common.uikind'] = 'web';
                break;
            case UIKind.Desktop:
                commonProperties['common.uikind'] = 'desktop';
                break;
            default:
                commonProperties['common.uikind'] = 'unknown';
        }
        commonProperties['common.remotename'] = getRemoteName(cleanRemoteAuthority(this.initData.remote.authority));
        return commonProperties;
    }
    $onDidChangeTelemetryLevel(level) {
        this._oldTelemetryEnablement = this.getTelemetryConfiguration();
        this._level = level;
        const telemetryDetails = this.getTelemetryDetails();
        // Remove all disposed loggers
        this._telemetryLoggers.forEach((loggers, key) => {
            const newLoggers = loggers.filter(l => !l.isDisposed);
            if (newLoggers.length === 0) {
                this._telemetryLoggers.delete(key);
            }
            else {
                this._telemetryLoggers.set(key, newLoggers);
            }
        });
        // Loop through all loggers and update their level
        this._telemetryLoggers.forEach(loggers => {
            for (const logger of loggers) {
                logger.updateTelemetryEnablements(telemetryDetails.isUsageEnabled, telemetryDetails.isErrorsEnabled);
            }
        });
        if (this._oldTelemetryEnablement !== this.getTelemetryConfiguration()) {
            this._onDidChangeTelemetryEnabled.fire(this.getTelemetryConfiguration());
        }
        this._onDidChangeTelemetryConfiguration.fire(this.getTelemetryDetails());
    }
    onExtensionError(extension, error) {
        const loggers = this._telemetryLoggers.get(extension.value);
        const nonDisposedLoggers = loggers?.filter(l => !l.isDisposed);
        if (!nonDisposedLoggers) {
            this._telemetryLoggers.delete(extension.value);
            return false;
        }
        let errorEmitted = false;
        for (const logger of nonDisposedLoggers) {
            if (logger.ignoreUnhandledExtHostErrors) {
                continue;
            }
            logger.logError(error);
            errorEmitted = true;
        }
        return errorEmitted;
    }
};
ExtHostTelemetry = __decorate([
    __param(1, IExtHostInitDataService),
    __param(2, ILoggerService)
], ExtHostTelemetry);
export { ExtHostTelemetry };
export class ExtHostTelemetryLogger {
    static validateSender(sender) {
        if (typeof sender !== 'object') {
            throw new TypeError('TelemetrySender argument is invalid');
        }
        if (typeof sender.sendEventData !== 'function') {
            throw new TypeError('TelemetrySender.sendEventData must be a function');
        }
        if (typeof sender.sendErrorData !== 'function') {
            throw new TypeError('TelemetrySender.sendErrorData must be a function');
        }
        if (typeof sender.flush !== 'undefined' && typeof sender.flush !== 'function') {
            throw new TypeError('TelemetrySender.flush must be a function or undefined');
        }
    }
    constructor(sender, options, _extension, _logger, _inLoggingOnlyMode, _commonProperties, telemetryEnablements) {
        this._extension = _extension;
        this._logger = _logger;
        this._inLoggingOnlyMode = _inLoggingOnlyMode;
        this._commonProperties = _commonProperties;
        this._onDidChangeEnableStates = new Emitter();
        this.ignoreUnhandledExtHostErrors = options?.ignoreUnhandledErrors ?? false;
        this._ignoreBuiltinCommonProperties = options?.ignoreBuiltInCommonProperties ?? false;
        this._additionalCommonProperties = options?.additionalCommonProperties;
        this._sender = sender;
        this._telemetryEnablements = { isUsageEnabled: telemetryEnablements.isUsageEnabled, isErrorsEnabled: telemetryEnablements.isErrorsEnabled };
    }
    updateTelemetryEnablements(isUsageEnabled, isErrorsEnabled) {
        if (this._apiObject) {
            this._telemetryEnablements = { isUsageEnabled, isErrorsEnabled };
            this._onDidChangeEnableStates.fire(this._apiObject);
        }
    }
    mixInCommonPropsAndCleanData(data) {
        // Some telemetry modules prefer to break properties and measurmements up
        // We mix common properties into the properties tab.
        let updatedData = 'properties' in data ? (data.properties ?? {}) : data;
        // We don't clean measurements since they are just numbers
        updatedData = cleanData(updatedData, []);
        if (this._additionalCommonProperties) {
            updatedData = mixin(updatedData, this._additionalCommonProperties);
        }
        if (!this._ignoreBuiltinCommonProperties) {
            updatedData = mixin(updatedData, this._commonProperties);
        }
        if ('properties' in data) {
            data.properties = updatedData;
        }
        else {
            data = updatedData;
        }
        return data;
    }
    logEvent(eventName, data) {
        // No sender means likely disposed of, we should no-op
        if (!this._sender) {
            return;
        }
        // If it's a built-in extension (vscode publisher) we don't prefix the publisher and only the ext name
        if (this._extension.publisher === 'vscode') {
            eventName = this._extension.name + '/' + eventName;
        }
        else {
            eventName = this._extension.identifier.value + '/' + eventName;
        }
        data = this.mixInCommonPropsAndCleanData(data || {});
        if (!this._inLoggingOnlyMode) {
            this._sender?.sendEventData(eventName, data);
        }
        this._logger.trace(eventName, data);
    }
    logUsage(eventName, data) {
        if (!this._telemetryEnablements.isUsageEnabled) {
            return;
        }
        this.logEvent(eventName, data);
    }
    logError(eventNameOrException, data) {
        if (!this._telemetryEnablements.isErrorsEnabled || !this._sender) {
            return;
        }
        if (typeof eventNameOrException === 'string') {
            this.logEvent(eventNameOrException, data);
        }
        else {
            const errorData = {
                name: eventNameOrException.name,
                message: eventNameOrException.message,
                stack: eventNameOrException.stack,
                cause: eventNameOrException.cause
            };
            const cleanedErrorData = cleanData(errorData, []);
            // Reconstruct the error object with the cleaned data
            const cleanedError = new Error(cleanedErrorData.message, {
                cause: cleanedErrorData.cause
            });
            cleanedError.stack = cleanedErrorData.stack;
            cleanedError.name = cleanedErrorData.name;
            data = this.mixInCommonPropsAndCleanData(data || {});
            if (!this._inLoggingOnlyMode) {
                this._sender.sendErrorData(cleanedError, data);
            }
            this._logger.trace('exception', data);
        }
    }
    get apiTelemetryLogger() {
        if (!this._apiObject) {
            const that = this;
            const obj = {
                logUsage: that.logUsage.bind(that),
                get isUsageEnabled() {
                    return that._telemetryEnablements.isUsageEnabled;
                },
                get isErrorsEnabled() {
                    return that._telemetryEnablements.isErrorsEnabled;
                },
                logError: that.logError.bind(that),
                dispose: that.dispose.bind(that),
                onDidChangeEnableStates: that._onDidChangeEnableStates.event.bind(that)
            };
            this._apiObject = Object.freeze(obj);
        }
        return this._apiObject;
    }
    get isDisposed() {
        return !this._sender;
    }
    dispose() {
        if (this._sender?.flush) {
            let tempSender = this._sender;
            this._sender = undefined;
            Promise.resolve(tempSender.flush()).then(tempSender = undefined);
            this._apiObject = undefined;
        }
        else {
            this._sender = undefined;
        }
    }
}
export function isNewAppInstall(firstSessionDate) {
    const installAge = Date.now() - new Date(firstSessionDate).getTime();
    return isNaN(installAge) ? false : installAge < 1000 * 60 * 60 * 24; // install age is less than a day
}
export const IExtHostTelemetry = createDecorator('IExtHostTelemetry');
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFRlbGVtZXRyeS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FkdmlrYXIvRG9jdW1lbnRzL2FyY2hpdGVjdC9hcmNoMi9BcmNoSURFL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvY29tbW9uL2V4dEhvc3RUZWxlbWV0cnkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQzFGLE9BQU8sRUFBUyxPQUFPLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUcvRCxPQUFPLEVBQVcsY0FBYyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDOUUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFFdEUsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLDJEQUEyRCxDQUFDO0FBQ25GLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUMvRSxPQUFPLEVBQUUsU0FBUyxFQUFFLG9CQUFvQixFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDMUgsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ3hELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUMvRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFFcEMsSUFBTSxnQkFBZ0IsR0FBdEIsTUFBTSxnQkFBaUIsU0FBUSxVQUFVO0lBaUIvQyxZQUNDLFFBQWlCLEVBQ1EsUUFBa0QsRUFDM0QsYUFBNkI7UUFFN0MsS0FBSyxFQUFFLENBQUM7UUFIa0MsYUFBUSxHQUFSLFFBQVEsQ0FBeUI7UUFmM0QsaUNBQTRCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBVyxDQUFDLENBQUM7UUFDOUUsZ0NBQTJCLEdBQW1CLElBQUks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
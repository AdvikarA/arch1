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
import { Disposable } from '../../../../base/common/lifecycle.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { firstSessionDateStorageKey, ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { IContextKeyService, RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { IWorkbenchEnvironmentService } from '../../environment/common/environmentService.js';
export const ICoreExperimentationService = createDecorator('coreExperimentationService');
export const startupExpContext = new RawContextKey('coreExperimentation.startupExpGroup', '');
export var StartupExperimentGroup;
(function (StartupExperimentGroup) {
    StartupExperimentGroup["Control"] = "control";
    StartupExperimentGroup["MaximizedChat"] = "maximizedChat";
    StartupExperimentGroup["SplitEmptyEditorChat"] = "splitEmptyEditorChat";
    StartupExperimentGroup["SplitWelcomeChat"] = "splitWelcomeChat";
})(StartupExperimentGroup || (StartupExperimentGroup = {}));
export const STARTUP_EXPERIMENT_NAME = 'startup';
const EXPERIMENT_CONFIGURATIONS = {
    stable: {
        experimentName: STARTUP_EXPERIMENT_NAME,
        targetPercentage: 20,
        groups: [
            // Bump the iteration each time we change group allocations
            { name: StartupExperimentGroup.Control, min: 0.0, max: 0.25, iteration: 1 },
            { name: StartupExperimentGroup.MaximizedChat, min: 0.25, max: 0.5, iteration: 1 },
            { name: StartupExperimentGroup.SplitEmptyEditorChat, min: 0.5, max: 0.75, iteration: 1 },
            { name: StartupExperimentGroup.SplitWelcomeChat, min: 0.75, max: 1.0, iteration: 1 }
        ]
    },
    insider: {
        experimentName: STARTUP_EXPERIMENT_NAME,
        targetPercentage: 50,
        groups: [
            // Bump the iteration each time we change group allocations
            { name: StartupExperimentGroup.Control, min: 0.0, max: 0.25, iteration: 1 },
            { name: StartupExperimentGroup.MaximizedChat, min: 0.25, max: 0.5, iteration: 1 },
            { name: StartupExperimentGroup.SplitEmptyEditorChat, min: 0.5, max: 0.75, iteration: 1 },
            { name: StartupExperimentGroup.SplitWelcomeChat, min: 0.75, max: 1.0, iteration: 1 }
        ]
    }
};
let CoreExperimentationService = class CoreExperimentationService extends Disposable {
    constructor(storageService, telemetryService, productService, contextKeyService, environmentService) {
        super();
        this.storageService = storageService;
        this.telemetryService = telemetryService;
        this.productService = productService;
        this.contextKeyService = contextKeyService;
        this.environmentService = environmentService;
        this.experiments = new Map();
        if (environmentService.disableExperiments ||
            environmentService.enableSmokeTestDriver ||
            environmentService.extensionTestsLocationURI) {
            return; //not applicable in this environment
        }
        this.initializeExperiments();
    }
    initializeExperiments() {
        const firstSessionDateString = this.storageService.get(firstSessionDateStorageKey, -1 /* StorageScope.APPLICATION */) || new Date().toUTCString();
        const daysSinceFirstSession = ((+new Date()) - (+new Date(firstSessionDateString))) / 1000 / 60 / 60 / 24;
        if (daysSinceFirstSession > 1) {
            // not a startup exp candidate.
            return;
        }
        const experimentConfig = this.getExperimentConfiguration();
        if (!experimentConfig) {
            return;
        }
        // also check storage to see if this user has already seen the startup experience
        const storageKey = `coreExperimentation.${experimentConfig.experimentName}`;
        const storedExperiment = this.storageService.get(storageKey, -1 /* StorageScope.APPLICATION */);
        if (storedExperiment) {
            try {
                const parsedExperiment = JSON.parse(storedExperiment);
                this.experiments.set(experimentConfig.experimentName, parsedExperiment);
                startupExpContext.bindTo(this.contextKeyService).set(parsedExperiment.experimentGroup);
                return;
            }
            catch (e) {
                this.storageService.remove(storageKey, -1 /* StorageScope.APPLICATION */);
                return;
            }
        }
        const experiment = this.createStartupExperiment(experimentConfig.experimentName, experimentConfig);
        if (experiment) {
            this.experiments.set(experimentConfig.experimentName, experiment);
            this.sendExperimentTelemetry(experimentConfig.experimentName, experiment);
            startupExpContext.bindTo(this.contextKeyService).set(experiment.experimentGroup);
            this.storageService.store(storageKey, JSON.stringify(experiment), -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        }
    }
    getExperimentConfiguration() {
        const quality = this.productService.quality;
        if (!quality) {
            return undefined;
        }
        return EXPERIMENT_CONFIGURATIONS[quality];
    }
    createStartupExperiment(experimentName, experimentConfig) {
        const startupExpGroupOverride = this.environmentService.startupExperimentGroup;
        if (startupExpGroupOverride) {
            // If the user has an override, we use that directly
            const group = experimentConfig.groups.find(g => g.name === startupExpGroupOverride);
            if (group) {
                return {
                    cohort: 1,
                    subCohort: 1,
                    experimentGroup: group.name,
                    iteration: group.iteration,
                    isInExperiment: true
                };
            }
            return undefined;
        }
        const cohort = Math.random();
        if (cohort >= experimentConfig.targetPercentage / 100) {
            return undefined;
        }
        // Normalize the cohort to the experiment range [0, targetPercentage/100]
        const normalizedCohort = cohort / (experimentConfig.targetPercentage / 100);
        // Find which group this user falls into
        for (const group of experimentConfig.groups) {
            if (normalizedCohort >= group.min && normalizedCohort < group.max) {
                return {
                    cohort,
                    subCohort: normalizedCohort,
                    experimentGroup: group.name,
                    iteration: group.iteration,
                    isInExperiment: true
                };
            }
        }
        return undefined;
    }
    sendExperimentTelemetry(experimentName, experiment) {
        this.telemetryService.publicLog2(`coreExperimentation.experimentCohort`, {
            experimentName,
            cohort: experiment.cohort,
            subCohort: experiment.subCohort,
            experimentGroup: experiment.experimentGroup,
            iteration: experiment.iteration,
            isInExperiment: experiment.isInExperiment
        });
    }
    getExperiment() {
        return this.experiments.get(STARTUP_EXPERIMENT_NAME);
    }
};
CoreExperimentationService = __decorate([
    __param(0, IStorageService),
    __param(1, ITelemetryService),
    __param(2, IProductService),
    __param(3, IContextKeyService),
    __param(4, IWorkbenchEnvironmentService)
], CoreExperimentationService);
export { CoreExperimentationService };
registerSingleton(ICoreExperimentationService, CoreExperimentationService, 0 /* InstantiationType.Eager */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29yZUV4cGVyaW1lbnRhdGlvblNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9hZHZpa2FyL0RvY3VtZW50cy9hcmNoaXRlY3QvYXJjaDIvQXJjaElERS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvY29yZUV4cGVyaW1lbnRhdGlvbi9jb21tb24vY29yZUV4cGVyaW1lbnRhdGlvblNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xFLE9BQU8sRUFBcUIsaUJBQWlCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUMvRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDeEYsT0FBTyxFQUFFLGVBQWUsRUFBK0IsTUFBTSxnREFBZ0QsQ0FBQztBQUM5RyxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUNuSCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDN0YsT0FBTyxFQUFFLGtCQUFrQixFQUFFLGFBQWEsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ3pHLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBRTlGLE1BQU0sQ0FBQyxNQUFNLDJCQUEyQixHQUFHLGVBQWUsQ0FBOEIsNEJBQTRCLENBQUMsQ0FBQztBQUN0SCxNQUFNLENBQUMsTUFBTSxpQkFBaUIsR0FBRyxJQUFJLGFBQWEsQ0FBUyxxQ0FBcUMsRUFBRSxFQUFFLENBQUMsQ0FBQztBQTRCdEcsTUFBTSxDQUFOLElBQVksc0JBS1g7QUFMRCxXQUFZLHNCQUFzQjtJQUNqQyw2Q0FBbUIsQ0FBQTtJQUNuQix5REFBK0IsQ0FBQTtJQUMvQix1RUFBNkMsQ0FBQTtJQUM3QywrREFBcUMsQ0FBQTtBQUN0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
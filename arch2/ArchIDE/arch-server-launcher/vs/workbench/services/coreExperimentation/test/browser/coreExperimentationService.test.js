/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { MockContextKeyService } from '../../../../../platform/keybinding/test/common/mockKeybindingService.js';
import { CoreExperimentationService, startupExpContext } from '../../common/coreExperimentationService.js';
import { firstSessionDateStorageKey } from '../../../../../platform/telemetry/common/telemetry.js';
import { TestStorageService } from '../../../../test/common/workbenchTestServices.js';
class MockTelemetryService {
    constructor() {
        this.events = [];
        this.telemetryLevel = 3 /* TelemetryLevel.USAGE */;
        this.sessionId = 'test-session';
        this.machineId = 'test-machine';
        this.sqmId = 'test-sqm';
        this.devDeviceId = 'test-device';
        this.firstSessionDate = 'test-date';
        this.sendErrorTelemetry = true;
    }
    publicLog2(eventName, data) {
        this.events.push({ eventName, data: data || {} });
    }
    publicLog(eventName, data) {
        this.events.push({ eventName, data: data || {} });
    }
    publicLogError(eventName, data) {
        this.events.push({ eventName, data: data || {} });
    }
    publicLogError2(eventName, data) {
        this.events.push({ eventName, data: data || {} });
    }
    setExperimentProperty() { }
}
class MockProductService {
    constructor() {
        this.quality = 'stable';
    }
    get version() { return '1.0.0'; }
    get commit() { return 'test-commit'; }
    get nameLong() { return 'Test VSCode'; }
    get nameShort() { return 'VSCode'; }
    get applicationName() { return 'test-vscode'; }
    get serverApplicationName() { return 'test-server'; }
    get dataFolderName() { return '.test-vscode'; }
    get urlProtocol() { return 'test-vscode'; }
    get extensionAllowedProposedApi() { return []; }
    get extensionProperties() { return {}; }
}
suite('CoreExperimentationService', () => {
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    let storageService;
    let telemetryService;
    let productService;
    let contextKeyService;
    let environmentService;
    setup(() => {
        storageService = disposables.add(new TestStorageService());
        telemetryService = new MockTelemetryService();
        productService = new MockProductService();
        contextKeyService = new MockContextKeyService();
        environmentService = {};
    });
    test('should return experiment from storage if it exists', () => {
        storageService.store(firstSessionDateStorageKey, new Date().toUTCString(), -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        // Set that user has already seen the experiment
        const existingExperiment = {
            cohort: 0.5,
            subCohort: 0.5,
            experimentGroup: 'control',
            iteration: 1,
            isInExperiment: true
        };
        storageService.store('coreExperimentation.startup', JSON.stringify(existingExperiment), -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        const service = disposables.add(new CoreExperimentationService(storageService, telemetryService, productService, contextKeyService, environmentService));
        // Should not return experiment again
        assert.deepStrictEqual(service.getExperiment(), existingExperiment);
        // No telemetry should be sent for new experiment
        assert.strictEqual(telemetryService.events.length, 0);
    });
    test('should initialize experiment for new user in first session and set context key', () => {
        // Set first session date to today
        storageService.store(firstSessionDateStorageKey, new Date().toUTCString(), -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        // Mock Math.random to return a value that puts user in experiment
        const originalMathRandom = Math.random;
        Math.random = () => 0.1; // 10% - should be in experiment for all quality levels
        try {
            const service = disposables.add(new CoreExperimentationService(storageService, telemetryService, productService, contextKeyService, environmentService));
            // Should create experiment
            const experiment = service.getExperiment();
            assert(experiment, 'Experiment should be defined');
            assert.strictEqual(experiment.isInExperiment, true);
            assert.strictEqual(experiment.iteration, 1);
            assert(experiment.cohort >= 0 && experiment.cohort < 1, 'Cohort should be between 0 and 1');
            assert(['control', 'maximizedChat', 'splitEmptyEditorChat', 'splitWelcomeChat'].includes(experiment.experimentGroup), 'Experiment group should be one of the defined treatments');
            // Context key should be set to experiment group
            const contextValue = startupExpContext.getValue(contextKeyService);
            assert.strictEqual(contextValue, experiment.experimentGroup, 'Context key should be set to experiment group');
        }
        finally {
            Math.random = originalMathRandom;
        }
    });
    test('should emit telemetry when experiment is created', () => {
        // Set first session date to today
        storageService.store(firstSessionDateStorageKey, new Date().toUTCString(), -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        // Mock Math.random to return a value that puts user in experiment
        const originalMathRandom = Math.random;
        Math.random = () => 0.1; // 10% - should be in experiment
        try {
            const service = disposables.add(new CoreExperimentationService(storageService, telemetryService, productService, contextKeyService, environmentService));
            const experiment = service.getExperiment();
            assert(experiment, 'Experiment should be defined');
            // Check that telemetry was sent
            assert.strictEqual(telemetryService.events.length, 1);
            const telemetryEvent = telemetryService.events[0];
            assert.strictEqual(telemetryEvent.eventName, 'coreExperimentation.experimentCohort');
            // Verify telemetry data
            const data = telemetryEvent.data;
            assert.strictEqual(data.experimentName, 'startup');
            assert.strictEqual(data.cohort, experiment.cohort);
            assert.strictEqual(data.subCohort, experiment.subCohort);
            assert.strictEqual(data.experimentGroup, experiment.experimentGroup);
            assert.strictEqual(data.iteration, experiment.iteration);
            assert.strictEqual(data.isInExperiment, experiment.isInExperiment);
        }
        finally {
            Math.random = originalMathRandom;
        }
    });
    test('should not include user in experiment if random value exceeds target percentage', () => {
        // Set first session date to today
        storageService.store(firstSessionDateStorageKey, new Date().toUTCString(), -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        productService.quality = 'stable'; // 20% target
        // Mock Math.random to return a value outside experiment range
        const originalMathRandom = Math.random;
        Math.random = () => 0.25; // 25% - should be outside 20% target for stable
        try {
            const service = disposables.add(new CoreExperimentationService(storageService, telemetryService, productService, contextKeyService, environmentService));
            // Should not create experiment
            const experiment = service.getExperiment();
            assert.strictEqual(experiment, undefined);
            // No telemetry should be sent
            assert.strictEqual(telemetryService.events.length, 0);
        }
        finally {
            Math.random = originalMathRandom;
        }
    });
    test('should assign correct experiment group based on cohort normalization', () => {
        // Set first session date to today
        storageService.store(firstSessionDateStorageKey, new Date().toUTCString(), -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        productService.quality = 'stable'; // 20% target
        const testCases = [
            { random: 0.02, expectedGroup: 'control' }, // 2% -> 10% normalized -> first 25% of experiment
            { random: 0.07, expectedGroup: 'maximizedChat' }, // 7% -> 35% normalized -> second 25% of experiment
            { random: 0.12, expectedGroup: 'splitEmptyEditorChat' }, // 12% -> 60% normalized -> third 25% of experiment
            { random: 0.17, expectedGroup: 'splitWelcomeChat' } // 17% -> 85% normalized -> fourth 25% of experiment
        ];
        const originalMathRandom = Math.random;
        try {
            for (const testCase of testCases) {
                Math.random = () => testCase.random;
                storageService.remove('coreExperimentation.startup', -1 /* StorageScope.APPLICATION */);
                telemetryService.events = []; // Reset telemetry events
                const service = disposables.add(new CoreExperimentationService(storageService, telemetryService, productService, contextKeyService, environmentService));
                const experiment = service.getExperiment();
                assert(experiment, `Experiment should be defined for random ${testCase.random}`);
                assert.strictEqual(experiment.experimentGroup, testCase.expectedGroup, `Expected group ${testCase.expectedGroup} for random ${testCase.random}, got ${experiment.experimentGroup}`);
            }
        }
        finally {
            Math.random = originalMathRandom;
        }
    });
    test('should store experiment in storage when created', () => {
        // Set first session date to today
        storageService.store(firstSessionDateStorageKey, new Date().toUTCString(), -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        const originalMathRandom = Math.random;
        Math.random = () => 0.1; // Ensure user is in experiment
        try {
            const service = disposables.add(new CoreExperimentationService(storageService, telemetryService, productService, contextKeyService, environmentService));
            const experiment = service.getExperiment();
            assert(experiment, 'Experiment should be defined');
            // Check that experiment was stored
            const storedValue = storageService.get('coreExperimentation.startup', -1 /* StorageScope.APPLICATION */);
            assert(storedValue, 'Experiment should be stored');
            const storedExperiment = JSON.parse(storedValue);
            assert.strictEqual(storedExperiment.experimentGroup, experiment.experimentGroup);
            assert.strictEqual(storedExperiment.iteration, experiment.iteration);
            assert.strictEqual(storedExperiment.isInExperiment, experiment.isInExperiment);
            assert.strictEqual(storedExperiment.cohort, experiment.cohort);
            assert.strictEqual(storedExperiment.subCohort, experiment.subCohort);
        }
        finally {
            Math.random = originalMathRandom;
        }
    });
    test('should handle missing first session date by using current date', () => {
        // Don't set first session date - service should use current date
        const originalMathRandom = Math.random;
        Math.random = () => 0.1; // Ensure user would be in experiment
        try {
            const service = disposables.add(new CoreExperimentationService(storageService, telemetryService, productService, contextKeyService, environmentService));
            const experiment = service.getExperiment();
            assert(experiment, 'Experiment should be defined when first session date is missing');
            assert.strictEqual(telemetryService.events.length, 1);
        }
        finally {
            Math.random = originalMathRandom;
        }
    });
    test('should handle sub-cohort calculation correctly', () => {
        // Set first session date to today
        storageService.store(firstSessionDateStorageKey, new Date().toUTCString(), -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        productService.quality = 'stable'; // 20% target
        const originalMathRandom = Math.random;
        Math.random = () => 0.1; // 10% cohort -> 50% normalized sub-cohort
        try {
            const service = disposables.add(new CoreExperimentationService(storageService, telemetryService, productService, contextKeyService, environmentService));
            const experiment = service.getExperiment();
            assert(experiment, 'Experiment should be defined');
            // Verify sub-cohort calculation
            const expectedSubCohort = 0.1 / (20 / 100); // 0.1 / 0.2 = 0.5
            assert.strictEqual(experiment.subCohort, expectedSubCohort, 'Sub-cohort should be correctly normalized');
        }
        finally {
            Math.random = originalMathRandom;
        }
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29yZUV4cGVyaW1lbnRhdGlvblNlcnZpY2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FkdmlrYXIvRG9jdW1lbnRzL2FyY2hpdGVjdC9hcmNoMi9BcmNoSURFL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9jb3JlRXhwZXJpbWVudGF0aW9uL3Rlc3QvYnJvd3Nlci9jb3JlRXhwZXJpbWVudGF0aW9uU2VydmljZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNuRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx5RUFBeUUsQ0FBQztBQUNoSCxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUMzRyxPQUFPLEVBQUUsMEJBQTBCLEVBQXFELE1BQU0sdURBQXVELENBQUM7QUFFdEosT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFTdEYsTUFBTSxvQkFBb0I7SUFBMUI7UUFHUSxXQUFNLEdBQXNCLEVBQUUsQ0FBQztRQUN0QixtQkFBYyxnQ0FBd0I7UUFDdEMsY0FBUyxHQUFHLGNBQWMsQ0FBQztRQUMzQixjQUFTLEdBQUcsY0FBYyxDQUFDO1FBQzNCLFVBQUssR0FBRyxVQUFVLENBQUM7UUFDbkIsZ0JBQVcsR0FBRyxhQUFhLENBQUM7UUFDNUIscUJBQWdCLEdBQUcsV0FBVyxDQUFDO1FBQy9CLHVCQUFrQixHQUFHLElBQUksQ0FBQztJQW1CM0MsQ0FBQztJQWpCQSxVQUFVLENBQU8sU0FBaUIsRUFBRSxJQUFRO1FBQzNDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRyxJQUF1QixJQUFJLEVBQUUsRUFBRSxD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
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { env } from '../../../base/common/process.js';
/**
 * @deprecated It is preferred that you use `IProductService` if you can. This
 * allows web embedders to override our defaults. But for things like `product.quality`,
 * the use is fine because that property is not overridable.
 */
let product;
// Native sandbox environment
const vscodeGlobal = globalThis.vscode;
if (typeof vscodeGlobal !== 'undefined' && typeof vscodeGlobal.context !== 'undefined') {
    const configuration = vscodeGlobal.context.configuration();
    if (configuration) {
        product = configuration.product;
    }
    else {
        throw new Error('Sandbox: unable to resolve product configuration from preload script.');
    }
}
// _VSCODE environment
else if (globalThis._VSCODE_PRODUCT_JSON && globalThis._VSCODE_PACKAGE_JSON) {
    // Obtain values from product.json and package.json-data
    product = globalThis._VSCODE_PRODUCT_JSON;
    // Running out of sources
    if (env['VSCODE_DEV']) {
        Object.assign(product, {
            nameShort: `${product.nameShort} Dev`,
            nameLong: `${product.nameLong} Dev`,
            dataFolderName: `${product.dataFolderName}-dev`,
            serverDataFolderName: product.serverDataFolderName ? `${product.serverDataFolderName}-dev` : undefined
        });
    }
    // Version is added during built time, but we still
    // want to have it running out of sources so we
    // read it from package.json only when we need it.
    if (!product.version) {
        const pkg = globalThis._VSCODE_PACKAGE_JSON;
        Object.assign(product, {
            version: pkg.version
        });
    }
}
// Web environment or unknown
else {
    // Built time configuration (do NOT modify)
    product = { /*BUILD->INSERT_PRODUCT_CONFIGURATION*/};
    // Running out of sources
    if (Object.keys(product).length === 0) {
        Object.assign(product, {
            version: '1.102.0-dev',
            nameShort: 'Code - OSS Dev',
            nameLong: 'Code - OSS Dev',
            applicationName: 'code-oss',
            dataFolderName: '.vscode-oss',
            urlProtocol: 'code-oss',
            reportIssueUrl: 'https://github.com/microsoft/vscode/issues/new',
            licenseName: 'MIT',
            licenseUrl: 'https://github.com/microsoft/vscode/blob/main/LICENSE.txt',
            serverLicenseUrl: 'https://github.com/microsoft/vscode/blob/main/LICENSE.txt'
        });
    }
}
export default product;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvZHVjdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FkdmlrYXIvRG9jdW1lbnRzL2FyY2hpdGVjdC9hcmNoMi9BcmNoSURFL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3Byb2R1Y3QvY29tbW9uL3Byb2R1Y3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBSXREOzs7O0dBSUc7QUFDSCxJQUFJLE9BQThCLENBQUM7QUFFbkMsNkJBQTZCO0FBQzdCLE1BQU0sWUFBWSxHQUFJLFVBQWtCLENBQUMsTUFBTSxDQUFDO0FBQ2hELElBQUksT0FBTyxZQUFZLEtBQUssV0FBVyxJQUFJLE9BQU8sWUFBWSxDQUFDLE9BQU8sS0FBSyxXQUFXLEVBQUUsQ0FBQztJQUN4RixNQUFNLGFBQWEsR0FBc0MsWUFBWSxDQUFDLE9BQU8sQ0FBQyxhQUFhLEVBQUUsQ0FBQztJQUM5RixJQUFJLGFBQWEsRUFBRSxDQUFDO1FBQ25CLE9BQU8sR0FBRyxhQUFhLENBQUMsT0FBTyxDQUFDO0lBQ2pDLENBQUM7U0FBTSxDQUFDO1FBQ1AsTUFBTSxJQUFJLEtBQUssQ0FBQyx1RUFBdUUsQ0FBQyxDQUFDO0lBQzFGLENBQUM7QUFDRixDQUFDO0FBQ0Qsc0JBQXNCO0tBQ2pCLElBQUksVUFBVSxDQUFDLG9CQUFvQixJQUFJLFVBQVUsQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO0lBQzdFLHdEQUF3RDtJQUN4RCxPQUFPLEdBQUcsVUFBVSxDQUFDLG9CQUF3RCxDQUFDO0lBRTlFLHlCQUF5QjtJQUN6QixJQUFJLEdBQUcsQ0FBQyxZQUFZLENBQUMsRUFBRSxDQUFDO1FBQ3ZCLE1BQU0sQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFO1lBQ3RCLFNBQVMsRUFBRSxHQUFHLE9BQU8sQ0FBQyxTQUFTLE1BQU07WUFDckMsUUFBUSxFQUFFLEdBQUcsT0FBTyxDQUFDLFFBQVEsTUFBTTtZQUNuQyxjQUFjLEVBQUUsR0FBRyxPQUFPLENBQUMsY0FBYyxNQUFNO1lBQy9DLG9CQUFvQixFQUFFLE9BQU8sQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUMsR0FBRyxPQUFPLENBQUMsb0JBQW9CLE1BQU0sQ0FBQyxDQUFDLENBQUMsU0FBUztTQUN0RyxDQUFDLENBQUM7SUFDSixDQUFDO0lBRUQsbURBQW1EO0lBQ25ELCtDQUErQztJQUMvQyxrREFBa0Q7SUFDbEQsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUN0QixNQUFNLEdBQUcsR0FBRyxVQUFVLENBQUMsb0JBQTJDLENBQUM7UUFFbkUsTUFBTSxDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUU7WUFDdEIsT0FBTyxFQUFFLEdBQUcsQ0FBQyxPQUFPO1NBQ3BCLENBQUMsQ0FBQztJQUNKLENBQUM7QUFDRixDQUFDO0FBRUQsNkJBQTZCO0tBQ3hCLENBQUM7SUFFTCwyQ0FBMkM7SUFDM0MsT0FBTyxHQUFHLEVBQUUsdUNBQXVDLENBQVMsQ0FBQztJQUU3RCx5QkFBeUI7SUFDekIsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztRQUN2QyxNQUFNLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRTtZQUN0QixPQUFPLEVBQUUsYUFBYTtZQUN0QixTQUFTLEVBQUUsZ0JBQWdCO1lBQzNCLFFBQVEsRUFBRSxnQkFBZ0I7WUFDMUIsZUFBZSxFQUFFLFVBQVU7WUFDM0IsY0FBYyxFQUFFLGFBQWE7WUFDN0IsV0FBVyxFQUFFLFVBQVU7WUFDdkIsY0FBYyxFQUFFLGdEQUFnRDtZQUNoRSxXQUFXLEVBQUUsS0FBSztZQUNsQixVQUFVLEVBQUUsMkRBQTJEO1lBQ3ZFLGdCQUFnQixFQUFFLDJEQUEyRDtTQUM3RSxDQUFDLENBQUM7SUFDSixDQUFDO0FBQ0YsQ0FBQztBQUVELGVBQWUsT0FBTyxDQUFDIn0=
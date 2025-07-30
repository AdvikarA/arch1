/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { autorun } from '../../../../base/common/observable.js';
/**
 * Starts a server (if needed) and waits for its tools to be live. Returns
 * true/false whether this happened successfully.
 */
export function startServerAndWaitForLiveTools(server, opts, token) {
    const store = new DisposableStore();
    return new Promise(resolve => {
        server.start(opts).catch(() => undefined).then(r => {
            if (token?.isCancellationRequested || !r || r.state === 3 /* McpConnectionState.Kind.Error */ || r.state === 0 /* McpConnectionState.Kind.Stopped */) {
                return resolve(false);
            }
            if (token) {
                store.add(token.onCancellationRequested(() => {
                    resolve(false);
                }));
            }
            store.add(autorun(reader => {
                const connState = server.connectionState.read(reader).state;
                if (connState === 3 /* McpConnectionState.Kind.Error */ || connState === 0 /* McpConnectionState.Kind.Stopped */) {
                    resolve(false); // some error, don't block the request
                }
                const toolState = server.cacheState.read(reader);
                if (toolState === 5 /* McpServerCacheState.Live */) {
                    resolve(true); // got tools, all done
                }
            }));
        });
    }).finally(() => store.dispose());
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwVHlwZXNVdGlscy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FkdmlrYXIvRG9jdW1lbnRzL2FyY2hpdGVjdC9hcmNoMi9BcmNoSURFL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL21jcC9jb21tb24vbWNwVHlwZXNVdGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDdkUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBR2hFOzs7R0FHRztBQUNILE1BQU0sVUFBVSw4QkFBOEIsQ0FBQyxNQUFrQixFQUFFLElBQTBCLEVBQUUsS0FBeUI7SUFDdkgsTUFBTSxLQUFLLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQztJQUNwQyxPQUFPLElBQUksT0FBTyxDQUFVLE9BQU8sQ0FBQyxFQUFFO1FBQ3JDLE1BQU0sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxDQUFDLFNBQVMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUNsRCxJQUFJLEtBQUssRUFBRSx1QkFBdUIsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSywwQ0FBa0MsSUFBSSxDQUFDLENBQUMsS0FBSyw0Q0FBb0MsRUFBRSxDQUFDO2dCQUN0SSxPQUFPLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUN2QixDQUFDO1lBRUQsSUFBSSxLQUFLLEVBQUUsQ0FBQztnQkFDWCxLQUFLLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyx1QkFBdUIsQ0FBQyxHQUFHLEVBQUU7b0JBQzVDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQztnQkFDaEIsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNMLENBQUM7WUFFRCxLQUFLLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsRUFBRTtnQkFDMUIsTUFBTSxTQUFTLEdBQUcsTUFBTSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsS0FBSyxDQUFDO2dCQUM1RCxJQUFJLFNBQVMsMENBQWtDLElBQUksU0FBUyw0Q0FBb0MsRUFBRSxDQUFDO29CQUNsRyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxzQ0FBc0M7Z0JBQ3ZELENBQUM7Z0JBRUQsTUFBTSxTQUFTLEdBQUcsTUFBTSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBQ2pELElBQUksU0FBUyxxQ0FBNkIsRUFBRSxDQUFDO29CQUM1QyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxzQkFBc0I7Z0JBQ3RDLENBQUM7WUFDRixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUM7QUFDbkMsQ0FBQyJ9
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
import { FrontMatterRecordName } from '../../tokens/index.js';
import { Colon, Word, Dash, SpacingToken } from '../../../simpleCodec/tokens/tokens.js';
import { assertNotConsumed, ParserBase } from '../../../simpleCodec/parserBase.js';
/**
 * Tokens that can be used inside a record name.
 */
const VALID_NAME_TOKENS = [Word, Dash];
/**
 * Parser for a `name` part of a Front Matter record.
 *
 * E.g., `'name'` in the example below:
 *
 * ```
 * name: 'value'
 * ```
 */
export class PartialFrontMatterRecordName extends ParserBase {
    constructor(factory, startToken) {
        super([startToken]);
        this.factory = factory;
    }
    accept(token) {
        for (const ValidToken of VALID_NAME_TOKENS) {
            if (token instanceof ValidToken) {
                this.currentTokens.push(token);
                return {
                    result: 'success',
                    nextParser: this,
                    wasTokenConsumed: true,
                };
            }
        }
        // once name is followed by a "space" token or a "colon", we have the full
        // record name hence can transition to the next parser
        if ((token instanceof Colon) || (token instanceof SpacingToken)) {
            const recordName = new FrontMatterRecordName(this.currentTokens);
            this.isConsumed = true;
            return {
                result: 'success',
                nextParser: this.factory.createRecordNameWithDelimiter([recordName, token]),
                wasTokenConsumed: true,
            };
        }
        // in all other cases fail due to the unexpected token type for a record name
        this.isConsumed = true;
        return {
            result: 'failure',
            wasTokenConsumed: false,
        };
    }
}
__decorate([
    assertNotConsumed
], PartialFrontMatterRecordName.prototype, "accept", null);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZnJvbnRNYXR0ZXJSZWNvcmROYW1lLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWR2aWthci9Eb2N1bWVudHMvYXJjaGl0ZWN0L2FyY2gyL0FyY2hJREUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vcHJvbXB0U3ludGF4L2NvZGVjcy9iYXNlL2Zyb250TWF0dGVyQ29kZWMvcGFyc2Vycy9mcm9udE1hdHRlclJlY29yZC9mcm9udE1hdHRlclJlY29yZE5hbWUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLHFCQUFxQixFQUF5QixNQUFNLHVCQUF1QixDQUFDO0FBQ3JGLE9BQU8sRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxZQUFZLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUV4RixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsVUFBVSxFQUEyQixNQUFNLG9DQUFvQyxDQUFDO0FBRzVHOztHQUVHO0FBQ0gsTUFBTSxpQkFBaUIsR0FBRyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztBQU92Qzs7Ozs7Ozs7R0FRRztBQUNILE1BQU0sT0FBTyw0QkFBNkIsU0FBUSxVQUF5QztJQUMxRixZQUNrQixPQUFpQyxFQUNsRCxVQUFnQjtRQUVoQixLQUFLLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDO1FBSEgsWUFBTyxHQUFQLE9BQU8sQ0FBMEI7SUFJbkQsQ0FBQztJQUdNLE1BQU0sQ0FBQyxLQUEwQjtRQUN2QyxLQUFLLE1BQU0sVUFBVSxJQUFJLGlCQUFpQixFQUFFLENBQUM7WUFDNUMsSUFBSSxLQUFLLFlBQVksVUFBVSxFQUFFLENBQUM7Z0JBQ2pDLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO2dCQUUvQixPQUFPO29CQUNOLE1BQU0sRUFBRSxTQUFTO29CQUNqQixVQUFVLEVBQUUsSUFBSTtvQkFDaEIsZ0JBQWdCLEVBQUUsSUFBSTtpQkFDdEIsQ0FBQztZQUNILENBQUM7UUFDRixDQUFDO1FBRUQsMEVBQTBFO1FBQzFFLHNEQUFzRDtRQUN0RCxJQUFJLENBQUMsS0FBSyxZQUFZLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxZQUFZLFlBQVksQ0FBQyxFQUFFLENBQUM7WUFDakUsTUFBTSxVQUFVLEdBQUcsSUFBSSxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUM7WUFFakUsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUM7WUFDdkIsT0FBTztnQkFDTixNQUFNLEVBQUUsU0FBUztnQkFDakIsVUFBVSxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsNkJBQTZCLENBQUMsQ0FBQyxVQUFVLEVBQUUsS0FBSyxDQUFDLENBQUM7Z0JBQzNFLGdCQUFnQixFQUFFLElBQUk7YUFDdEIsQ0FBQztRQUNILENBQUM7UUFFRCw2RUFBNkU7UUFDN0UsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUM7UUFDdkIsT0FBTztZQUNOLE1BQU0sRUFBRSxTQUFTO1lBQ2pCLGdCQUFnQixFQUFFLEtBQUs7U0FDdkIsQ0FBQztJQUNILENBQUM7Q0FDRDtBQWpDTztJQUROLGlCQUFpQjswREFpQ2pCIn0=
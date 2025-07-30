/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { sum } from '../../../../../base/common/arrays.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
/**
 * Tracks typing speed as average milliseconds between keystrokes.
 * Higher values indicate slower typing.
 */
export class TypingInterval extends Disposable {
    // Configuration constants
    static { this.MAX_SESSION_GAP_MS = 3_000; } // 3 seconds max gap between keystrokes in a session
    static { this.MIN_SESSION_DURATION_MS = 1_000; } // Minimum session duration to consider
    static { this.SESSION_HISTORY_LIMIT = 50; } // Keep last 50 sessions for calculation
    static { this.TYPING_SPEED_WINDOW_MS = 300_000; } // 5 minutes window for speed calculation
    static { this.MIN_CHARS_FOR_RELIABLE_SPEED = 20; } // Minimum characters needed for reliable speed calculation
    /**
     * Gets the current typing interval as average milliseconds between keystrokes
     * and the number of characters involved in the computation.
     * Higher interval values indicate slower typing.
     * Returns { interval: 0, characterCount: 0 } if no typing data is available.
     */
    getTypingInterval() {
        if (this._cacheInvalidated || this._cachedTypingIntervalResult === null) {
            this._cachedTypingIntervalResult = this._calculateTypingInterval();
            this._cacheInvalidated = false;
        }
        return this._cachedTypingIntervalResult;
    }
    constructor(_textModel) {
        super();
        this._textModel = _textModel;
        this._typingSessions = [];
        this._currentSession = null;
        this._lastChangeTime = 0;
        this._cachedTypingIntervalResult = null;
        this._cacheInvalidated = true;
        this._register(this._textModel.onDidChangeContent(e => this._updateTypingSpeed(e)));
    }
    _updateTypingSpeed(change) {
        const now = Date.now();
        const characterCount = this._calculateEffectiveCharacterCount(change);
        // If too much time has passed since last change, start a new session
        if (this._currentSession && (now - this._lastChangeTime) > TypingInterval.MAX_SESSION_GAP_MS) {
            this._finalizeCurrentSession();
        }
        // Start new session if none exists
        if (!this._currentSession) {
            this._currentSession = {
                startTime: now,
                endTime: now,
                characterCount: 0
            };
        }
        // Update current session
        this._currentSession.endTime = now;
        this._currentSession.characterCount += characterCount;
        this._lastChangeTime = now;
        this._cacheInvalidated = true;
    }
    _calculateEffectiveCharacterCount(change) {
        const actualCharCount = this._getActualCharacterCount(change);
        // If this is actual user typing, count all characters
        if (this._isUserTyping(change)) {
            return actualCharCount;
        }
        // For all other actions (paste, suggestions, etc.), count as 1 regardless of size
        return actualCharCount > 0 ? 1 : 0;
    }
    _getActualCharacterCount(change) {
        let totalChars = 0;
        for (const c of change.changes) {
            // Count characters added or removed (use the larger of the two)
            totalChars += Math.max(c.text.length, c.rangeLength);
        }
        return totalChars;
    }
    _isUserTyping(change) {
        // If no detailed reasons, assume user typing
        if (!change.detailedReasons || change.detailedReasons.length === 0) {
            return true;
        }
        // Check if any of the reasons indicate actual user typing
        for (const reason of change.detailedReasons) {
            if (this._isUserTypingReason(reason)) {
                return true;
            }
        }
        return false;
    }
    _isUserTypingReason(reason) {
        // Handle undo/redo - not considered user typing
        if (reason.metadata.isUndoing || reason.metadata.isRedoing) {
            return false;
        }
        // Handle different source types
        switch (reason.metadata.source) {
            case 'cursor': {
                // Direct user input via cursor
                const kind = reason.metadata.kind;
                return kind === 'type' || kind === 'compositionType' || kind === 'compositionEnd';
            }
            default:
                // All other sources (paste, suggestions, code actions, etc.) are not user typing
                return false;
        }
    }
    _finalizeCurrentSession() {
        if (!this._currentSession) {
            return;
        }
        const sessionDuration = this._currentSession.endTime - this._currentSession.startTime;
        // Only keep sessions that meet minimum duration and have actual content
        if (sessionDuration >= TypingInterval.MIN_SESSION_DURATION_MS && this._currentSession.characterCount > 0) {
            this._typingSessions.push(this._currentSession);
            // Limit session history
            if (this._typingSessions.length > TypingInterval.SESSION_HISTORY_LIMIT) {
                this._typingSessions.shift();
            }
        }
        this._currentSession = null;
    }
    _calculateTypingInterval() {
        // Finalize current session for calculation
        if (this._currentSession) {
            const tempSession = { ...this._currentSession };
            const sessionDuration = tempSession.endTime - tempSession.startTime;
            if (sessionDuration >= TypingInterval.MIN_SESSION_DURATION_MS && tempSession.characterCount > 0) {
                const allSessions = [...this._typingSessions, tempSession];
                return this._calculateSpeedFromSessions(allSessions);
            }
        }
        return this._calculateSpeedFromSessions(this._typingSessions);
    }
    _calculateSpeedFromSessions(sessions) {
        if (sessions.length === 0) {
            return { averageInterval: 0, characterCount: 0 };
        }
        // Sort sessions by recency (most recent first) to ensure we get the most recent sessions
        const sortedSessions = [...sessions].sort((a, b) => b.endTime - a.endTime);
        // First, try the standard window
        const cutoffTime = Date.now() - TypingInterval.TYPING_SPEED_WINDOW_MS;
        const recentSessions = sortedSessions.filter(session => session.endTime > cutoffTime);
        const olderSessions = sortedSessions.splice(recentSessions.length);
        let totalChars = sum(recentSessions.map(session => session.characterCount));
        // If we don't have enough characters in the standard window, expand to include older sessions
        for (let i = 0; i < olderSessions.length && totalChars < TypingInterval.MIN_CHARS_FOR_RELIABLE_SPEED; i++) {
            recentSessions.push(olderSessions[i]);
            totalChars += olderSessions[i].characterCount;
        }
        const totalTime = sum(recentSessions.map(session => session.endTime - session.startTime));
        if (totalTime === 0 || totalChars <= 1) {
            return { averageInterval: 0, characterCount: totalChars };
        }
        // Calculate average milliseconds between keystrokes
        const keystrokeIntervals = Math.max(1, totalChars - 1);
        const avgMsBetweenKeystrokes = totalTime / keystrokeIntervals;
        return {
            averageInterval: Math.round(avgMsBetweenKeystrokes),
            characterCount: totalChars
        };
    }
    /**
     * Reset all typing speed data
     */
    reset() {
        this._typingSessions.length = 0;
        this._currentSession = null;
        this._lastChangeTime = 0;
        this._cachedTypingIntervalResult = null;
        this._cacheInvalidated = true;
    }
    dispose() {
        this._finalizeCurrentSession();
        super.dispose();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHlwaW5nU3BlZWQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9hZHZpa2FyL0RvY3VtZW50cy9hcmNoaXRlY3QvYXJjaDIvQXJjaElERS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9pbmxpbmVDb21wbGV0aW9ucy9icm93c2VyL21vZGVsL3R5cGluZ1NwZWVkLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUMzRCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFlckU7OztHQUdHO0FBQ0gsTUFBTSxPQUFPLGNBQWUsU0FBUSxVQUFVO0lBUTdDLDBCQUEwQjthQUNGLHVCQUFrQixHQUFHLEtBQUssQUFBUixDQUFTLEdBQUMsb0RBQW9EO2FBQ2hGLDRCQUF1QixHQUFHLEtBQUssQUFBUixDQUFTLEdBQUMsdUNBQXVDO2FBQ3hFLDBCQUFxQixHQUFHLEVBQUUsQUFBTCxDQUFNLEdBQUMsd0NBQXdDO2FBQ3BFLDJCQUFzQixHQUFHLE9BQU8sQUFBVixDQUFXLEdBQUMseUNBQXlDO2FBQzNFLGlDQUE0QixHQUFHLEVBQUUsQUFBTCxDQUFNLEdBQUMsMkRBQTJEO0lBRXRIOzs7OztPQUtHO0lBQ0ksaUJBQWlCO1FBQ3ZCLElBQUksSUFBSSxDQUFDLGlCQUFpQixJQUFJLElBQUksQ0FBQywyQkFBMkIsS0FBSyxJQUFJLEVBQUUsQ0FBQztZQUN6RSxJQUFJLENBQUMsMkJBQTJCLEdBQUcsSUFBSSxDQUFDLHdCQUF3QixFQUFFLENBQUM7WUFDbkUsSUFBSSxDQUFDLGlCQUFpQixHQUFHLEtBQUssQ0FBQztRQUNoQyxDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUMsMkJBQTJCLENBQUM7SUFDekMsQ0FBQztJQUVELFlBQTZCLFVBQXNCO1FBQ2xELEtBQUssRUFBRSxDQUFDO1FBRG9CLGVBQVUsR0FBVixVQUFVLENBQVk7UUEzQmxDLG9CQUFlLEdBQW9CLEVBQUUsQ0FBQztRQUMvQyxvQkFBZSxHQUF5QixJQUFJLENBQUM7UUFDN0Msb0JBQWUsR0FBRyxDQUFDLENBQUM7UUFDcEIsZ0NBQTJCLEdBQWdDLElBQUksQ0FBQztRQUNoRSxzQkFBaUIsR0FBRyxJQUFJLENBQUM7UUEwQmhDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDckYsQ0FBQztJQUVPLGtCQUFrQixDQUFDLE1BQWlDO1FBQzNELE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQUN2QixNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsaUNBQWlDLENBQUMsTUFBTSxDQUFDLENBQUM7UUFFdEUscUVBQXFFO1FBQ3JFLElBQUksSUFBSSxDQUFDLGVBQWUsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLEdBQUcsY0FBYyxDQUFDLGtCQUFrQixFQUFFLENBQUM7WUFDOUYsSUFBSSxDQUFDLHVCQUF1QixFQUFFLENBQUM7UUFDaEMsQ0FBQztRQUVELG1DQUFtQztRQUNuQyxJQUFJLENBQUMsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO1lBQzNCLElBQUksQ0FBQyxlQUFlLEdBQUc7Z0JBQ3RCLFNBQVMsRUFBRSxHQUFHO2dCQUNkLE9BQU8sRUFBRSxHQUFHO2dCQUNaLGNBQWMsRUFBRSxDQUFDO2FBQ2pCLENBQUM7UUFDSCxDQUFDO1FBRUQseUJBQXlCO1FBQ3pCLElBQUksQ0FBQyxlQUFlLENBQUMsT0FBTyxHQUFHLEdBQUcsQ0FBQztRQUNuQyxJQUFJLENBQUMsZUFBZSxDQUFDLGNBQWMsSUFBSSxjQUFjLENBQUM7UUFFdEQsSUFBSSxDQUFDLGVBQWUsR0FBRyxHQUFHLENBQUM7UUFDM0IsSUFBSSxDQUFDLGlCQUFpQixHQUFHLElBQUksQ0FBQztJQUMvQixDQUFDO0lBRU8saUNBQWlDLENBQUMsTUFBaUM7UUFDMUUsTUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDLHdCQUF3QixDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBRTlELHNEQUFzRDtRQUN0RCxJQUFJLElBQUksQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQztZQUNoQyxPQUFPLGVBQWUsQ0FBQztRQUN4QixDQUFDO1FBRUQsa0ZBQWtGO1FBQ2xGLE9BQU8sZUFBZSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDcEMsQ0FBQztJQUVPLHdCQUF3QixDQUFDLE1BQWlDO1FBQ2pFLElBQUksVUFBVSxHQUFHLENBQUMsQ0FBQztRQUNuQixLQUFLLE1BQU0sQ0FBQyxJQUFJLE1BQU0sQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNoQyxnRUFBZ0U7WUFDaEUsVUFBVSxJQUFJLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQ3RELENBQUM7UUFDRCxPQUFPLFVBQVUsQ0FBQztJQUNuQixDQUFDO0lBRU8sYUFBYSxDQUFDLE1BQWlDO1FBQ3RELDZDQUE2QztRQUM3QyxJQUFJLENBQUMsTUFBTSxDQUFDLGVBQWUsSUFBSSxNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUNwRSxPQUFPLElBQUksQ0FBQztRQUNiLENBQUM7UUFFRCwwREFBMEQ7UUFDMUQsS0FBSyxNQUFNLE1BQU0sSUFBSSxNQUFNLENBQUMsZUFBZSxFQUFFLENBQUM7WUFDN0MsSUFBSSxJQUFJLENBQUMsbUJBQW1CLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQztnQkFDdEMsT0FBTyxJQUFJLENBQUM7WUFDYixDQUFDO1FBQ0YsQ0FBQztRQUVELE9BQU8sS0FBSyxDQUFDO0lBQ2QsQ0FBQztJQUVPLG1CQUFtQixDQUFDLE1BQVc7UUFDdEMsZ0RBQWdEO1FBQ2hELElBQUksTUFBTSxDQUFDLFFBQVEsQ0FBQyxTQUFTLElBQUksTUFBTSxDQUFDLFFBQVEsQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUM1RCxPQUFPLEtBQUssQ0FBQztRQUNkLENBQUM7UUFFRCxnQ0FBZ0M7UUFDaEMsUUFBUSxNQUFNLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2hDLEtBQUssUUFBUSxDQUFDLENBQUMsQ0FBQztnQkFDZiwrQkFBK0I7Z0JBQy9CLE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDO2dCQUNsQyxPQUFPLElBQUksS0FBSyxNQUFNLElBQUksSUFBSSxLQUFLLGlCQUFpQixJQUFJLElBQUksS0FBSyxnQkFBZ0IsQ0FBQztZQUNuRixDQUFDO1lBRUQ7Z0JBQ0MsaUZBQWlGO2dCQUNqRixPQUFPLEtBQUssQ0FBQztRQUNmLENBQUM7SUFDRixDQUFDO0lBRU8sdUJBQXVCO1FBQzlCLElBQUksQ0FBQyxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7WUFDM0IsT0FBTztRQUNSLENBQUM7UUFFRCxNQUFNLGVBQWUsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLFNBQVMsQ0FBQztRQUV0Rix3RUFBd0U7UUFDeEUsSUFBSSxlQUFlLElBQUksY0FBYyxDQUFDLHVCQUF1QixJQUFJLElBQUksQ0FBQyxlQUFlLENBQUMsY0FBYyxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQzFHLElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQztZQUVoRCx3QkFBd0I7WUFDeEIsSUFBSSxJQUFJLENBQUMsZUFBZSxDQUFDLE1BQU0sR0FBRyxjQUFjLENBQUMscUJBQXFCLEVBQUUsQ0FBQztnQkFDeEUsSUFBSSxDQUFDLGVBQWUsQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUM5QixDQUFDO1FBQ0YsQ0FBQztRQUVELElBQUksQ0FBQyxlQUFlLEdBQUcsSUFBSSxDQUFDO0lBQzdCLENBQUM7SUFFTyx3QkFBd0I7UUFDL0IsMkNBQTJDO1FBQzNDLElBQUksSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO1lBQzFCLE1BQU0sV0FBVyxHQUFHLEVBQUUsR0FBRyxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7WUFDaEQsTUFBTSxlQUFlLEdBQUcsV0FBVyxDQUFDLE9BQU8sR0FBRyxXQUFXLENBQUMsU0FBUyxDQUFDO1lBQ3BFLElBQUksZUFBZSxJQUFJLGNBQWMsQ0FBQyx1QkFBdUIsSUFBSSxXQUFXLENBQUMsY0FBYyxHQUFHLENBQUMsRUFBRSxDQUFDO2dCQUNqRyxNQUFNLFdBQVcsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLGVBQWUsRUFBRSxXQUFXLENBQUMsQ0FBQztnQkFDM0QsT0FBTyxJQUFJLENBQUMsMkJBQTJCLENBQUMsV0FBVyxDQUFDLENBQUM7WUFDdEQsQ0FBQztRQUNGLENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUM7SUFDL0QsQ0FBQztJQUVPLDJCQUEyQixDQUFDLFFBQXlCO1FBQzVELElBQUksUUFBUSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUMzQixPQUFPLEVBQUUsZUFBZSxFQUFFLENBQUMsRUFBRSxjQUFjLEVBQUUsQ0FBQyxFQUFFLENBQUM7UUFDbEQsQ0FBQztRQUVELHlGQUF5RjtRQUN6RixNQUFNLGNBQWMsR0FBRyxDQUFDLEdBQUcsUUFBUSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUM7UUFFM0UsaUNBQWlDO1FBQ2pDLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsR0FBRyxjQUFjLENBQUMsc0JBQXNCLENBQUM7UUFDdEUsTUFBTSxjQUFjLEdBQUcsY0FBYyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEdBQUcsVUFBVSxDQUFDLENBQUM7UUFDdEYsTUFBTSxhQUFhLEdBQUcsY0FBYyxDQUFDLE1BQU0sQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLENBQUM7UUFFbkUsSUFBSSxVQUFVLEdBQUcsR0FBRyxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQztRQUU1RSw4RkFBOEY7UUFDOUYsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLGFBQWEsQ0FBQyxNQUFNLElBQUksVUFBVSxHQUFHLGNBQWMsQ0FBQyw0QkFBNEIsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQzNHLGNBQWMsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDdEMsVUFBVSxJQUFJLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUM7UUFDL0MsQ0FBQztRQUVELE1BQU0sU0FBUyxHQUFHLEdBQUcsQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztRQUMxRixJQUFJLFNBQVMsS0FBSyxDQUFDLElBQUksVUFBVSxJQUFJLENBQUMsRUFBRSxDQUFDO1lBQ3hDLE9BQU8sRUFBRSxlQUFlLEVBQUUsQ0FBQyxFQUFFLGNBQWMsRUFBRSxVQUFVLEVBQUUsQ0FBQztRQUMzRCxDQUFDO1FBRUQsb0RBQW9EO1FBQ3BELE1BQU0sa0JBQWtCLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsVUFBVSxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQ3ZELE1BQU0sc0JBQXNCLEdBQUcsU0FBUyxHQUFHLGtCQUFrQixDQUFDO1FBRTlELE9BQU87WUFDTixlQUFlLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxzQkFBc0IsQ0FBQztZQUNuRCxjQUFjLEVBQUUsVUFBVTtTQUMxQixDQUFDO0lBQ0gsQ0FBQztJQUVEOztPQUVHO0lBQ0ksS0FBSztRQUNYLElBQUksQ0FBQyxlQUFlLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQztRQUNoQyxJQUFJLENBQUMsZUFBZSxHQUFHLElBQUksQ0FBQztRQUM1QixJQUFJLENBQUMsZUFBZSxHQUFHLENBQUMsQ0FBQztRQUN6QixJQUFJLENBQUMsMkJBQTJCLEdBQUcsSUFBSSxDQUFDO1FBQ3hDLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxJQUFJLENBQUM7SUFDL0IsQ0FBQztJQUVlLE9BQU87UUFDdEIsSUFBSSxDQUFDLHVCQUF1QixFQUFFLENBQUM7UUFDL0IsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQ2pCLENBQUMifQ==
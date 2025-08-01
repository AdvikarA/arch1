export function gotoNextSibling(newCursor, oldCursor) {
    const n = newCursor.gotoNextSibling();
    const o = oldCursor.gotoNextSibling();
    if (n !== o) {
        throw new Error('Trees are out of sync');
    }
    return n && o;
}
export function gotoParent(newCursor, oldCursor) {
    const n = newCursor.gotoParent();
    const o = oldCursor.gotoParent();
    if (n !== o) {
        throw new Error('Trees are out of sync');
    }
    return n && o;
}
export function gotoNthChild(newCursor, oldCursor, index) {
    const n = newCursor.gotoFirstChild();
    const o = oldCursor.gotoFirstChild();
    if (n !== o) {
        throw new Error('Trees are out of sync');
    }
    if (index === 0) {
        return n && o;
    }
    for (let i = 1; i <= index; i++) {
        const nn = newCursor.gotoNextSibling();
        const oo = oldCursor.gotoNextSibling();
        if (nn !== oo) {
            throw new Error('Trees are out of sync');
        }
        if (!nn || !oo) {
            return false;
        }
    }
    return n && o;
}
export function nextSiblingOrParentSibling(newCursor, oldCursor) {
    do {
        if (newCursor.currentNode.nextSibling) {
            return gotoNextSibling(newCursor, oldCursor);
        }
        if (newCursor.currentNode.parent) {
            gotoParent(newCursor, oldCursor);
        }
    } while (newCursor.currentNode.nextSibling || newCursor.currentNode.parent);
    return false;
}
export function getClosestPreviousNodes(cursor, tree) {
    // Go up parents until the end of the parent is before the start of the current.
    const findPrev = tree.walk();
    findPrev.resetTo(cursor);
    const startingNode = cursor.currentNode;
    do {
        if (findPrev.currentNode.previousSibling && ((findPrev.currentNode.endIndex - findPrev.currentNode.startIndex) !== 0)) {
            findPrev.gotoPreviousSibling();
        }
        else {
            while (!findPrev.currentNode.previousSibling && findPrev.currentNode.parent) {
                findPrev.gotoParent();
            }
            findPrev.gotoPreviousSibling();
        }
    } while ((findPrev.currentNode.endIndex > startingNode.startIndex)
        && (findPrev.currentNode.parent || findPrev.currentNode.previousSibling)
        && (findPrev.currentNode.id !== startingNode.id));
    if ((findPrev.currentNode.id !== startingNode.id) && findPrev.currentNode.endIndex <= startingNode.startIndex) {
        return findPrev.currentNode;
    }
    else {
        return undefined;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3Vyc29yVXRpbHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9hZHZpa2FyL0RvY3VtZW50cy9hcmNoaXRlY3QvYXJjaDIvQXJjaElERS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL21vZGVsL3Rva2Vucy90cmVlU2l0dGVyL2N1cnNvclV0aWxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQU1BLE1BQU0sVUFBVSxlQUFlLENBQUMsU0FBZ0MsRUFBRSxTQUFnQztJQUNqRyxNQUFNLENBQUMsR0FBRyxTQUFTLENBQUMsZUFBZSxFQUFFLENBQUM7SUFDdEMsTUFBTSxDQUFDLEdBQUcsU0FBUyxDQUFDLGVBQWUsRUFBRSxDQUFDO0lBQ3RDLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO1FBQ2IsTUFBTSxJQUFJLEtBQUssQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO0lBQzFDLENBQUM7SUFDRCxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDZixDQUFDO0FBRUQsTUFBTSxVQUFVLFVBQVUsQ0FBQyxTQUFnQyxFQUFFLFNBQWdDO0lBQzVGLE1BQU0sQ0FBQyxHQUFHLFNBQVMsQ0FBQyxVQUFVLEVBQUUsQ0FBQztJQUNqQyxNQUFNLENBQUMsR0FBRyxTQUFTLENBQUMsVUFBVSxFQUFFLENBQUM7SUFDakMsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7UUFDYixNQUFNLElBQUksS0FBSyxDQUFDLHVCQUF1QixDQUFDLENBQUM7SUFDMUMsQ0FBQztJQUNELE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUNmLENBQUM7QUFFRCxNQUFNLFVBQVUsWUFBWSxDQUFDLFNBQWdDLEVBQUUsU0FBZ0MsRUFBRSxLQUFhO0lBQzdHLE1BQU0sQ0FBQyxHQUFHLFNBQVMsQ0FBQyxjQUFjLEVBQUUsQ0FBQztJQUNyQyxNQUFNLENBQUMsR0FBRyxTQUFTLENBQUMsY0FBYyxFQUFFLENBQUM7SUFDckMsSUFBSSxDQUFDLEtBQUssQ0FB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
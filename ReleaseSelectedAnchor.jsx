﻿/* 
 * Title:           Release a selected anchored item.
 * Author:          Ramzi Komati
 * Description:     The script has been modified to release the selected anchored item without disrupting
 *                  inlined page items withing the TextFrame.
 *
 * Version:         3.0
 * Last Modified:   April 7th, 2014
 */

(function(obj) 
{
    // The unicode of an anchored object marker is U-65532, which it is represented
    // by a Yen symbol ¥ in InDesign.
    const ANCHOR_MARKER = 65532;
    
    if(app.documents.length > 0 && app.selection.length == 1 && app.selection[0].parent instanceof Character) 
    { 
        if(parseFloat(app.version) < 6) 
        {
            releaseSelectedAnchor(app.selection[0]);
        }
        else
        {
            app.doScript(releaseSelectedAnchor, undefined, app.selection[0], UndoModes.entireScript, "Release Selected Anchor");
        }
    } 
    else 
    {
        alert("Please select an anchored item.");
    }

    // releaseSelectedAnchor(app.selection[0]);

    function releaseSelectedAnchor(selectedItem)
    {
        // Make sure the selected item is unlocked
        if(selectedItem.locked)
        {
            selectedItem.locked = false;
        }

        // Get the position and dimension of the anchored object
        var anchorGeometricBounds = {
            x : selectedItem.visibleBounds[1],
            y : selectedItem.visibleBounds[0],
            w : selectedItem.visibleBounds[3] - selectedItem.visibleBounds[1],
            h : selectedItem.visibleBounds[2] - selectedItem.visibleBounds[0],
            horizontalOffset : selectedItem.visibleBounds[1] - selectedItem.parent.parentTextFrames[0].geometricBounds[1]
        };
        
        // Re-arrange the content of the text frame for inlined and above-lined anchored object
        if(selectedItem.anchoredObjectSettings.anchoredPosition != AnchorPosition.ANCHORED)
        {
            // Get the textframe
            var parentTextFrame = selectedItem.parent.parentTextFrames[0];
            
            // Change the vertical justification of the textframe to top align
            if(parentTextFrame.textFramePreferences.verticalJustification == VerticalJustification.JUSTIFY_ALIGN)
            {
                parentTextFrame.textFramePreferences.verticalJustification = VerticalJustification.TOP_ALIGN;
            }

            // Traverse the textframe's content until the anchored object marker is reached
            for(var i = 0; i < parentTextFrame.characters.length; i++)
            {
                var character = parentTextFrame.characters[i];
                
                
                if(character.contents.toString().charCodeAt(0) == ANCHOR_MARKER)
                {
                    // The anchored object reference ID is the anchored object ID where the anchored 
                    // marker character is targeting.
                    var anchoredObjectReferenceID = null;
                    
                    if(character.textFrames.length != 0)        anchoredObjectReferenceID = character.textFrames[0].id;
                    else if(character.polygons.length != 0)     anchoredObjectReferenceID = character.polygons[0].id;
                    else if(character.rectangles.length != 0)   anchoredObjectReferenceID = character.rectangles[0].id;
                    else if(character.graphicLines.length != 0) anchoredObjectReferenceID = character.graphicLines[0].id;
                    else if(character.groups.length != 0)       anchoredObjectReferenceID = character.groups[0].id;
                    
                    // Check if the selected anchored object belong to the traversed achored character marker
                    if(selectedItem.id == anchoredObjectReferenceID)
                    {
                        if(selectedItem.anchoredObjectSettings.anchoredPosition == AnchorPosition.INLINE_POSITION)
                        {
                            var currentLine = character.lines[0];
                            var previousLine = null, nextLine = null;
                            
                            for(l = 0; l < parentTextFrame.lines.length; l++)
                            {
                                if(parentTextFrame.lines[l] == currentLine)
                                {
                                    if(l != 0)
                                    {
                                        previousLine = parentTextFrame.lines[l - 1];
                                    }
                                    if(l != parentTextFrame.lines.length - 1)
                                    {
                                        nextLine = parentTextFrame.lines[l + 1];
                                    }
                                }
                            }
                            
                            if((currentLine.contents.length == 1 && currentLine.contents[0].toString() == '\r') ||
                               (currentLine.contents.length == 1 && currentLine.contents[0].toString().charCodeAt(0) == ANCHOR_MARKER) ||
                               (currentLine.contents.length == 2 && currentLine.contents.toString().charCodeAt(0) == ANCHOR_MARKER && currentLine.contents[1].toString() == '\r'))
                            {
                                // Calculate vertical offset
                                var verticalOffset = anchorGeometricBounds.h + selectedItem.anchoredObjectSettings.anchorYoffset - currentLine.ascent;
                                if(nextLine != null)
                                {
                                    nextLine.spaceBefore = verticalOffset;
                                }
                                else
                                {
                                    currentLine.spaceBefore = verticalOffset;
                                }
                            
                                // Release anchor of the selected object
                                selectedItem.anchoredObjectSettings.anchoredPosition = AnchorPosition.anchored;
                                selectedItem.anchoredObjectSettings.releaseAnchoredObject();

                                // Reposition the object to its original state
                                selectedItem.move([anchorGeometricBounds.x, anchorGeometricBounds.y]);
                            }
                            else
                            {
                                // Calculate vertical offset
                                var verticalOffset = anchorGeometricBounds.h + selectedItem.anchoredObjectSettings.anchorYoffset - currentLine.pointSize;
                                if(verticalOffset > 0)
                                {
                                    currentLine.spaceBefore = verticalOffset;
                                }
                                else {
                                    alert('y');
                                }
                        
                                // Release anchor of the selected object
                                selectedItem.anchoredObjectSettings.anchoredPosition = AnchorPosition.anchored;
                                selectedItem.anchoredObjectSettings.releaseAnchoredObject();
                                
                                var tabStop = character.tabStops.add();
                                tabStop.position = anchorGeometricBounds.horizontalOffset + anchorGeometricBounds.w + 'px';
                                
                                character.contents = '\t' + character.contents;

                                // Reposition the object to its original state
                                selectedItem.move([anchorGeometricBounds.x, anchorGeometricBounds.y]);
                            }
                            // Send the previously anchored object back to its textframe
                            selectedItem.sendToBack(parentTextFrame);
                        }
                    }
                }
            }
        }
    }
}());
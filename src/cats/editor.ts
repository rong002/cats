// Copyright (c) JBaron.  All rights reserved.
// 
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//   http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

module Cats {

    /**
     * BaseClass for Editors. Editors should extend this class. The rest of the codebase is only 
     * dependent on this small subset of methods and properties.
     */
    export class Editor extends qx.event.Emitter {
        
        private static Registry = {}; 
        
        label = "Untitled"; // Label to be used on the tab page
 
        // The project this editor belongs to
        project = IDE.project;
        
        protected properties = {};

        /**
         * Does the Editor have any unsaved changes
         */ 
        hasUnsavedChanges() {
            return false;
        }


        static RegisterEditor(name:string,restoreFn:(state:any)=>Editor) {
            console.log("Registered editor for type " + name);
            Editor.Registry[name] = restoreFn;
        }
        /**
         * Save the content of the editor. Not all editors imeplement this method.
         */
        save() { /* NOP */ }

        /**
         * Move the editor to a certain position. The position paramters depends on the type of 
         * editor. For a text editorit could be a row and column, for an UML editor 
         * it could be an x an dy coordinate.  
         */
        moveToPosition(pos?: any) {
            IDE.addHistory(this, pos);
        }

        /**
         * Return the type of the editor
         */ 
        getType():string {
            return null;
        }

       
        /**
         * Based on the state previously returned by getState, create a new editor with identical state
         * Used during startup of CATS to restore same editors as before CATS was closed.
         */
        static Restore(type:string, state: any): Editor {
            var restoreFn = Editor.Registry[type];
            if (! restoreFn) {
                console.error("No restore function found for " + type);
                return null;
            }
            var editor = restoreFn(state);
            return editor;
        }



        /**
         * Get the state of this editor so it can be at a later session revived. For example for 
         * a source file editor this would be the fileName and current position.
         */
        getState(): any {
            return null; // means doesn't support persisting;
        }

        /**
         * Get a certin property from the editor
         */ 
        get(propertyName: string) {
            return this.properties[propertyName];
        }

        /**
         * Provide an additional description for the content used in in the editor.
         */ 
        getDescription() {
            return this.label;
        }

        /**
         * Set a property on the editor
         */ 
        set(propertyName: string, value) {
            if (!propertyName) return;
            this.properties[propertyName] = value;
            this.emit(propertyName, value);
        }

        /**
         * Does the editor support a certain property
         */ 
        has(property: string) {
            return this.get(property) != null;
        }


        /**
         * Command pattern implementation
         */
        executeCommand(commandName: string, ...args): any { /* NOP */ }


        /**
         * Provide the Qooxdoo LayouItem needed to added to this editor to the EditorPage
         */
        getLayoutItem(): qx.ui.core.LayoutItem {
            throw new Error("Abstract Method not implemented: getLayoutItem");
        }

    }

    /**
     * Base class that contains some common features for editors that work on resouces on the 
     * file system. 
     */
    export class FileEditor extends Editor {

        constructor(public filePath: string) {
            super();
            if (this.filePath) {
                this.label = PATH.basename(this.filePath);
            }
            this.updateFileInfo();
        }

        protected updateFileInfo() {
            if (this.filePath) {
                try {
                    this.set("info", OS.File.getProperties(this.filePath));
                } catch (err) { /* NOP */ }
            }
        }

        /**
         * Which type of files does this editor supports for editing.
         */
        protected static SupportsFile(fileName: string) {
            return false;
        }

        /**
         * @override 
         */ 
        getDescription() {
            return this.filePath || this.label;
        }

        /**
         * Check for a given file which default editor should be opened and return an instance
         * of that.
         */ 
        private static CreateEditor(fileName: string): FileEditor {
            if ( Gui.ImageEditor.SupportsFile(fileName)) return new Gui.ImageEditor(fileName);
            if (Gui.SourceEditor.SupportsFile(fileName)) return new Gui.SourceEditor(fileName);
            return null;
        }

        /**
         * Open an existing file editor or if it doesn't exist yet create
         * a new FileEditor suitable for the file selected.
         */
        static OpenEditor(fileName: string, pos: ace.Position = { row: 0, column: 0 }): FileEditor {
            var editor: FileEditor;
            var pages: Gui.EditorPage[] = [];
            pages = IDE.editorTabView.getPagesForFile(fileName);
            if (!pages.length) {
                editor = this.CreateEditor(fileName);
                if (!editor) {
                    var c = confirm("No suitable editor found for this file type, open with source editor?");
                    if (!c) return;
                    editor = new Gui.SourceEditor(fileName);
                }
                IDE.editorTabView.addEditor(editor, pos);
            } else {
                editor = <Gui.SourceEditor>pages[0].editor;
                IDE.editorTabView.setSelection([pages[0]]);
                editor.moveToPosition(pos);
            }

            return editor;
        }


    }

}

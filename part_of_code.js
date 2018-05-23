/**
 * What it does:
 * creates a text editor that can also edit JavaScript.
 * Uses editor referenced library included elsewhere
 * (this is just one TypeScript class out of a few dozens in the project).
 */

import { Component, OnInit, OnDestroy, Input, ElementRef, EventEmitter, Output } from '@angular/core';
import { EditorLoaderService } from '../services/editor-loader.service';

@Component({
	selector: 'app-editor',
	templateUrl: './editor.component.html',
	styleUrls: ['./editor.component.css']
})

export class EditorComponent implements OnInit, OnDestroy {
	editor: IStandaloneCodeEditor; // Editor reference
	isEditorLoaded: any; // Is editor loaded?

  /**
   * Editor finished loading event
   */
	@Output('editorReady')
	editorReady: EventEmitter<boolean> = new EventEmitter<boolean>();

  /**
   * Editor has text change.
   * Emits TRUE if different from original text; FALSE otherwise.
   */
	@Output('textChanged')
	textChanged: EventEmitter<boolean> = new EventEmitter<boolean>();

  /**
   * Current editor text
   */
	@Input()
	text: string = '';

	_readOnly: boolean = false;

  /**
   * Current editor text read-only?
   */
	@Input()
	set readOnly(isReadOnly: boolean) {
		this._readOnly = isReadOnly;
		if (this.editor) {
			this.editor.updateOptions({ readOnly: this._readOnly });
		}
	}

	private _lang: string = 'javascript';

  /**
   * Current editor mode (language).
   * Examples: javascript, json (for Intellisense support)
   */
	@Input()
	set lang(languageString) {
		this._lang = languageString;
	}

	private get language() {
		return this._lang;
	}

	public get editorText(): string {
		// Get text from editor
		return this.editor.getModel().getLinesContent().join('\n');
	}

	public set editorText(newText: string) {
		this.text = newText;
		this.mdl = createModel(this.text, this.language);
		this.editor.setModel(this.mdl);
	}

  /**
   * Keep track of original text
   */
	public get editorOriginalText(): string {
		return this.originalText;
	}

	public set editorOriginalText(newText: string) {
		this.originalText = newText;
	}

	private libsRef = null;
	private libsText = '';

  /**
   * edited objects (for Intellisense support)
   */
	@Input()
	set libs(libRefs) {
		if (this.libsRef) {
			this.libsRef.dispose();
		}
		this.libsRef = languages.typescript.javascriptDefaults.addExtraLib(libRefs, 'libs.ts');
		console.log('libs', libRefs);
		this.libsText = libRefs;
	}

	get libs() {
		return this.libsText || '';
	}

  /**
   * Original text (to track the need for Save)
   */
	protected originalText: any = null;

	constructor(
		private loader: EditorLoaderService,
		private el: ElementRef) {
	}

	ngOnDestroy() {
		try {
			if (this.libsRef) {
				this.libsRef.dispose();
			}
		}
		catch (e) { }

		try {
			this.editor.getModel().dispose();
		}
		catch (e) { }
	}

	ngOnInit() {
		this.isEditorLoaded.subscribe(value => {
			if (value) {
				// compiler options
				if (this.language === 'json') {
					languages.json.jsonDefaults.setDiagnosticsOptions({
						validate: true
					});
				}
				else {
					// e.g. settings-type file
					languages.typescript.javascriptDefaults.setDiagnosticsOptions({
						noSemanticValidation: true,
						noSyntaxValidation: false
					});

					languages.typescript.javascriptDefaults.setCompilerOptions({
						target: languages.typescript.ScriptTarget.ES2016,
						allowNonTsExtensions: true,
						allowJs: true
					});
				}

				languages.typescript.javascriptDefaults.addExtraLib(this.libs);
				console.log('libs', this.libs);

				// element reference
				let editorContainerRef = this.el.nativeElement.querySelector('div');
				this.editor = create(editorContainerRef, { readOnly: this._readOnly });

				const mdl = createModel(this.text, this.language);
				this.editor.setModel(this.mdl);

				this.editor.onDidChangeModelContent((e) => {
					this.textChanged.emit((this.originalText !== this.editor.getModel().getLinesContent().join('\n'))
						&& !((this.originalText == null) && (this.editor.getModel().getLinesContent().join('\n').length === 0)));
				});
				// Emit editor-ready event
				this.editorReady.emit(true);
			}
		});
	}

  /**
   * Insert text at cursor
   */
	insertText(text: string): void {
		let p = this.editor.getPosition();
		this.editor.executeEdits('', [
			{
				range: new Range(p.lineNumber,
					p.column,
					p.lineNumber,
					p.column), text: text
			}
		]);
	}
}
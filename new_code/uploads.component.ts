import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs/internal/Subscription';
import { AccountComponent } from '../../account.component';

@Component({
    selector: 'jn-uploads-tab',
    templateUrl: 'uploads.component.html',
    styleUrls: ['uploads.component.scss']
})
export class UploadsTabComponent implements OnInit, OnDestroy {
    /**
     * ADDED SHARED CONTAINER FOR ALL SUBSCRIPTIONS
     */
    public subscriptions: Subscription = new Subscription();

    /**
     * CONTROL THE PROGRESS BAR
     */
    public showProgressBar: boolean;

    /**
     * GET ALL DOCS
     */
    public docs: DocumentViewModel[];

    /**
     * UPLOADS DOCS
     */
    public allowedDocuments: string;
    public allowedDocumentsType: string = '.jpg, .docx, .doc, .pdf, .png, .gif, .txt';

    /**
     * Menu alerts
     */
    public menuAlertArray: string[] = [];

    /**
     * TRANSLATE
     */
    public translations: any = {
        warning1: '',
        warning2: '',
        warning3: '',
        warning4: '',
        uploadBtnText: '',
        invalidExtension: ''
    };

    constructor(
        private readonly accountComponent: AccountComponent,
        private readonly accountService: AccountService,
        private readonly authService: AuthService,
        private readonly cmsSessionService: CmsSessionService,
        private readonly localeService: LocaleService,
        private readonly translationService: TranslationService,
        private readonly dynamicFieldsService: DynamicFieldsService,
        private readonly menuService: MenuService,
        private readonly menuStateService: MenuStateService,
        private readonly uploadsTabResolver: UploadsTabResolver,
        private readonly snackBarService: SnackBarService
    ) {}

    public ngOnInit(): void {
        /**
         * INITIALIZE ALL SUBSCRIPTIONS WHEN COMPONENT IS INIT
         */
        this.initializeSubscriptions();

        /**
         * TRANSLATE
         */
        this.getTranslations();
    }

    /**
     * @description REMOVED ALL SUBSCRIPTIONS
     * @author Alex Togo
     * @date 2020-06-23
     * @memberof UploadsTabComponent
     */
    public ngOnDestroy(): void {
        this.subscriptions.unsubscribe();
    }

    /**
     * @description INITIALIZE ALL SUBSCRIPTIONS WHEN COMPONENT IS INIT
     * @author Alex Togo
     * @date 2020-06-23
     * @memberof UploadsTabComponent
     */
    public initializeSubscriptions(): void {
        this.subscriptions.add(
            this.uploadsTabResolver.docsStore.subscribe((data) => {
                this.docs = data;
            })
        );

        this.subscriptions.add(
            this.menuStateService.getMenuAlert().subscribe((data) => {
                this.menuAlertArray = data.map((el) => el.subpageName);
            })
        );
    }

    public toggleSideNav(): void {
        this.accountComponent.accountDrawer.toggle();
        this.accountComponent.allowDrawerCollapse = true;
    }

    /**
     * @description CONTROL ICONS AND TAKE CORRECT TEXT DEPEND OF VALUE
     * @author Alex Togo
     * @date 2020-06-30
     * @param {string} input
     * @returns {{ color: string; iconName: string }}
     * @memberof UploadsTabComponent
     */
    public getWarningInfo(input: string, required?: string): { color: string; iconName: string; text: string } {
        switch (input) {
            case 'F':
                return { color: 'red', iconName: 'fa-warning', text: this.translations.warning2 };
            case 'P':
                return { color: 'orange', iconName: 'fa-exclamation-circle', text: this.translations.warning4 };
            case 'V':
                return { color: 'green', iconName: 'fa-check', text: this.translations.warning3 };
            default:
                return { color: '', iconName: '', text: required === 'R' ? this.translations.warning1 : '' };
        }
    }

    /**
     * @description UPLOAD DOCUMENTS
     * @author Alex Togo
     * @date 2020-06-30
     * @param {*} event
     * @param {GetDocsModel} item
     * @param {number} index
     * @memberof UploadsTabComponent
     */
    public onDocumentChange(event: any, item: DocumentViewModel, index: number): void {
        const fileList: FileList = event.target.files;
        const documentModel: SingleDocument = new SingleDocument();

        this.docs[index].showProgressBar = true;

        if (fileList.length === 1) {
            let fileNameArr: string[] = fileList[0].name.split('.');
            let extension: string = '.' + fileNameArr[fileNameArr.length - 1].toLowerCase();

            documentModel.fileName = item.documentName;
            documentModel.fileSize = fileList[0].size;
            documentModel.fileType = extension;
            documentModel.mainPk = this.authService.getMainId();
            documentModel.signupDocumentsPK = item.signupDocumentsPk;
            documentModel.userDocumentsPk = item.userDocumentsFk;
            documentModel.isCorporate = item.corpIndivBoth === 'C';
            documentModel.classification = 'Signup';
            this.docs[index].fileName = fileList[0].name;

            if (this.allowedDocumentsType.indexOf(extension) === -1) {
                this.snackBarService.warn(
                    this.translationService
                        .translate('dynamicFields', 'fileTypesWarning', 'Only {0} file types allowed')
                        .replace('{0}', this.allowedDocumentsType)
                );
                this.docs[index].showProgressBar = false;
                return;
            } else {
                this.dynamicFieldsService.upload(documentModel, fileList[0]).subscribe((data: any) => {
                    this.docs[index].docStatus = data['docStatus'];
                    this.docs[index].showProgressBar = false;

                    this.refreshAlerts();
                });
            }
        }
    }

    public getFileInfo(item: DocumentViewModel): void {
        this.showProgressBar = true;
        const params: GetFileQueryModel = {
            fileName: item.documentName,
            mainPk: this.authService.getMainId().toString()
        };

        this.accountService.getFile(params).subscribe((res: string) => {
            this.showProgressBar = false;
            /**
             * TODO: NEED TO REWRITE WITH ROUTING
             */
            window.open(res, '_blank');
        });
    }

    /**
     * Refresh the value on screen
     *
     * @author Alex Togo
     * @date 2020-07-07
     * @memberof UploadsTabComponent
     */
    public refreshAlerts(): void {
        if (this.menuAlertArray.includes('uploads')) this.menuService.loadMenuAlert();
    }

    private getTranslations(): void {
        let cultureName: string = this.cmsSessionService.getCulture();
        this.localeService
            .isCultureSupported(cultureName, this.cmsSessionService.getCmsCountry(cultureName))
            .subscribe((culture: string) => {
                this.translationService.setTranslationCulture(culture);
                this.setTranslations();

                this.translationService.getTranslationCacheObservable().subscribe(() => {
                    this.setTranslations();
                });
            });
    }

    private setTranslations(): void {
        this.translations.warning1 = this.translationService.translate('user-account', 'warning1', 'Required');
        this.translations.warning2 = this.translationService.translate('dynamicFields', 'Failed', 'Failed Verification');
        this.translations.warning3 = this.translationService.translate('dynamicFields', 'Verified', 'Passed Verification');
        this.translations.warning4 = this.translationService.translate('dynamicFields', 'pending', 'Pending Verification');
        this.translations.invalidExtension = this.translationService.translate(
            'user-account',
            'invalidExtension',
            ' Invalid Extension'
        );
        this.translations.uploadBtnText = this.translationService.translate('dynamicFields', 'ChooseFile', 'Upload File*');
    }
}

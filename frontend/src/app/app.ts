import { Component } from '@angular/core';

import { DiagnosisSearch } from './diagnosis-search/diagnosis-search';

@Component({
  selector: 'app-root',
  imports: [DiagnosisSearch],
  template: `<app-diagnosis-search />`,
})
export class App {}

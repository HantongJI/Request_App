import { NgModule } from '@angular/core';

import { SharedModule } from './../shared/shared.module';
import { InvoicesRoutingModule } from './invoices-routing.module';

import { InvoicesComponent } from './invoices.component';

import { HomeComponent } from './home/home.component';
import { RequestComponent } from './request/request.component';
import { SearchComponent } from './search/search.component';
import { SearchBarComponent } from './search-bar/search-bar.component';
import { Facture } from './facture/facture.component';


import { ClipboardModule } from 'ngx-clipboard';

@NgModule({
  imports: [
    SharedModule,

    ClipboardModule,

    InvoicesRoutingModule
  ],
  declarations: [
    InvoicesComponent,
    HomeComponent,
    RequestComponent,
    SearchComponent,
    SearchBarComponent,
    Facture
  ]
})
export class InvoicesModule {}

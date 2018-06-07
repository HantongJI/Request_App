import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { InvoicesComponent } from './invoices.component';

import { HomeComponent } from './home/home.component';
import { RequestComponent } from './request/request.component';
import { SearchComponent } from './search/search.component';
import { Facture } from './facture/facture.component';

const invoicesRoutes: Routes = [{
  path: '',
  component: InvoicesComponent,
  children: [{
      path: '',
      component: HomeComponent
    },
    {
      pathMatch: 'full',
      path: 'facture/:txHash',
      component: Facture
    },
    {
      pathMatch: 'full',
      path: 'request/txHash/:txHash',
      component: RequestComponent
    },
    {
      pathMatch: 'full',
      path: 'request/requestId/:requestId',
      component: RequestComponent
    },
    {
      pathMatch: 'full',
      path: 'search/:searchValue',
      component: SearchComponent
    }
  ]
}];

@NgModule({
  imports: [RouterModule.forChild(invoicesRoutes)],
  exports: [RouterModule]
})
export class InvoicesRoutingModule {}

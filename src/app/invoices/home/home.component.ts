import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormGroup, FormControl, Validators, FormBuilder, ValidationErrors } from '@angular/forms';
import { Web3Service } from '../../util/web3.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})

export class HomeComponent implements OnInit {
  date: number = new Date().getTime();
  account: string;
  createLoading = false;
  priceEUR: string;
  requestForm: FormGroup;
  expectedAmountFormControl: FormControl;
  payeeFormControl: FormControl;
  payerFormControl: FormControl;
  reasonFormControl: FormControl;
  dateFormControl: FormControl;

  static sameAddressAsPayerValidator(control: FormControl) {
    const result = control.value && control.root.get('payer').value.toLowerCase() === control.value.toLowerCase() ? { sameAddressAsPayer: true } : null;
    return result;
  }


  constructor(private web3Service: Web3Service, private formBuilder: FormBuilder, private router: Router) {}


  ngOnInit() {
    setInterval(() => { this.date = new Date().getTime(); }, 5000);
    setTimeout(() => this.web3Service.setSearchValue(''),this.web3Service.setSearchTrans(''));
    this.expectedAmountFormControl = new FormControl('', [Validators.required, Validators.pattern('[0-9]*([\.][0-9]{0,18})?$')]);
    this.payeeFormControl = new FormControl('', [Validators.required, Validators.pattern('^(0x)?[0-9a-fA-F]{40}$')/*, HomeComponent.sameAddressAsPayerValidator*/]);
    this.payerFormControl = new FormControl(this.account);
    this.dateFormControl = new FormControl('');
    this.reasonFormControl = new FormControl('');

    this.getRate();

    this.requestForm = this.formBuilder.group({
      expectedAmount: this.expectedAmountFormControl,
      payer: this.payerFormControl,
      payee: this.payeeFormControl,
      date: this.dateFormControl,
      price: this.reasonFormControl,
    });
    console.log(this.reasonFormControl.value);
    this.watchAccount();
  }

  async getRate(){
    this.priceEUR = await fetch('https://api.coinmarketcap.com/v1/ticker/ethereum/?convert=EUR') //needs to be changed in the future
    .then((resp) => resp.json())
    .then(function(data) {
      return data.map(function(price) {
        return price.price_eur;
      })
    })
    .catch(function(error) {
      console.log(JSON.stringify(error));
    });
  }


  watchAccount() {
    this.web3Service.accountObservable.subscribe(account => {
      this.account = account;
      this.payerFormControl.setValue(this.account);
      this.payeeFormControl.updateValueAndValidity();
    });
  }

  createRequest() {
    if (this.createLoading) { return; }
    this.createLoading = true;
    this.reasonFormControl.setValue("€ " + (Number(this.priceEUR)*this.expectedAmountFormControl.value).toString());
    if (!this.requestForm.valid) {
      if (this.expectedAmountFormControl.hasError('required')) {
        this.expectedAmountFormControl.markAsTouched();
        this.expectedAmountFormControl.setErrors({ required: true });
      }
      if (this.payeeFormControl.hasError('required')) {
        this.payeeFormControl.markAsTouched();
        this.payeeFormControl.setErrors({ required: true });
      }
      this.createLoading = false;
      return;
    }


    const data = {};
    Object.keys(this.requestForm.value).forEach(key => {
      if (['expectedAmount', 'payee', 'payer'].findIndex(e => e === key) === -1 && this.requestForm.value[key] && this.requestForm.value[key] !== '') {
        data[key] = this.requestForm.value[key];
      }
    });

    const callback = response => {
      this.createLoading = false;
      if (response.transaction) {
        this.web3Service.openSnackBar('The request is being created. Please wait a few moments for it to appear on the Blockchain.', 'Ok', 'info-snackbar');
        const queryParams = {
          payee: {
            address: this.payeeFormControl.value,
            balance: this.expectedAmountFormControl.value,
            expectedAmount: this.expectedAmountFormControl.value,
          },
          payer: this.payerFormControl.value,
          data: { data: {} },
        };
        Object.keys(data).forEach(key => queryParams.data.data[key] = data[key]);
        this.router.navigate(['/request/txHash', response.transaction.hash], { queryParams: { request: JSON.stringify(queryParams) } });
      } else if (response.message) {
        if (response.message.startsWith('Invalid status 6985')) {
          this.web3Service.openSnackBar('Invalid status 6985. User denied transaction.');
        } else if (response.message.startsWith('Failed to subscribe to new newBlockHeaders')) {
          return;
        } else if (response.message.startsWith('Returned error: Error: MetaMask Tx Signature')) {
          this.web3Service.openSnackBar('MetaMask Tx Signature: User denied transaction signature.');
        } else {
          console.error(response);
          this.web3Service.openSnackBar(response.message);
        }
      }
    };

    this.web3Service.createRequestAsPayer(this.payeeFormControl.value, this.expectedAmountFormControl.value, JSON.stringify(data), callback)
      .on('broadcasted', response => {
        console.log('callback createRequestAsPayer: ', response);
        callback(response);
      })
      .then(
        response => {
          // console.log('resolve createRequestAsPayer: ', response);
          // setTimeout(_ => { this.web3Service.openSnackBar('Request successfully created.', 'Ok', 'success-snackbar'); }, 5000);
        }, err => {
          callback(err);
        });
  }
}
